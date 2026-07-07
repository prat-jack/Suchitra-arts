/**
 * Procedural workshop audio — no samples, everything synthesized.
 * Muted until enable() is called from a user gesture (autoplay policy).
 */
export class SoundKit {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private neonGain!: GainNode
  private winchGain!: GainNode
  private noiseBuf!: AudioBuffer
  private enabled = false

  get isEnabled(): boolean {
    return this.enabled
  }

  enable(): void {
    if (!this.ctx) this.build()
    const ctx = this.ctx!
    void ctx.resume()
    this.enabled = true
    this.master.gain.setTargetAtTime(0.35, ctx.currentTime, 0.15)
  }

  disable(): void {
    if (!this.ctx) return
    this.enabled = false
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08)
  }

  dispose(): void {
    if (this.ctx) void this.ctx.close()
    this.ctx = null
    this.enabled = false
  }

  private build(): void {
    const ctx = new AudioContext()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0
    this.master.connect(ctx.destination)

    const len = ctx.sampleRate * 2
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = this.noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1

    // Work-lamp buzz — runs whenever sound is on, gated by master
    const buzz = ctx.createOscillator()
    buzz.type = 'sawtooth'
    buzz.frequency.value = 100
    const buzzLp = ctx.createBiquadFilter()
    buzzLp.type = 'lowpass'
    buzzLp.frequency.value = 220
    const buzzGain = ctx.createGain()
    buzzGain.gain.value = 0.028
    buzz.connect(buzzLp)
    buzzLp.connect(buzzGain)
    buzzGain.connect(this.master)
    buzz.start()

    // Neon hum — 120Hz + weak octave, gated by neonGain
    const hum = ctx.createOscillator()
    hum.type = 'sine'
    hum.frequency.value = 120
    const hum2 = ctx.createOscillator()
    hum2.type = 'sine'
    hum2.frequency.value = 240
    const hum2Gain = ctx.createGain()
    hum2Gain.gain.value = 0.3
    this.neonGain = ctx.createGain()
    this.neonGain.gain.value = 0
    hum.connect(this.neonGain)
    hum2.connect(hum2Gain)
    hum2Gain.connect(this.neonGain)
    this.neonGain.connect(this.master)
    hum.start()
    hum2.start()

    // Cable winch — looped noise through a bandpass; level follows scroll speed
    const winchSrc = ctx.createBufferSource()
    winchSrc.buffer = this.noiseBuf
    winchSrc.loop = true
    const winchBp = ctx.createBiquadFilter()
    winchBp.type = 'bandpass'
    winchBp.frequency.value = 420
    winchBp.Q.value = 2.2
    this.winchGain = ctx.createGain()
    this.winchGain.gain.value = 0
    winchSrc.connect(winchBp)
    winchBp.connect(this.winchGain)
    this.winchGain.connect(this.master)
    winchSrc.start()
  }

  setNeonOn(on: boolean): void {
    if (!this.ctx) return
    this.neonGain.gain.setTargetAtTime(on ? 0.05 : 0, this.ctx.currentTime, 0.25)
  }

  setWinch(level: number): void {
    if (!this.ctx) return
    this.winchGain.gain.setTargetAtTime(level, this.ctx.currentTime, 0.12)
  }

  private thump(freqStart: number, freqEnd: number, peak: number, decay: number): void {
    if (!this.ctx || !this.enabled) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freqStart, t)
    osc.frequency.exponentialRampToValueAtTime(freqEnd, t + decay)
    const g = ctx.createGain()
    g.gain.setValueAtTime(peak, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + decay)
    osc.connect(g)
    g.connect(this.master)
    osc.start(t)
    osc.stop(t + decay + 0.05)
  }

  private burst(
    filterType: BiquadFilterType,
    freq: number,
    peak: number,
    dur: number,
    when = 0,
  ): void {
    if (!this.ctx || !this.enabled) return
    const ctx = this.ctx
    const t = ctx.currentTime + when
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const f = ctx.createBiquadFilter()
    f.type = filterType
    f.frequency.value = freq
    const g = ctx.createGain()
    g.gain.setValueAtTime(peak, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    src.connect(f)
    f.connect(g)
    g.connect(this.master)
    src.start(t, Math.random())
    src.stop(t + dur + 0.05)
  }

  /** A letter seating onto its mounts. */
  clunk(): void {
    this.thump(95, 48, 0.22, 0.16)
    this.burst('lowpass', 900, 0.1, 0.07)
  }

  /** The breaker throw. */
  thunk(): void {
    this.thump(64, 34, 0.5, 0.32)
    this.burst('lowpass', 300, 0.16, 0.1)
  }

  spark(): void {
    for (let i = 0; i < 3; i++) {
      this.burst('highpass', 3200, 0.07, 0.03, i * 0.05 + Math.random() * 0.02)
    }
  }
}
