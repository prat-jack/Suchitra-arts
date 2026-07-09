import { useState } from 'react'
import Hero from './hero/Hero'
import Nav from './Nav'
import Services from './sections/Services'
import Process from './sections/Process'
import Contact from './sections/Contact'

export default function App() {
  const [navVisible, setNavVisible] = useState(false)

  return (
    <main>
      <Nav visible={navVisible} />
      <Hero onNavChange={setNavVisible} />
      <Services />
      <Process />
      <section className="flex min-h-[60vh] flex-col items-center justify-center gap-6 bg-ink">
        <p className="font-mono text-[11px] tracking-[0.24em] text-putty">UP NEXT</p>
        <h2 className="font-display text-4xl font-bold text-steel md:text-6xl">THE WORK</h2>
        <p className="max-w-sm text-center text-sm leading-relaxed text-putty/60">
          A gallery of finished signs — this section is being built next.
        </p>
      </section>
      <Contact />
    </main>
  )
}
