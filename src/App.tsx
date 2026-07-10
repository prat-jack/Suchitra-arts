import { useEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import Hero from './hero/Hero'
import Nav from './Nav'
import Services from './sections/Services'
import Process from './sections/Process'
import Contact from './sections/Contact'
import BackToTop from './BackToTop'

gsap.registerPlugin(ScrollToPlugin)

export default function App() {
  const [navVisible, setNavVisible] = useState(false)

  useEffect(() => {
    // One delegated handler gives every in-page anchor a smooth travel —
    // without it, nav clicks teleport thousands of pixels through the pinned hero
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest?.('a[href^="#"]')
      if (!anchor) return
      const id = anchor.getAttribute('href')!.slice(1)
      const target = id ? document.getElementById(id) : null
      if (!target) return
      e.preventDefault()
      const y = target.getBoundingClientRect().top + window.scrollY
      const distance = Math.abs(y - window.scrollY)
      const duration = gsap.utils.clamp(0.6, 1.8, distance / 4200)
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reducedMotion) window.scrollTo(0, y)
      else gsap.to(window, { scrollTo: y, duration, ease: 'power2.inOut' })
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  return (
    <main>
      <a
        href="#work"
        className="sr-only z-[60] rounded-sm bg-neon px-4 py-2 font-semibold text-ink focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
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
      <BackToTop />
    </main>
  )
}
