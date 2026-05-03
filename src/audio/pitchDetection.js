// Autocorrelation pitch detection.
// Returns frequency in Hz, or -1 if no clear pitch found.
export function detectPitch(buffer, sampleRate) {
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