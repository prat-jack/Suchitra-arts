import { useEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

gsap.registerPlugin(ScrollToPlugin)

/** Appears once the reader is past the hero; flies back to the top. */
export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const target = document.getElementById('work')
    if (!target) return
    // Scroll-position check, not IntersectionObserver: instant jumps
    // (reduced-motion anchors) can skip right past a sentinel without
    // ever intersecting it
    const update = () => {
      setVisible(target.getBoundingClientRect().top < window.innerHeight * 0.6)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  const toTop = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo(0, 0)
    } else {
      gsap.to(window, { scrollTo: 0, duration: 1.8, ease: 'power2.inOut' })
    }
  }

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      className={`fixed bottom-6 right-6 z-40 flex h-11 w-11 cursor-pointer items-center justify-center rounded-sm border border-steel bg-charcoal/85 font-mono text-base text-putty backdrop-blur-sm transition-all duration-300 hover:border-tungsten hover:text-tungsten md:bottom-8 md:right-8 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      ↑
    </button>
  )
}
