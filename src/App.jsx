import { useEffect, useState, useRef } from 'react'
import { TUNINGS } from './music/tunings.js'
import { freqToNote } from './music/noteMath.js'
import { detectPitch } from './audio/pitchDetection.js'
import TuningTarget from './components/TuningTargets.jsx'

function App() {
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState(null)
  const [level, setLevel] = useState(0)
  const [tuningKey, setTuningKey] = useState('A3-D4')
  const [pitch, setPitch] = useState(null)

  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const rafIdRef = useRef(null)

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

          let sum = 0
          for (let i = 0; i < buffer.length; i++) {
            sum += buffer[i] * buffer[i]
          }
          const rms = Math.sqrt(sum / buffer.length)
          setLevel(rms)

          if (rms > 0.01) {
            const freq = detectPitch(buffer, audioCtx.sampleRate)
            if (freq > 0) {
              setPitch({ ...freqToNote(freq), freq })
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
      setPitch(null)
    }
  }, [isListening])

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-[540px]">
        
        {/* Header */}
        <header className="text-center mb-6">
          <h1 className="text-[22px] font-medium tracking-tight">
            Dutar Tuner
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            <span lang="ug" dir="rtl">دۇتار</span> · Tune your two strings
          </p>
        </header>

        {/* Tuning selector card */}
        <div className="bg-white border border-black/10 rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-[13px] font-medium text-stone-500">
              Tuning
            </label>
            <select
              value={tuningKey}
              onChange={(e) => setTuningKey(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-2 bg-white border border-black/10 rounded-xl text-sm text-stone-900 cursor-pointer focus:outline-none focus:border-[#b85c2e] transition-colors"
            >
              {Object.entries(TUNINGS).map(([key, t]) => (
                <option key={key} value={key}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Main display card */}
        <div className="bg-white border border-black/10 rounded-2xl p-5 mb-4">
          {pitch ? (
            <TuningTarget pitch={pitch} tuningKey={tuningKey} />
          ) : (
            <div className="text-center py-8">
              <p className="text-[64px] leading-none font-light text-stone-300">—</p>
              <p className="text-[13px] text-stone-500 mt-4">
                {isListening ? 'Pluck a string' : 'Press start to begin'}
              </p>
            </div>
          )}

          {/* Level bar */}
          {isListening && (
            <div className="mt-4 h-[3px] bg-black/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#b85c2e] transition-all duration-75"
                style={{ width: `${Math.min(100, level * 600)}%` }}
              />
            </div>
          )}
        </div>

        {/* Start / Stop button */}
        <button
          onClick={() => {
            setError(null)
            setIsListening(!isListening)
          }}
          className={`w-full py-3.5 rounded-xl text-[15px] font-medium transition-colors ${
            isListening
              ? 'bg-[#b85c2e] text-white hover:bg-[#a04e26]'
              : 'bg-stone-900 text-white hover:bg-stone-800'
          }`}
        >
          {isListening ? 'Stop' : 'Start tuning'}
        </button>

        {/* Error / status */}
        {error && (
          <p className="mt-3 text-center text-xs text-red-700">
            {error}
          </p>
        )}

        <footer className="mt-6 text-center text-xs text-stone-400">
          Pluck a string, hold steady. Best in a quiet room.
        </footer>

      </div>
    </div>
  )
}

export default App