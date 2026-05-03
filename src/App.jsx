import { useEffect, useState, useRef } from 'react'
import './App.css'
import { TUNINGS } from './music/tunings.js'



const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']


function midiToName(midi) {
  const noteName = NOTE_NAMES[((midi % 12) + 12) % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${noteName}${octave}`
}

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

// Autocorrelation pitch detection.
// Returns frequency in Hz, or -1 if no clear pitch found.
function detectPitch(buffer, sampleRate) {
  const SIZE = buffer.length

  // Trim near-silent edges so we analyse the important part of the signal
  const threshold = 0.2
  let r1 = 0
  let r2 = SIZE - 1
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < threshold) { r1 = i; break }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < threshold) { r2 = SIZE - i; break }
  }
  const trimmed = buffer.slice(r1, r2)
  const N = trimmed.length
  if (N < 2) return -1

  // Compute autocorrelation
  const c = new Float32Array(N)
  for (let lag = 0; lag < N; lag++) {
    let sum = 0
    for (let i = 0; i < N - lag; i++) {
      sum += trimmed[i] * trimmed[i + lag]
    }
    c[lag] = sum
  }

  // Skip past the initial dip from c[0], then find the peak
  let d = 0
  while (d < N - 1 && c[d] > c[d + 1]) d++

  let maxVal = -Infinity
  let maxIdx = -1
  for (let i = d; i < N; i++) {
    if (c[i] > maxVal) {
      maxVal = c[i]
      maxIdx = i
    }
  }
  if (maxIdx <= 0) return -1


  let T0 = maxIdx
  if (maxIdx > 0 && maxIdx < N - 1) {
    const x1 = c[maxIdx - 1]
    const x2 = c[maxIdx]
    const x3 = c[maxIdx + 1]
    const a = (x1 + x3 - 2 * x2) / 2
    const b = (x3 - x1) / 2
    if (a !== 0) T0 = maxIdx - b / (2 * a)
  }

  const freq = sampleRate / T0
  // Sanity range — reject silly values
  if (freq < 60 || freq > 1200) return -1
  return freq
}

function freqToNote(freq) {
    const midiFloat = 69 + 12 * Math.log2(freq / 440);
    const midi = Math.round(midiFloat)
    const cents = Math.round((midiFloat - midi) * 100)
    const noteName = NOTE_NAMES[((midi % 12) + 12) % 12]
    const octave = Math.floor(midi / 12) - 1
    return { midiFloat, midi, noteName, octave, cents } 
}
export default App