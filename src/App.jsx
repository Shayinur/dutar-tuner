import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState(null)

    useEffect(() => {
    if (!isListening) return
    
    let stream
    
    async function start() {
        try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        console.log('Got the stream:', stream)
        } catch (err) {
        setError(err.message)
        setIsListening(false)
        }
    }
    
    start()
    
    return () => {
        if (stream) {
        stream.getTracks().forEach(track => track.stop())
        }
    }
    }, [isListening])

  return (
    <div>
        <h1>Uyghur Dutar Tuner</h1>  
        <p> {isListening ? 'Listening...' : 'Tuner is off'} </p>
        <button onClick={() =>      setIsListening(!isListening)}>
            {isListening ? 'Stop' : 'Start'}
        </button>
  </div>
  )
}

export default App
