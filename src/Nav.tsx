import MagneticButton from './MagneticButton'

export default function Nav({ visible }: { visible: boolean }) {
  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 bg-gradient-to-b from-ink/80 to-transparent transition-all duration-700 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-3 opacity-0'
      }`}
    >
      <nav className="flex items-center justify-between px-6 py-4 md:px-12 md:py-5">
        <a href="#" className="font-display text-2xl font-extrabold tracking-wide text-bone">
          SUCHITRA <span className="text-neon">ARTS</span>
        </a>
        <div className="flex items-center gap-7">
          <a
            href="#work"
            className="hidden font-mono text-[11px] tracking-[0.18em] text-putty transition-colors duration-200 hover:text-bone md:inline"
          >
            WHAT WE MAKE
          </a>
          <a
            href="#process"
            className="hidden font-mono text-[11px] tracking-[0.18em] text-putty transition-colors duration-200 hover:text-bone md:inline"
          >
            PROCESS
          </a>
          <a
            href="#about"
            className="hidden font-mono text-[11px] tracking-[0.18em] text-putty transition-colors duration-200 hover:text-bone md:inline"
          >
            ABOUT
          </a>
          <MagneticButton
            href="#contact"
            className="rounded-sm bg-neon px-4 py-2 text-sm font-semibold text-ink transition-colors duration-200 hover:bg-tungsten"
          >
            Get a quote
          </MagneticButton>
        </div>
      </nav>
    </header>
  )
}
