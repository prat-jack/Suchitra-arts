import { useState } from 'react'
import Hero from './hero/Hero'
import Nav from './Nav'

export default function App() {
  const [navVisible, setNavVisible] = useState(false)

  return (
    <main>
      <Nav visible={navVisible} />
      <Hero onNavChange={setNavVisible} />
      <section
        id="work"
        className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ink bg-[radial-gradient(720px_240px_at_50%_0%,rgba(255,90,31,0.08),transparent_70%)]"
      >
        <div id="contact" />
        <p className="font-mono text-[11px] tracking-[0.24em] text-putty">UP NEXT</p>
        <h2 className="font-display text-4xl font-bold text-steel md:text-6xl">WHAT WE MAKE</h2>
        <p className="max-w-sm text-center text-sm leading-relaxed text-putty/60">
          Illuminated signs, 3D letters, storefronts and custom fabrication — this section is
          being built next.
        </p>
      </section>
    </main>
  )
}
