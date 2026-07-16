import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// CONCEPT RENDERS — fictional marques, rendered in this project's own engine
// (dev-only StillSign renderer, /?still=<id> — see src/hero/StillSign.ts).
// Each shows a reverse-channel (halo-lit) treatment we fabricate. Swap each
// entry's src for a real install photo when Samuel provides them.
interface WorkItem {
  src: string
  alt: string
  title: string
  chips: string
}

const WORKS: WorkItem[] = [
  {
    src: 'work/render-kanaka.jpg',
    alt: 'Concept render: KANAKA & CO in halo-lit brass serif letters on dark stone',
    title: 'KANAKA & CO',
    chips: 'REVERSE-LIT BRASS · STONE',
  },
  {
    src: 'work/render-marigold.jpg',
    alt: 'Concept render: MARIGOLD CAFE & BAKERY, two-line halo letters on warm plaster',
    title: 'MARIGOLD',
    chips: 'HALO LETTERS · WARM PLASTER',
  },
  {
    src: 'work/render-basava.jpg',
    alt: 'Concept render: BASAVA SILKS in bold gold letters with amber halo on charcoal',
    title: 'BASAVA SILKS',
    chips: 'GOLD STEEL · AMBER HALO',
  },
  {
    src: 'work/render-bakehouse.jpg',
    alt: 'Concept render: THE BAKEHOUSE in dark letters with cream halo on exposed brick',
    title: 'THE BAKEHOUSE',
    chips: 'HALO LETTERS · EXPOSED BRICK',
  },
  {
    src: 'work/render-veda.jpg',
    alt: 'Concept render: VEDA WELLNESS SPA in serif letters with a cool halo on plaster',
    title: 'VEDA WELLNESS',
    chips: 'SATIN STEEL · COOL HALO',
  },
  {
    src: 'work/render-cubbon.jpg',
    alt: 'Concept render: CUBBON HOUSE in brass serif letters with amber halo on stone',
    title: 'CUBBON HOUSE',
    chips: 'SERIF BRASS · AMBER HALO',
  },
]

export default function Work() {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = gsap.context(() => {
      if (reducedMotion) {
        gsap.set('.wk-tile', { clearProps: 'all' })
        document.querySelectorAll('.wk-tile').forEach((t) => t.classList.add('lit'))
        return
      }
      gsap.utils.toArray<HTMLElement>('.wk-tile').forEach((tile, i) => {
        gsap.fromTo(
          tile,
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            delay: (i % 3) * 0.08,
            ease: 'power2.out',
            scrollTrigger: { trigger: tile, start: 'top 88%' },
          },
        )
      })
    }, rootRef)

    // Tiles "light up" in the reading band — same unlit→lit language as
    // Services. IO reads live geometry (invariant #7: survives pin shifts).
    let io: IntersectionObserver | null = null
    if (!reducedMotion) {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            entry.target.classList.toggle('lit', entry.isIntersecting)
          }
        },
        { rootMargin: '-8% 0px -12% 0px' },
      )
      rootRef.current?.querySelectorAll('.wk-tile').forEach((t) => io!.observe(t))
    }

    return () => {
      io?.disconnect()
      ctx.revert()
    }
  }, [])

  return (
    <section ref={rootRef} id="gallery" className="relative bg-ink py-28 md:py-40">
      <div className="px-6 md:px-12 lg:px-20">
        <h2 className="sr-only">The work</h2>
        <p className="font-mono text-[11px] tracking-[0.24em] text-putty">
          THE WORK — SIGNS OUT THE DOOR
        </p>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-putty">
          The looks we build most — reverse-lit brass, halo letters, backlit fascias — shown the
          way they read after dark.
        </p>
        <p className="mt-3 font-mono text-[10px] tracking-[0.2em] text-tungsten/80">
          STUDIO CONCEPT RENDERS — INSTALL PHOTOGRAPHS TO FOLLOW
        </p>
      </div>

      <div className="mx-6 mt-12 md:mx-12 md:mt-16 lg:mx-20">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {WORKS.map((w) => (
            <figure
              key={w.src}
              className="wk-tile group relative overflow-hidden rounded-sm border border-steel/50 bg-charcoal"
            >
              {/* Renders are 16:10 with signs spanning most of the width —
                  matching the tile aspect avoids cropping letter edges */}
              <img
                src={w.src}
                alt={w.alt}
                loading="lazy"
                className="wk-img aspect-[16/10] w-full object-cover"
              />
              <figcaption className="flex items-baseline justify-between gap-4 border-t border-steel/50 px-4 py-3">
                <span className="font-display text-lg font-extrabold tracking-wide text-bone">
                  {w.title}
                </span>
                <span className="text-right font-mono text-[10px] tracking-[0.18em] text-putty">
                  {w.chips}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
