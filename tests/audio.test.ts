import assert from 'node:assert/strict'
import test from 'node:test'
import {
  __resetAudioForTests,
  getMuted,
  isAudioReady,
  playHover,
  setMuted,
  unlockAudio,
} from '../lib/audio.ts'

class MockGainNode {
  connectCalls = 0
  gain = {
    setValueAtTimeCalls: [] as Array<[number, number]>,
    exponentialRampToValueAtTimeCalls: [] as Array<[number, number]>,
    setValueAtTime: (value: number, time: number) => {
      this.gain.setValueAtTimeCalls.push([value, time])
    },
    exponentialRampToValueAtTime: (value: number, time: number) => {
      this.gain.exponentialRampToValueAtTimeCalls.push([value, time])
    },
  }

  connect() {
    this.connectCalls += 1
  }
}

class MockOscillatorNode {
  connectCalls = 0
  startCalls = 0
  stopCalls = 0
  type: OscillatorType = 'sine'
  frequency = {
    value: 0,
    setValueAtTimeCalls: [] as Array<[number, number]>,
    exponentialRampToValueAtTimeCalls: [] as Array<[number, number]>,
    setValueAtTime: (value: number, time: number) => {
      this.frequency.setValueAtTimeCalls.push([value, time])
      this.frequency.value = value
    },
    exponentialRampToValueAtTime: (value: number, time: number) => {
      this.frequency.exponentialRampToValueAtTimeCalls.push([value, time])
      this.frequency.value = value
    },
  }

  connect() {
    this.connectCalls += 1
  }

  start() {
    this.startCalls += 1
  }

  stop() {
    this.stopCalls += 1
  }
}

class MockAudioContext {
  static instances: MockAudioContext[] = []

  state: AudioContextState = 'suspended'
  destination = {}
  currentTime = 0
  resumeCalls = 0
  oscillators: MockOscillatorNode[] = []
  gains: MockGainNode[] = []

  constructor() {
    MockAudioContext.instances.push(this)
  }

  async resume() {
    this.resumeCalls += 1
    this.state = 'running'
  }

  createOscillator() {
    const oscillator = new MockOscillatorNode()
    this.oscillators.push(oscillator)
    return oscillator as unknown as OscillatorNode
  }

  createGain() {
    const gain = new MockGainNode()
    this.gains.push(gain)
    return gain as unknown as GainNode
  }
}

function installBrowserMocks() {
  const storage = new Map<string, string>()

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      AudioContext: MockAudioContext,
      localStorage: {
        getItem(key: string) {
          return storage.has(key) ? storage.get(key)! : null
        },
        setItem(key: string, value: string) {
          storage.set(key, value)
        },
      },
    },
  })

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: globalThis.window.localStorage,
  })
}

function resetMocks() {
  MockAudioContext.instances = []
  installBrowserMocks()
  __resetAudioForTests()
}

test.beforeEach(() => {
  resetMocks()
})

test('does not create an AudioContext during module setup', () => {
  assert.equal(MockAudioContext.instances.length, 0)
  assert.equal(isAudioReady(), false)
})

test('unlockAudio creates and resumes the context once', async () => {
  const first = await unlockAudio()
  const second = await unlockAudio()

  assert.equal(first, true)
  assert.equal(second, true)
  assert.equal(MockAudioContext.instances.length, 1)
  assert.equal(MockAudioContext.instances[0]?.resumeCalls, 1)
  assert.equal(isAudioReady(), true)
})

test('playHover is a no-op while audio is locked and plays after unlock', async () => {
  playHover()
  assert.equal(MockAudioContext.instances.length, 0)

  await unlockAudio()
  playHover()

  const context = MockAudioContext.instances[0]
  assert.ok(context)
  assert.equal(context.oscillators.length, 1)
  assert.equal(context.oscillators[0]?.startCalls, 1)
  assert.equal(context.oscillators[0]?.stopCalls, 1)
})

test('mute state blocks playback but preserves unlock readiness', async () => {
  assert.equal(getMuted(), false)

  await unlockAudio()
  setMuted(true)
  playHover()

  const context = MockAudioContext.instances[0]
  assert.ok(context)
  assert.equal(context.oscillators.length, 0)
  assert.equal(isAudioReady(), true)
})
