import { useRef, type ReactNode, type MouseEvent } from 'react'
import gsap from 'gsap'

/** CTA anchor that leans toward the cursor and springs back on leave. */
export default function MagneticButton({
  href,
  className = '',
  children,
}: {
  href: string
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLAnchorElement>(null)

  const onMove = (e: MouseEvent) => {
    const el = ref.current
    if (!el || !window.matchMedia('(pointer: fine)').matches) return
    const r = el.getBoundingClientRect()
    gsap.to(el, {
      x: (e.clientX - (r.left + r.width / 2)) * 0.28,
      y: (e.clientY - (r.top + r.height / 2)) * 0.38,
      duration: 0.4,
      ease: 'power3.out',
    })
  }

  const onLeave = () => {
    if (ref.current) gsap.to(ref.current, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.45)' })
  }

  return (
    <a
      ref={ref}
      href={href}
      className={`magnetic-shine inline-block ${className}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </a>
  )
}
