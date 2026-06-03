type AudioUnlockState = 'idle' | 'unlocking' | 'ready' | 'unavailable'

let ctx: AudioContext | null = null
let unlockState: AudioUnlockState = 'idle'
let unlockPromise: Promise<boolean> | null = null
let _muted: boolean | null = null

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null
  return window.AudioContext ?? null
}

function isMuted(): boolean {
  if (_muted === null) {
    _muted = typeof window !== 'undefined' && localStorage.getItem('audio-muted') === 'true'
  }
  return _muted
}

async function resumeContext(audioContext: AudioContext): Promise<boolean> {
  if (audioContext.state === 'running') return true

  try {
    await audioContext.resume()
  } catch {
    return false
  }

  return audioContext.state !== 'suspended'
}

function getReadyContext(): AudioContext | null {
  if (!ctx) return null

  if (ctx.state === 'running') {
    if (unlockState !== 'ready') unlockState = 'ready'
    return ctx
  }

  if (unlockState === 'ready') {
    unlockState = 'idle'
  }

  return null
}

export async function unlockAudio(): Promise<boolean> {
  if (unlockState === 'ready' && getReadyContext()) return true
  if (unlockState === 'unavailable') return false
  if (unlockPromise) return unlockPromise

  const AudioContextCtor = getAudioContextCtor()
  if (!AudioContextCtor) {
    unlockState = 'unavailable'
    return false
  }

  unlockState = 'unlocking'
  unlockPromise = (async () => {
    try {
      if (!ctx) {
        ctx = new AudioContextCtor()
      }

      const resumed = await resumeContext(ctx)
      unlockState = resumed ? 'ready' : 'idle'
      return resumed
    } catch {
      unlockState = 'unavailable'
      return false
    } finally {
      unlockPromise = null
    }
  })()

  return unlockPromise
}

export function isAudioReady(): boolean {
  return getReadyContext() !== null
}

function tone(freq: number, duration: number, gain: number, type: OscillatorType = 'sine') {
  if (isMuted()) return
  const ac = getReadyContext()
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
  const ac = getReadyContext()
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
  if (!isAudioReady()) return

  const notes = [523, 659, 784]
  notes.forEach((freq, i) => {
    setTimeout(() => tone(freq, 0.15, 0.05), i * 80)
  })
}

export function playError() {
  if (isMuted()) return
  if (!isAudioReady()) return

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

export function __resetAudioForTests() {
  ctx = null
  unlockState = 'idle'
  unlockPromise = null
  _muted = null
}
