import { useEffect, useState } from 'react'
import MagneticButton from './MagneticButton'

const LINKS = [
  { href: '#work', label: 'WHAT WE MAKE' },
  { href: '#process', label: 'PROCESS' },
  { href: '#gallery', label: 'THE WORK' },
  { href: '#about', label: 'ABOUT' },
]

export default function Nav({ visible }: { visible: boolean }) {
  const [open, setOpen] = useState(false)
  const [solid, setSolid] = useState(false)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    // Past the hero, section content (huge Process numerals, Services titles)
    // scrolls up underneath the bar — a fade-to-transparent gradient lets it
    // collide with the logo. Go solid once anything below the hero reaches it.
    const target = document.getElementById('work')
    if (!target) return
    const update = () => setSolid(target.getBoundingClientRect().top < 90)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          solid
            ? 'border-b border-steel/50 bg-ink/90 backdrop-blur-md'
            : 'border-b border-transparent bg-gradient-to-b from-ink/80 to-transparent'
        } ${visible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-3 opacity-0'}`}
      >
        <nav className="flex items-center justify-between px-6 py-4 md:px-12 md:py-5">
          <a href="#" className="font-display text-2xl font-extrabold tracking-wide text-bone">
            SUCHITRA <span className="text-neon">ARTS</span>
          </a>
          <div className="flex items-center gap-5 md:gap-7">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="hidden font-mono text-[11px] tracking-[0.18em] text-putty transition-colors duration-200 hover:text-bone md:inline"
              >
                {l.label}
              </a>
            ))}
            <MagneticButton
              href="#contact"
              className="rounded-sm bg-neon px-4 py-2 text-sm font-semibold text-ink transition-colors duration-200 hover:bg-tungsten"
            >
              Get a quote
            </MagneticButton>
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
              className="flex h-9 w-9 cursor-pointer flex-col items-center justify-center gap-[5px] md:hidden"
            >
              <span className="block h-px w-5 bg-bone" />
              <span className="block h-px w-5 bg-bone" />
            </button>
          </div>
        </nav>
      </header>

      <div
        className={`fixed inset-0 z-[70] bg-ink transition-opacity duration-300 md:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <span className="font-display text-2xl font-extrabold tracking-wide text-bone">
            SUCHITRA <span className="text-neon">ARTS</span>
          </span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 cursor-pointer items-center justify-center font-mono text-lg text-putty"
          >
            ✕
          </button>
        </div>
        <nav className="flex flex-col gap-7 px-6 pt-14">
          {LINKS.map((l, i) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`font-display text-4xl font-extrabold text-bone transition-all duration-500 ${
                open ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}
              style={{ transitionDelay: open ? `${120 + i * 70}ms` : '0ms' }}
            >
              {l.label}
            </a>
          ))}
          <a
            href="#contact"
            onClick={() => setOpen(false)}
            className={`mt-4 inline-block w-fit rounded-sm bg-neon px-6 py-3 font-semibold text-ink transition-all duration-500 ${
              open ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
            style={{ transitionDelay: open ? '330ms' : '0ms' }}
          >
            Get a quote
          </a>
        </nav>
        <p className="absolute bottom-8 left-6 font-mono text-[10px] tracking-[0.2em] text-putty/60">
          FABRICATED IN BTM LAYOUT, BENGALURU
        </p>
      </div>
    </>
  )
}
