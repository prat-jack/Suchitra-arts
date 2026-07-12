import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function About() {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = gsap.context(() => {
      if (reducedMotion) {
        gsap.set('.ab-mask > *', { yPercent: 0 })
        gsap.set('.ab-reveal', { clearProps: 'all' })
        return
      }
      gsap.utils.toArray<HTMLElement>('.ab-mask > *').forEach((el, i) => {
        gsap.fromTo(
          el,
          { yPercent: 112 },
          {
            yPercent: 0,
            duration: 0.9,
            delay: i * 0.1,
            ease: 'power3.out',
            scrollTrigger: { trigger: rootRef.current, start: 'top 72%' },
          },
        )
      })
      gsap.fromTo(
        '.ab-reveal',
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.12,
          delay: 0.25,
          ease: 'power2.out',
          scrollTrigger: { trigger: rootRef.current, start: 'top 72%' },
        },
      )
    }, rootRef)
    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={rootRef}
      id="about"
      className="relative bg-ink bg-[radial-gradient(640px_220px_at_50%_0%,rgba(255,180,67,0.05),transparent_70%)] py-28 md:py-40"
    >
      <div className="px-6 md:px-12 lg:px-20">
        <p className="font-mono text-[11px] tracking-[0.24em] text-putty">
          ABOUT — THE WORKSHOP
        </p>

        <div className="mt-8 grid gap-12 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-20">
          <h2 className="font-display text-[clamp(2.6rem,5.5vw,5.5rem)] font-extrabold leading-[0.95] text-bone">
            <span className="ab-mask block overflow-hidden pb-[0.06em]">
              <span className="block will-change-transform">A WORKSHOP,</span>
            </span>
            <span className="ab-mask block overflow-hidden pb-[0.08em]">
              <span className="block will-change-transform text-tungsten">NOT AN AGENCY</span>
            </span>
          </h2>

          <div className="flex max-w-lg flex-col gap-5 text-sm leading-relaxed text-putty md:text-base">
            <p className="ab-reveal">
              Suchitra Arts is a signage workshop in BTM Layout, Bengaluru. Not a broker, not a
              print shop with a catalogue — a floor with benders, welders and wiring benches,
              where signs are designed, fabricated and tested before they ever see your wall.
            </p>
            <p className="ab-reveal">
              We work the way small workshops always have: one crew carries your job from the
              first site measurement to the moment the breaker is thrown. Steel, acrylic, glass
              tube and LED — chosen for the street your shop sits on, not for what's lying
              around.
            </p>
            <p className="ab-reveal">
              Shops, cafés, clinics, offices — anyone whose name deserves to be found after
              dark. If the sign we build you doesn't make you stop on the footpath and look up,
              we haven't finished.
            </p>
            <p className="ab-reveal font-mono text-[10px] tracking-[0.2em] text-putty/70">
              DESIGN — FABRICATION — INSTALLATION · ALL UNDER ONE ROOF · BTM LAYOUT, BENGALURU
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
