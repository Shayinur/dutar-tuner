import { TUNINGS } from '../music/tunings.js'
import { midiToName } from '../music/noteMath.js'

function TuningTarget({ pitch, tuningKey }) {
  const tuning = TUNINGS[tuningKey]
  const distToLow = Math.abs(pitch.midiFloat - tuning.low)
  const distToHigh = Math.abs(pitch.midiFloat - tuning.high)
  const closest = distToLow < distToHigh ? 'low' : 'high'
  const targetMidi = closest === 'low' ? tuning.low : tuning.high

  const centsFromTarget = Math.round((pitch.midiFloat - targetMidi) * 100)
  const isInTune = Math.abs(centsFromTarget) <= 5

  // Needle position: -50¢ to +50¢ → 0% to 100%
  const clampedCents = Math.max(-50, Math.min(50, centsFromTarget))
  const needlePos = 50 + clampedCents

  return (
    <div>
      
      {/* Note display */}
      <div className="text-center pt-3 pb-1">
        <div className="flex items-baseline justify-center gap-2 mb-1">
          <span className={`text-[64px] leading-none font-light tracking-tight transition-colors ${
            isInTune ? 'text-emerald-700' : 'text-stone-900'
          }`}>
            {pitch.noteName}
          </span>
          <span className="text-[20px] text-stone-500 font-normal">
            {pitch.octave}
          </span>
        </div>
        <p className="text-[13px] text-stone-500 tabular-nums mb-4">
          {pitch.freq.toFixed(2)} Hz · target {targetMidi && (() => {
            // hz of target
            const targetHz = 440 * Math.pow(2, (targetMidi - 69) / 12)
            return targetHz.toFixed(2)
          })()} Hz
        </p>
      </div>

      {/* Needle meter */}
      <div className="relative h-[60px] my-4">
        {/* Track line */}
        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-black/10 -translate-y-1/2 rounded-full" />
        
        {/* Green "in tune" zone (±5 cents = 10% wide) */}
        <div className="absolute top-1/2 left-[45%] w-[10%] h-[6px] bg-emerald-100 -translate-y-1/2 rounded-full" />
        
        {/* Center tick */}
        <div className="absolute top-2 bottom-2 left-1/2 w-[2px] bg-stone-400 -translate-x-1/2" />
        
        {/* Needle */}
        <div
          className={`absolute top-1 bottom-1 w-[4px] rounded-full -translate-x-1/2 transition-[left,background-color] duration-100 ${
            isInTune ? 'bg-emerald-700' : 'bg-[#b85c2e]'
          }`}
          style={{ left: `${needlePos}%` }}
        />
      </div>

      {/* Cents labels */}
      <div className="flex justify-between text-[11px] text-stone-400 tabular-nums mt-1">
        <span>−50¢</span>
        <span>0</span>
        <span>+50¢</span>
      </div>

      {/* Cents readout */}
      <div className={`text-[14px] tabular-nums text-center mt-2 min-h-[20px] ${
        isInTune ? 'text-emerald-700 font-medium' : 'text-stone-500'
      }`}>
        {isInTune ? (
          'In tune'
        ) : (
          <>
            {centsFromTarget > 0 ? '+' : ''}{centsFromTarget}¢ · {centsFromTarget > 0 ? 'sharp' : 'flat'}
          </>
        )}
      </div>

      {/* String cards */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <StringCard
          label="Low string"
          midi={tuning.low}
          active={closest === 'low'}
          inTune={closest === 'low' && isInTune}
        />
        <StringCard
          label="High string"
          midi={tuning.high}
          active={closest === 'high'}
          inTune={closest === 'high' && isInTune}
        />
      </div>

    </div>
  )
}

function StringCard({ label, midi, active, inTune }) {
  const noteName = midiToName(midi)
  const hz = 440 * Math.pow(2, (midi - 69) / 12)

  let stateClasses = 'border-black/10 bg-white'
  if (inTune) stateClasses = 'border-emerald-600 bg-emerald-50'
  else if (active) stateClasses = 'border-[#b85c2e] bg-[#f5e8df]'

  return (
    <div className={`p-3 border rounded-xl text-center transition-all ${stateClasses}`}>
      <p className="text-[11px] uppercase tracking-wider text-stone-500">
        {label}
      </p>
      <p className="text-[22px] font-medium tracking-tight text-stone-900 mt-1">
        {noteName}
      </p>
      <p className="text-[11px] text-stone-400 tabular-nums mt-0.5">
        {hz.toFixed(2)} Hz
      </p>
    </div>
  )
}

export default TuningTarget

