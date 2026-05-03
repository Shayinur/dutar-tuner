import { useEffect, useState, useRef } from 'react'
import './App.css'
import { TUNINGS } from './music/tunings.js'
import { freqToNote, midiToName } from './music/noteMath.js'
import { detectPitch } from './audio/pitchDetection.js'

function App() {
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState(null)
  const [level, setLevel] = useState(0)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const rafIdRef = useRef(null)
  const [tuningKey, setTuningKey] = useState('A3-D4')
  const [pitch, setPitch] = useState(null)

  useEffect(() => {
    if (!isListening) return

    let stream

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })

        const audioCtx = new AudioContext()
        const sourceNode = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 2048
        sourceNode.connect(analyser)

        audioCtxRef.current = audioCtx
        analyserRef.current = analyser

        function tick() {
          const buffer = new Float32Array(analyser.fftSize)
          analyser.getFloatTimeDomainData(buffer)

          // RMS for level
          let sum = 0
          for (let i = 0; i < buffer.length; i++) {
            sum += buffer[i] * buffer[i]
          }
          const rms = Math.sqrt(sum / buffer.length)
          setLevel(rms)

          // Pitch detection — only if signal is loud enough
          if (rms > 0.01) {
            const freq = detectPitch(buffer, audioCtx.sampleRate)
            if (freq > 0) {
                const note = freqToNote(freq)
                setPitch({
                    freq,
                    midiFloat: note.midiFloat,  // need to add this
                    midi: note.midi,
                    noteName: note.noteName,
                    octave: note.octave,
                    cents: note.cents
                })
            }
                
          }

          rafIdRef.current = requestAnimationFrame(tick)
        }
        tick()
      } catch (err) {
        setError(err.message)
        setIsListening(false)
      }
    }

    start()

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      if (stream) stream.getTracks().forEach(track => track.stop())
      if (audioCtxRef.current) audioCtxRef.current.close()
      setLevel(0)
    }
  }, [isListening])

  return (
    <div>
      <h1>Dutar Tuner</h1>

        <select value={tuningKey} onChange={(e) => setTuningKey(e.target.value)}>
            {Object.entries(TUNINGS).map(([key, t]) => (
            <option key={key} value={key}>{t.name}</option>
            ))}
        </select>
      <p>{isListening ? 'Listening...' : 'Tuner is off'}</p>
      <button onClick={() => {
        setError(null)
        setIsListening(!isListening)
      }}>
        {isListening ? 'Stop' : 'Start'}
      </button>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      <p>Level: {level.toFixed(4)}</p>
      {pitch ? (
  <div>
    <p style={{ fontSize: '48px', margin: 0 }}>
      {pitch.noteName}{pitch.octave}
    </p>
    <p>
      {pitch.cents > 0 ? '+' : ''}{pitch.cents}¢ · {pitch.freq.toFixed(2)} Hz
    </p>
    
    {(() => {
      const tuning = TUNINGS[tuningKey]
      const distToLow = Math.abs(pitch.midiFloat - tuning.low)
      const distToHigh = Math.abs(pitch.midiFloat - tuning.high)
      const closest = distToLow < distToHigh ? 'low' : 'high'
      const targetMidi = closest === 'low' ? tuning.low : tuning.high
      const targetName = midiToName(targetMidi)
      const stringLabel = closest === 'low' ? 'Low string' : 'High string'

      const centsFromTarget = Math.round((pitch.midiFloat - targetMidi) * 100)
      const isInTune = Math.abs(centsFromTarget) <= 5

      let hint
      if (isInTune) hint = '✓ in tune'
      else if (centsFromTarget < 0) hint = '↑ tune up'
      else hint = '↓ tune down'

      return (
    <div>
      <p>Target: {targetName} — {stringLabel}</p>
      <p style={{ 
        color: isInTune ? 'green' : 'inherit',
        fontSize: '24px'
      }}>
        {hint}
      </p>
      <p>{centsFromTarget > 0 ? '+' : ''}{centsFromTarget}¢ from {targetName}</p>
    </div>
  ) 
    })()}
  </div>
) : (
  <p>—</p>
)}
    </div>
  )
}
export default App