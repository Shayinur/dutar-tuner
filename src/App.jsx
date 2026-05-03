import { useEffect, useState, useRef } from 'react'
import './App.css'

function App() {
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState(null)
  const [level, setLevel] = useState(0)
  const [frequency, setFrequency] = useState(null)

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
            if (freq > 0) setFrequency(freq)
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
      setFrequency(null)
    }
  }, [isListening])

  return (
    <div>
      <h1>Uyghur dutar tuner</h1>
      <p>{isListening ? 'Listening...' : 'Tuner is off'}</p>
      <button onClick={() => {
        setError(null)
        setIsListening(!isListening)
      }}>
        {isListening ? 'Stop' : 'Start'}
      </button>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      <p>Level: {level.toFixed(4)}</p>
      <p>Frequency: {frequency ? `${frequency.toFixed(2)} Hz` : '—'}</p>
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

export default App