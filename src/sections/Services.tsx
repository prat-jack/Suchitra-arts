import { useEffect, useRef, type CSSProperties } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/** Per-letter spans so each "tube" or extrusion can animate on its own clock. */
function SplitLetters({ text }: { text: string }) {
  return (
    <>
      {[...text].map((ch, i) => (
        <span
          key={i}
          className="svc-ltr inline-block will-change-transform"
          style={{ '--i': i } as CSSProperties}
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </>
  )
}

interface Service {
  id: string
  title: string
  fx: 'neon' | 'extrude' | 'lightbox' | 'argon'
  desc: string
  chips: string[]
}

const SERVICES: Service[] = [
  {
    id: '01',
    title: 'ILLUMINATED SIGNS',
    fx: 'neon',
    desc: 'LED channel letters, glow sign boards and backlit panels that pull eyes from across the street — engineered to run all night, every night.',
    chips: ['LED MODULES', 'ACRYLIC', 'WEATHERPROOF'],
  },
  {
    id: '02',
    title: '3D LETTERS',
    fx: 'extrude',
    desc: 'Brushed steel, acrylic and high-density foam lettering with real depth — the difference between a name and a presence.',
    chips: ['SS 304', 'ACRYLIC', 'HDU FOAM'],
  },
  {
    id: '03',
    title: 'STOREFRONT SIGNAGE',
    fx: 'lightbox',
    desc: 'Complete facades: ACP cladding, flex boards and window graphics — measured, fabricated and installed as one clean build.',
    chips: ['ACP', 'FLEX', 'VINYL'],
  },
  {
    id: '04',
    title: 'CUSTOM FABRICATION',
    fx: 'argon',
    desc: 'If you can sketch it, we can build it — one-off installations, wayfinding, name plates and the odd impossible request.',
    chips: ['MADE TO DRAWING'],
  },
]

export default function Services() {
  const rootRef = useRef<HTMLElement>(null)
  const conduitRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = gsap.context(() => {
      if (reducedMotion) {
        gsap.set('.svc-title-mask > *', { yPercent: 0 })
        gsap.set('.svc-title-mask', { overflow: 'visible' })
        gsap.set(['.svc-meta', '.svc-line'], { clearProps: 'all' })
        gsap.set(conduitRef.current, { scaleY: 1 })
        document.querySelectorAll('.svc-row').forEach((r) => r.classList.add('lit'))
        return
      }

      gsap.fromTo(
        conduitRef.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: rootRef.current,
            start: 'top 70%',
            end: 'bottom 95%',
            scrub: 1,
          },
        },
      )

      gsap.utils.toArray<HTMLElement>('.svc-row').forEach((row) => {
        const maskInner = row.querySelector('.svc-title-mask > *')
        gsap.fromTo(
          maskInner,
          { yPercent: 112 },
          {
            yPercent: 0,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: { trigger: row, start: 'top 84%' },
            // The mask clips hanging tags and glow halos once revealed — release it
            onComplete: () => {
              const mask = maskInner?.parentElement
              if (mask) mask.style.overflow = 'visible'
            },
          },
        )
        gsap.fromTo(
          row.querySelector('.svc-meta'),
          { opacity: 0, y: 18 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            delay: 0.18,
            ease: 'power2.out',
            scrollTrigger: { trigger: row, start: 'top 84%' },
          },
        )
        gsap.fromTo(
          row.querySelector('.svc-line'),
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1.1,
            ease: 'power2.inOut',
            scrollTrigger: { trigger: row, start: 'top 90%' },
          },
        )
      })
    }, rootRef)

    // The sign "switches on" as the row reaches the reading zone.
    // IntersectionObserver instead of ScrollTrigger toggleClass: it measures
    // live geometry, so pin-spacer layout shifts can never leave it stale.
    let io: IntersectionObserver | null = null
    if (!reducedMotion) {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            entry.target.classList.toggle('lit', entry.isIntersecting)
          }
        },
        { rootMargin: '-18% 0px -36% 0px' },
      )
      rootRef.current?.querySelectorAll('.svc-row').forEach((row) => io!.observe(row))
    }

    return () => {
      io?.disconnect()
      ctx.revert()
    }
  }, [])

  return (
    <section
      ref={rootRef}
      id="work"
      className="relative bg-ink bg-[radial-gradient(720px_240px_at_50%_0%,rgba(255,90,31,0.08),transparent_70%)] py-28 md:py-40"
    >
      <div className="px-6 md:px-12 lg:px-20">
        <h2 className="sr-only">What we make</h2>
        <p className="font-mono text-[11px] tracking-[0.24em] text-putty">
          WHAT WE MAKE — FOUR WAYS TO BE SEEN
        </p>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-putty">
          Every job leaves the workshop the same way: measured twice, built once, and lit before
          we hand over the keys.
        </p>
      </div>

      <div className="relative mx-6 mt-16 md:mx-12 md:mt-24 lg:mx-20">
        <div
          ref={conduitRef}
          aria-hidden
          className="absolute bottom-0 left-0 top-0 hidden w-px origin-top bg-neon/60 md:block"
          style={{ boxShadow: '0 0 10px rgba(255,90,31,0.45)' }}
        />

        <div className="md:pl-14">
          {SERVICES.map((s) => (
            <article key={s.id} className={`svc-row svc-${s.fx} group relative py-10 md:py-14`}>
              <span
                aria-hidden
                className="svc-node absolute top-[3.4rem] hidden h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-steel bg-ink md:-left-14 md:block md:top-[4.6rem]"
              />

              <div className="grid items-end gap-6 md:grid-cols-[minmax(0,1fr)_320px] lg:grid-cols-[minmax(0,1fr)_380px]">
                <div>
                  <span className="font-mono text-[11px] tracking-[0.24em] text-putty">
                    {s.id}
                  </span>
                  <h3 className="mt-2 font-display text-[clamp(2.6rem,6.5vw,6rem)] font-extrabold leading-[0.95]">
                    <span className="svc-title-mask block overflow-hidden pb-[0.08em]">
                      <span className="block will-change-transform">
                        <span className="relative inline-block">
                          {s.fx === 'lightbox' && <span aria-hidden className="svc-panel" />}
                          <span
                            className="svc-title relative inline-block"
                            data-text={s.fx === 'argon' ? s.title : undefined}
                          >
                            {s.fx === 'neon' || s.fx === 'extrude' ? (
                              <SplitLetters text={s.title} />
                            ) : (
                              s.title
                            )}
                          </span>
                          {s.fx === 'argon' && <span aria-hidden className="svc-spark" />}
                          {s.fx === 'argon' && (
                            <span aria-hidden className="svc-underline mt-2 block h-[3px] w-full" />
                          )}
                          {s.fx === 'lightbox' && (
                            <span aria-hidden className="svc-open-tag font-mono">
                              OPEN
                            </span>
                          )}
                        </span>
                      </span>
                    </span>
                  </h3>
                </div>

                <div className="svc-meta flex flex-col gap-4 pb-2">
                  <p className="text-sm leading-relaxed text-putty">{s.desc}</p>
                  <p className="font-mono text-[10px] tracking-[0.2em] text-putty/70">
                    {s.chips.join(' · ')}
                  </p>
                </div>
              </div>

              <span
                aria-hidden
                className="svc-line absolute bottom-0 left-0 right-0 h-px origin-left bg-steel"
              />
            </article>
          ))}
        </div>

        <p className="mt-14 md:pl-14">
          <a
            href="#contact"
            className="font-mono text-[11px] tracking-[0.22em] text-tungsten transition-colors duration-200 hover:text-bone"
          >
            SOMETHING ELSE IN MIND? — TALK TO US →
          </a>
        </p>
      </div>
    </section>
  )
}
