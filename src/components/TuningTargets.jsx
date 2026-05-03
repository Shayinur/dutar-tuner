import { TUNINGS } from '../music/tunings.js'
import { midiToName } from '../music/noteMath.js'

function TuningTarget({ pitch, tuningKey }) {
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
}

export default TuningTarget

