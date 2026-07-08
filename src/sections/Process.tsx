import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface Step {
  id: string
  title: string
  desc: string
  chip: string
  icon: 'measure' | 'draw' | 'weld' | 'power'
}

const STEPS: Step[] = [
  {
    id: '01',
    title: 'MEASURE',
    desc: 'We start at your shopfront, not a moodboard — facade measurements, mounting points, power routing, and how the street actually sees you.',
    chip: 'SITE SURVEY · SAME WEEK',
    icon: 'measure',
  },
  {
    id: '02',
    title: 'DESIGN & PROOF',
    desc: 'Your artwork becomes a scale fabrication drawing — materials, lighting and fixings specified, proofed and signed off before anything is cut.',
    chip: 'SCALE DRAWING · 2–3 DAYS',
    icon: 'draw',
  },
  {
    id: '03',
    title: 'FABRICATE',
    desc: 'Cut, bent, welded and wired in our BTM Layout workshop — by the same hands that will install it.',
    chip: 'IN-HOUSE · 7–10 DAYS',
    icon: 'weld',
  },
  {
    id: '04',
    title: 'INSTALL & LIGHT UP',
    desc: 'Mounted, cabled, tested — and switched on with you watching. We don’t leave until it glows.',
    chip: 'ON-SITE INSTALL · 1 DAY',
    icon: 'power',
  },
]

function StepIcon({ kind }: { kind: Step['icon'] }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (kind) {
    case 'measure':
      return (
        <svg viewBox="0 0 48 24" className="h-6 w-12" aria-hidden {...common}>
          <path d="M2 12 H46 M2 6 V18 M46 6 V18 M13 9 V15 M24 6 V18 M35 9 V15" />
        </svg>
      )
    case 'draw':
      return (
        <svg viewBox="0 0 48 24" className="h-6 w-12" aria-hidden {...common}>
          <path d="M6 4 H42 V20 H6 Z M6 9 H42 M14 4 V20 M32 14 L38 8 M30 16 L32 14" />
        </svg>
      )
    case 'weld':
      return (
        <svg viewBox="0 0 48 24" className="h-6 w-12" aria-hidden {...common}>
          <path d="M4 20 L18 20 L24 12 L30 20 L44 20 M24 12 L20 4 M24 12 L28 5 M24 12 L24 2" />
        </svg>
      )
    case 'power':
      return (
        <svg viewBox="0 0 48 24" className="h-6 w-12" aria-hidden {...common}>
          <circle cx="24" cy="12" r="10" />
          <path d="M26 4 L20 13 H24 L22 20 L28 11 H24 Z" />
        </svg>
      )
  }
}

export default function Process() {
  const rootRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = gsap.context(() => {
      if (reducedMotion) {
        gsap.set('.proc-title-mask > *', { yPercent: 0 })
        gsap.set('.proc-body', { clearProps: 'all' })
        return
      }
      gsap.utils.toArray<HTMLElement>('.proc-step').forEach((block, i) => {
        ScrollTrigger.create({
          trigger: block,
          start: 'top 55%',
          end: 'bottom 55%',
          onToggle: (self) => {
            if (self.isActive) setActive(i)
          },
        })
        gsap.fromTo(
          block.querySelector('.proc-title-mask > *'),
          { yPercent: 112 },
          {
            yPercent: 0,
            duration: 0.85,
            ease: 'power3.out',
            scrollTrigger: { trigger: block, start: 'top 78%' },
          },
        )
        gsap.fromTo(
          block.querySelector('.proc-body'),
          { opacity: 0, y: 16 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            delay: 0.15,
            ease: 'power2.out',
            scrollTrigger: { trigger: block, start: 'top 78%' },
          },
        )
      })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={rootRef}
      id="process"
      className="relative bg-ink bg-[radial-gradient(640px_220px_at_50%_0%,rgba(127,214,232,0.05),transparent_70%)] py-28 md:py-40"
    >
      <div className="px-6 md:px-12 lg:px-20">
        <p className="font-mono text-[11px] tracking-[0.24em] text-putty">
          HOW WE WORK — FROM DRAWING TO GLOW
        </p>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-putty">
          One workshop, one crew, no hand-offs. The person who measures your wall is the person
          who bolts the sign to it.
        </p>
      </div>

      <div className="mx-6 mt-10 md:mx-12 md:mt-16 lg:mx-20">
        <div className="md:grid md:grid-cols-[300px_minmax(0,1fr)] md:gap-16 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="hidden md:block">
            <div className="sticky top-[22vh]">
              <div key={active} className="proc-numeral-wrap overflow-hidden">
                <span className="proc-numeral block font-display text-[11rem] font-extrabold leading-none text-bone lg:text-[15rem]">
                  {STEPS[active].id}
                </span>
              </div>
              <p className="mt-4 font-mono text-[11px] tracking-[0.24em] text-putty">
                STEP {STEPS[active].id} / 04 — {STEPS[active].title}
              </p>
            </div>
          </div>

          <div>
            {STEPS.map((s, i) => (
              <article
                key={s.id}
                className={`proc-step flex min-h-[62vh] flex-col justify-center border-b border-steel/60 py-16 ${
                  i === 0 ? 'md:-mt-8' : ''
                }`}
              >
                <span className="text-argon/80">
                  <StepIcon kind={s.icon} />
                </span>
                <span className="mt-5 font-mono text-[11px] tracking-[0.24em] text-putty md:hidden">
                  STEP {s.id} / 04
                </span>
                <h3 className="mt-2 font-display text-4xl font-extrabold leading-[0.95] text-bone md:mt-5 md:text-6xl">
                  <span className="proc-title-mask block overflow-hidden pb-[0.08em]">
                    <span className="block will-change-transform">{s.title}</span>
                  </span>
                </h3>
                <div className="proc-body mt-5 max-w-md">
                  <p className="text-sm leading-relaxed text-putty">{s.desc}</p>
                  <p className="mt-4 font-mono text-[10px] tracking-[0.2em] text-putty/70">
                    {s.chip}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
