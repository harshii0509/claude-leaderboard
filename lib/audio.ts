let ctx: AudioContext | null = null
let _muted: boolean | null = null

function isMuted(): boolean {
  if (_muted === null) {
    _muted = typeof window !== 'undefined' && localStorage.getItem('audio-muted') === 'true'
  }
  return _muted
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(freq: number, duration: number, gain: number, type: OscillatorType = 'sine') {
  if (isMuted()) return
  const ac = getCtx()
  if (!ac) return
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.connect(g)
  g.connect(ac.destination)
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(gain, ac.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration)
  osc.start(ac.currentTime)
  osc.stop(ac.currentTime + duration)
}

export function playHover() {
  tone(440, 0.08, 0.05)
}

export function playClick() {
  tone(660, 0.12, 0.08)
}

export function playExpand() {
  if (isMuted()) return
  const ac = getCtx()
  if (!ac) return
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.connect(g)
  g.connect(ac.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(200, ac.currentTime)
  osc.frequency.exponentialRampToValueAtTime(500, ac.currentTime + 0.18)
  g.gain.setValueAtTime(0.06, ac.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.18)
  osc.start(ac.currentTime)
  osc.stop(ac.currentTime + 0.18)
}

export function playSort() {
  tone(880, 0.06, 0.07, 'square')
}

export function playPodium() {
  if (isMuted()) return
  const notes = [523, 659, 784]
  notes.forEach((freq, i) => {
    setTimeout(() => tone(freq, 0.15, 0.05), i * 80)
  })
}

export function playError() {
  if (isMuted()) return
  setTimeout(() => tone(330, 0.18, 0.12, 'square'), 0)
  setTimeout(() => tone(220, 0.25, 0.10, 'square'), 130)
}

export function setMuted(v: boolean) {
  _muted = v
  if (typeof window !== 'undefined') {
    localStorage.setItem('audio-muted', String(v))
  }
}

export function getMuted(): boolean {
  return isMuted()
}
