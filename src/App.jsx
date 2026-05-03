import { useEffect, useState, useRef } from 'react'
import './App.css'

function App() {
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState(null)
  const [level, setLevel] = useState(0)

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
    </div>
  )
}

export default App