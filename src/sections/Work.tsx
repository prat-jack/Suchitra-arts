import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// PROTOTYPE IMAGERY — reference styles, not Suchitra Arts installs.
// All images are CC0 / Public Domain via Openverse (no attribution required):
//   work-neon-letters   openverse id e09a1445 (flickr 51679210376)
//   work-tube-script    openverse id 5bf289d7 (flickr 51558190153)
//   work-facade         openverse id ea2d7b75 (flickr 51709111519)
//   work-fascia         openverse id 5333fc31 (flickr 51558876555)
//   work-window-neon    openverse id 6298ce35 (flickr 51708636449)
//   work-dimensional    openverse id 0fd1125e (flickr 15114681664)
// Swap each entry's src for a real install photo when Samuel provides them.
interface WorkItem {
  src: string
  alt: string
  title: string
  chips: string
  tall?: boolean
  wide?: boolean
}

const WORKS: WorkItem[] = [
  {
    src: 'work/work-neon-letters.jpg',
    alt: 'Close-up of orange neon channel lettering glowing at night',
    title: 'NEON LETTERING',
    chips: 'GLASS TUBE · 12MM · AMBER',
    wide: true,
  },
  {
    src: 'work/work-window-neon.jpg',
    alt: 'Colourful neon signs glowing in a shop window at night',
    title: 'WINDOW NEON',
    chips: 'CUSTOM BENT · MULTI-COLOUR',
    tall: true,
  },
  {
    src: 'work/work-tube-script.jpg',
    alt: 'Amber neon script lettering mounted on a dark fascia',
    title: 'TUBE SCRIPT',
    chips: 'GLASS TUBE · FASCIA MOUNT',
  },
  {
    src: 'work/work-fascia.jpg',
    alt: 'Hand-painted gilded lettering on a traditional shop fascia board',
    title: 'PAINTED FASCIA',
    chips: 'ENAMEL · GOLD LEAF',
  },
  {
    src: 'work/work-facade.jpg',
    alt: 'Restaurant facade at night with warm illuminated channel letters',
    title: 'FULL FACADE',
    chips: 'CHANNEL LETTERS · WARM WHITE',
    wide: true,
  },
  {
    src: 'work/work-dimensional.jpg',
    alt: 'Cast dimensional letters on a neon-bordered panel, black and white',
    title: 'DIMENSIONAL LETTERS',
    chips: 'CAST METAL · HALO BORDER',
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
          A wall of finished jobs: lit, mounted and photographed on the street where they work.
        </p>
        <p className="mt-3 font-mono text-[10px] tracking-[0.2em] text-tungsten/80">
          PROTOTYPE IMAGERY — REFERENCE STYLES, TO BE REPLACED WITH SUCHITRA ARTS INSTALLS
        </p>
      </div>

      <div className="mx-6 mt-12 md:mx-12 md:mt-16 lg:mx-20">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {WORKS.map((w) => (
            <figure
              key={w.src}
              className={`wk-tile group relative overflow-hidden rounded-sm border border-steel/50 bg-charcoal ${
                w.tall ? 'sm:row-span-2' : ''
              } ${w.wide ? 'sm:col-span-2 lg:col-span-2' : ''}`}
            >
              <img
                src={w.src}
                alt={w.alt}
                loading="lazy"
                className={`wk-img w-full object-cover ${w.tall ? 'h-full min-h-[420px]' : 'h-64 md:h-72'}`}
              />
              <figcaption className="flex items-baseline justify-between gap-4 border-t border-steel/50 px-4 py-3">
                <span className="font-display text-lg font-extrabold tracking-wide text-bone">
                  {w.title}
                </span>
                <span className="text-right font-mono text-[9px] tracking-[0.18em] text-putty/70">
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
