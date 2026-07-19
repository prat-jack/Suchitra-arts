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
    src: 'work/render-sunday.jpg',
    alt: 'Concept render: second sunday in cream skeleton-script letters casting a hard sun shadow on ribbed sage cladding',
    title: 'SECOND SUNDAY',
    chips: 'SKELETON SCRIPT · RIBBED STEEL',
  },
  {
    src: 'work/render-hen.jpg',
    alt: 'Concept render: HEN HOUSE in red letters on a black roundel with a cream ring, mounted on brick at night',
    title: 'HEN HOUSE',
    chips: 'PANEL ROUNDEL · BRICK',
  },
  {
    src: 'work/render-malabar.jpg',
    alt: 'Concept render: malabar in deep green retro script channel letters on warm pink plaster',
    title: 'MALABAR',
    chips: 'CHANNEL SCRIPT · PINK PLASTER',
  },
  {
    src: 'work/render-biryani.jpg',
    alt: 'Concept render: THE BIRYANI ROOM stencil-cut into a dark roundel, warm light bleeding through and around it onto brick',
    title: 'THE BIRYANI ROOM',
    chips: 'BACKLIT STENCIL · ROUNDEL',
  },
  {
    src: 'work/render-kala.jpg',
    alt: 'Concept render: KALA HOUSE in teal dimensional letters over a yellow painted ghost print on whitewashed planks',
    title: 'KALA HOUSE',
    chips: 'GHOST PRINT · TIMBER',
  },
  {
    src: 'work/render-kaapi.jpg',
    alt: 'Concept render: filter kaapi in warm white neon script tubes on a dark plaque over subway tile',
    title: 'FILTER KAAPI',
    chips: 'NEON SCRIPT · SUBWAY TILE',
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
          The looks we build most — script channel letters, painted-and-mounted double prints,
          backlit roundels, neon tube work — in daylight and after dark.
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
