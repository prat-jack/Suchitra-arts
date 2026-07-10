import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import { SignScene } from './SignScene'
import { SoundKit } from './SoundKit'
import MagneticButton from '../MagneticButton'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

const STAGES: Array<[number, string]> = [
  [0.1, '01 — LAYOUT'],
  [0.635, '02 — MOUNTING'],
  [0.72, '03 — WIRING'],
  [1.01, '04 — POWER ON'],
]

export default function Hero({ onNavChange }: { onNavChange?: (visible: boolean) => void }) {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const kickerRef = useRef<HTMLParagraphElement>(null)
  const cueRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const stageLabelRef = useRef<HTMLSpanElement>(null)
  const stageBarRef = useRef<HTMLSpanElement>(null)
  const skipRef = useRef<HTMLButtonElement>(null)
  const scrollEndRef = useRef(0)
  const soundRef = useRef<SoundKit | null>(null)
  const sceneRef = useRef<SignScene | null>(null)
  const prevProgressRef = useRef(0)
  const line1Ref = useRef<HTMLSpanElement>(null)
  const line2Ref = useRef<HTMLSpanElement>(null)
  const currentLabelRef = useRef('01 — LAYOUT')
  const scrambleTweenRef = useRef<gsap.core.Tween | null>(null)
  const [ready, setReady] = useState(false)
  const [soundOn, setSoundOn] = useState(false)

  const toggleSound = () => {
    if (!soundRef.current) soundRef.current = new SoundKit()
    const sound = soundRef.current
    const scene = sceneRef.current
    if (soundOn) {
      sound.disable()
      setSoundOn(false)
    } else {
      sound.enable()
      if (scene && prevProgressRef.current > 0.79 && scene.isSignOn) sound.setNeonOn(true)
      setSoundOn(true)
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const section = sectionRef.current
    if (!canvas || !section) return

    const reducedMotionEarly = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isMobileEarly =
      window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 1024

    const scene = new SignScene(canvas, reducedMotionEarly || isMobileEarly)
    sceneRef.current = scene
    let disposed = false
    let tl: gsap.core.Timeline | null = null
    let heroSt: ScrollTrigger | null = null
    let tick: ((time: number, dt: number) => void) | null = null
    let onResize: (() => void) | null = null
    let onMove: ((e: PointerEvent) => void) | null = null
    let onClick: ((e: PointerEvent) => void) | null = null

    const toNdc = (e: PointerEvent): [number, number] => {
      const r = canvas.getBoundingClientRect()
      return [((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)]
    }

    const reducedMotion = reducedMotionEarly
    const isMobile = isMobileEarly

    scene.load().then(() => {
      if (disposed) return

      tl = gsap.timeline({ paused: true })
      scene.buildTimeline(tl)

      gsap.to(kickerRef.current, { opacity: 1, y: 0, duration: 1.4, delay: 1.6, ease: 'power2.out' })
      gsap.to(cueRef.current, { opacity: 1, duration: 1.2, delay: 2.4 })

      tl.to(cueRef.current, { opacity: 0, duration: 3 }, 6)
      tl.to(kickerRef.current, { opacity: 0, y: -10, duration: 3 }, 60)
      tl.fromTo(
        headlineRef.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 8, ease: 'power2.out', immediateRender: false },
        86.5,
      )
      tl.fromTo(
        line1Ref.current,
        { yPercent: 112 },
        { yPercent: 0, duration: 5.5, ease: 'power3.out', immediateRender: false },
        87,
      )
      tl.fromTo(
        line2Ref.current,
        { yPercent: 112 },
        { yPercent: 0, duration: 5.5, ease: 'power3.out', immediateRender: false },
        88.4,
      )

      const updateSound = (progress: number, velocity: number) => {
        const sound = soundRef.current
        const prev = prevProgressRef.current
        for (const c of scene.contactProgresses) {
          if (prev < c && progress >= c) {
            scene.triggerShake(0.005)
            sound?.isEnabled && sound.clunk()
          }
        }
        if (prev < 0.72 && progress >= 0.72) {
          scene.triggerShake(0.014)
          if (sound?.isEnabled) {
            sound.thunk()
            sound.spark()
          }
        }
        if (sound?.isEnabled) {
          if (prev < 0.79 && progress >= 0.79) sound.setNeonOn(true)
          if (prev >= 0.744 && progress < 0.744) sound.setNeonOn(false)
          const mounting = progress > 0.095 && progress < 0.64
          sound.setWinch(mounting ? Math.min(0.13, Math.abs(velocity) / 7000) : 0)
        }
        prevProgressRef.current = progress
      }

      const scrambleTo = (el: HTMLElement, text: string) => {
        scrambleTweenRef.current?.kill()
        const glyphs = '0123456789#/—▪'
        const proxy = { p: 0 }
        const settle = () => {
          el.textContent = text
        }
        scrambleTweenRef.current = gsap.to(proxy, {
          p: 1,
          duration: 0.45,
          ease: 'none',
          onUpdate: () => {
            const n = Math.floor(proxy.p * text.length)
            let out = text.slice(0, n)
            for (let i = n; i < text.length; i++) {
              out += text[i] === ' ' ? ' ' : glyphs[(Math.random() * glyphs.length) | 0]
            }
            el.textContent = out
          },
          onComplete: settle,
          onInterrupt: settle,
        })
      }

      const updateHud = (progress: number) => {
        onNavChange?.(progress > 0.8)
        const label = STAGES.find(([bound]) => progress < bound)?.[1] ?? STAGES[STAGES.length - 1][1]
        if (stageLabelRef.current && currentLabelRef.current !== label) {
          currentLabelRef.current = label
          scrambleTo(stageLabelRef.current, label)
        }
        if (stageBarRef.current) {
          stageBarRef.current.style.transform = `scaleX(${Math.min(1, progress)})`
        }
        if (stageRef.current) {
          const fadeIn = Math.min(1, Math.max(0, (progress - 0.015) / 0.03))
          const fadeOut = Math.min(1, Math.max(0, (0.985 - progress) / 0.03))
          stageRef.current.style.opacity = String(Math.min(fadeIn, fadeOut))
        }
        if (skipRef.current) {
          const visible = progress > 0.03 && progress < 0.9
          skipRef.current.style.opacity = visible ? '1' : '0'
          skipRef.current.style.pointerEvents = visible ? 'auto' : 'none'
        }
      }

      if (reducedMotion) {
        scene.snapToEnd(tl)
        onNavChange?.(true)
        gsap.set([kickerRef.current, cueRef.current, stageRef.current, skipRef.current], { opacity: 0 })
        gsap.set(headlineRef.current, { opacity: 1, y: 0 })
        gsap.set([line1Ref.current, line2Ref.current], { yPercent: 0 })
      } else if (isMobile) {
        // Phones get the story as a ~6s autoplay cinematic — no pin, no scroll-jacking
        gsap.set([cueRef.current, stageRef.current, skipRef.current], { opacity: 0 })
        tl.timeScale(100 / 6)
        tl.eventCallback('onUpdate', () => {
          const p = tl!.progress()
          onNavChange?.(p > 0.8)
          updateSound(p, 2600)
        })
        tl.eventCallback('onComplete', () => scene.setIdle(true))
        gsap.delayedCall(1.5, () => tl?.play())
      } else {
        const st = (heroSt = ScrollTrigger.create({
          trigger: section,
          start: 'top top',
          end: '+=4200',
          pin: true,
          scrub: 1.1,
          anticipatePin: 1,
          animation: tl,
          onUpdate: (self) => {
            scene.setIdle(self.progress > 0.97)
            updateHud(self.progress)
            updateSound(self.progress, self.getVelocity())
          },
        }))
        tl.eventCallback('onComplete', () => scene.setIdle(true))
        // Global refresh: the pin just added ~4200px to the page, so every
        // OTHER section's triggers must re-measure too — st.refresh() alone
        // left them positioned as if the pin didn't exist
        ScrollTrigger.refresh()
        scrollEndRef.current = st.start + 4200
        updateHud(st.progress)
        if (import.meta.env.DEV) {
          ;(window as unknown as Record<string, unknown>).__heroHud = updateHud
        }
      }

      if (import.meta.env.DEV) {
        ;(window as unknown as Record<string, unknown>).__heroTl = tl
        ;(window as unknown as Record<string, unknown>).__heroScene = scene
      }

      tick = (_time, dt) => scene.render(dt / 1000)
      gsap.ticker.add(tick)

      onResize = () => scene.resize(canvas.clientWidth, canvas.clientHeight)
      window.addEventListener('resize', onResize)

      onMove = (e) => {
        const [x, y] = toNdc(e)
        scene.setPointer(x, y)
        canvas.style.cursor = scene.pointerOverBreaker(x, y) ? 'pointer' : ''
      }
      onClick = (e) => {
        const [x, y] = toNdc(e)
        if (scene.tryToggle(x, y)) {
          const sound = soundRef.current
          if (sound?.isEnabled) {
            sound.thunk()
            if (scene.isSignOn) {
              sound.spark()
              gsap.delayedCall(0.6, () => sound.setNeonOn(scene.isSignOn))
            } else {
              sound.setNeonOn(false)
            }
          }
        }
      }
      canvas.addEventListener('pointermove', onMove)
      canvas.addEventListener('click', onClick as EventListener)
      setReady(true)
    })

    return () => {
      disposed = true
      if (tick) gsap.ticker.remove(tick)
      if (onResize) window.removeEventListener('resize', onResize)
      if (onMove) canvas.removeEventListener('pointermove', onMove)
      if (onClick) canvas.removeEventListener('click', onClick as EventListener)
      // Kill only the hero's own trigger — other sections manage theirs
      heroSt?.kill()
      tl?.kill()
      soundRef.current?.dispose()
      soundRef.current = null
      scene.dispose()
    }
  }, [])

  return (
    <section ref={sectionRef} className="relative h-screen w-full overflow-hidden bg-ink">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Animated workshop scene: cable rigs hoist the letters of Suchitra Arts onto a wall, a breaker is thrown, and the flat letters become glowing 3D channel-letter signage."
        className="absolute inset-0 h-full w-full"
      />

      <p
        ref={kickerRef}
        className="absolute left-6 top-6 translate-y-3 font-mono text-[11px] tracking-[0.22em] text-putty opacity-0 md:left-12 md:top-10 md:text-xs"
      >
        CUSTOM SIGNAGE · BTM LAYOUT · BANGALORE
      </p>

      <div
        ref={cueRef}
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 opacity-0"
      >
        <span className="font-mono text-[11px] tracking-[0.2em] text-putty">SCROLL TO BUILD</span>
        <span className="block h-8 w-px animate-pulse bg-tungsten" />
      </div>

      <button
        ref={skipRef}
        type="button"
        aria-label="Skip the build sequence"
        onClick={() =>
          gsap.to(window, { scrollTo: scrollEndRef.current, duration: 1.2, ease: 'power2.inOut' })
        }
        className="pointer-events-none absolute right-6 top-6 cursor-pointer font-mono text-[11px] tracking-[0.2em] text-putty opacity-0 transition-colors duration-200 hover:text-bone md:right-12 md:top-10"
        style={{ transition: 'opacity 0.4s, color 0.2s' }}
      >
        SKIP BUILD →
      </button>

      <div
        ref={stageRef}
        className="absolute bottom-16 right-6 flex flex-col items-end gap-2 opacity-0 md:bottom-20 md:right-12"
      >
        <span ref={stageLabelRef} className="font-mono text-[11px] tracking-[0.2em] text-putty">
          01 — LAYOUT
        </span>
        <span className="block h-px w-[120px] overflow-hidden bg-steel">
          <span
            ref={stageBarRef}
            className="block h-full w-full origin-left bg-tungsten"
            style={{ transform: 'scaleX(0)' }}
          />
        </span>
      </div>

      <div
        ref={headlineRef}
        className="absolute bottom-10 left-6 max-w-xl opacity-0 md:bottom-16 md:left-12"
      >
        <h1 className="font-display text-5xl font-extrabold leading-[0.95] text-bone md:text-7xl">
          <span className="block overflow-hidden pb-[0.08em]">
            <span ref={line1Ref} className="block will-change-transform">
              SIGNS THAT MAKE
            </span>
          </span>
          <span className="block overflow-hidden pb-[0.08em]">
            <span ref={line2Ref} className="block text-neon will-change-transform">
              BUSINESSES GLOW
            </span>
          </span>
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-putty md:text-base">
          Storefront signs, illuminated channel letters and 3D lettering — designed flat, built
          dimensional, lit by hand in our BTM Layout workshop.
        </p>
        <div className="mt-6 flex items-center gap-5">
          <MagneticButton
            href="#contact"
            className="rounded-sm bg-neon px-6 py-3 font-semibold text-ink transition-colors duration-200 hover:bg-tungsten"
          >
            Get a quote
          </MagneticButton>
          <a
            href="#work"
            className="font-medium text-tungsten transition-colors duration-200 hover:text-bone"
          >
            See the work →
          </a>
        </div>
      </div>

      <button
        type="button"
        onClick={toggleSound}
        aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'}
        className="absolute bottom-8 right-6 z-10 cursor-pointer font-mono text-[11px] tracking-[0.2em] text-putty transition-colors duration-200 hover:text-bone md:bottom-10 md:right-12"
      >
        SOUND — {soundOn ? 'ON' : 'OFF'}
      </button>

      <div
        className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-ink transition-opacity duration-700 ${
          ready ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <span className="loader-s font-display text-8xl font-extrabold text-neon">S</span>
        <span className="font-mono text-[11px] tracking-[0.22em] text-putty">SWITCHING ON…</span>
      </div>
    </section>
  )
}
