import { useEffect, useRef, useState, type FormEvent } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import MagneticButton from '../MagneticButton'

gsap.registerPlugin(ScrollTrigger)

// ─── REPLACE WITH REAL BUSINESS DETAILS ─────────────────────────────────────
// Everything customer-facing lives here; swap once and the whole section,
// including the WhatsApp deep links, updates.
const BIZ = {
  whatsapp: '919900000000', // country code + number, digits only — PLACEHOLDER
  phone: '+91 99000 00000', // PLACEHOLDER
  email: 'hello@suchitraarts.in', // PLACEHOLDER
  address: 'BTM Layout 2nd Stage, Bengaluru 560076', // PLACEHOLDER
  hours: 'MON–SAT · 9:30–19:30',
  mapsUrl: 'https://maps.google.com/?q=Suchitra+Arts+BTM+Layout+Bengaluru', // PLACEHOLDER
}
// ────────────────────────────────────────────────────────────────────────────

export default function Contact() {
  const rootRef = useRef<HTMLElement>(null)
  const [form, setForm] = useState({ name: '', phone: '', message: '' })

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = gsap.context(() => {
      if (reducedMotion) {
        gsap.set('.ct-mask > *', { yPercent: 0 })
        gsap.set('.ct-mask', { overflow: 'visible' })
        gsap.set('.ct-reveal', { clearProps: 'all' })
        return
      }
      gsap.utils.toArray<HTMLElement>('.ct-mask > *').forEach((el, i) => {
        gsap.fromTo(
          el,
          { yPercent: 112 },
          {
            yPercent: 0,
            duration: 0.9,
            delay: i * 0.12,
            ease: 'power3.out',
            scrollTrigger: { trigger: rootRef.current, start: 'top 70%' },
            // The mask clips the neon text-shadow once revealed — release it
            onComplete: () => {
              if (el.parentElement) el.parentElement.style.overflow = 'visible'
            },
          },
        )
      })
      gsap.fromTo(
        '.ct-reveal',
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          delay: 0.25,
          ease: 'power2.out',
          scrollTrigger: { trigger: rootRef.current, start: 'top 70%' },
        },
      )
      gsap.fromTo(
        '.ct-conduit',
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: rootRef.current,
            start: 'top 90%',
            end: 'top 30%',
            scrub: 1,
          },
        },
      )
    }, rootRef)
    return () => ctx.revert()
  }, [])

  const waText = (custom?: string) =>
    encodeURIComponent(
      custom ??
        'Hi Suchitra Arts — I’m interested in a sign. Can we talk?',
    )

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const lines = [
      'Hi Suchitra Arts — I’d like a quote.',
      form.name && `Name: ${form.name}`,
      form.phone && `Phone: ${form.phone}`,
      form.message && `About the job: ${form.message}`,
    ].filter(Boolean)
    window.open(`https://wa.me/${BIZ.whatsapp}?text=${waText(lines.join('\n'))}`, '_blank')
  }

  const inputCls =
    'w-full rounded-sm border border-steel bg-charcoal px-4 py-3 text-sm text-bone placeholder:text-putty/50 outline-none transition-colors duration-200 focus:border-tungsten'

  return (
    <section ref={rootRef} id="contact" className="relative overflow-hidden bg-ink pt-28 md:pt-40">
      <div
        aria-hidden
        className="ct-conduit absolute left-6 top-0 hidden h-24 w-px origin-top bg-neon/60 md:left-12 md:block lg:left-20"
        style={{ boxShadow: '0 0 10px rgba(255,90,31,0.45)' }}
      />
      <span
        aria-hidden
        className="ct-node absolute left-6 top-24 hidden h-3 w-3 -translate-x-1/2 rounded-full bg-neon md:left-12 md:block lg:left-20"
      />

      <div className="px-6 md:px-12 lg:px-20">
        <p className="font-mono text-[11px] tracking-[0.24em] text-putty">
          GET IN TOUCH — THE WORKSHOP IS OPEN
        </p>
        <h2 className="mt-6 font-display text-[clamp(3rem,8vw,7.5rem)] font-extrabold leading-[0.95] text-bone">
          <span className="ct-mask block overflow-hidden pb-[0.06em]">
            <span className="block will-change-transform">LET’S PUT YOUR</span>
          </span>
          <span className="ct-mask block overflow-hidden pb-[0.08em]">
            <span className="ct-glow block will-change-transform text-neon">
              NAME IN LIGHTS
            </span>
          </span>
        </h2>

        <div className="mt-12 grid gap-16 md:mt-16 md:grid-cols-[minmax(0,1fr)_420px] md:gap-20">
          <div className="flex flex-col gap-10">
            <div className="ct-reveal flex flex-wrap items-center gap-5">
              <MagneticButton
                href={`https://wa.me/${BIZ.whatsapp}?text=${waText()}`}
                className="rounded-sm bg-neon px-7 py-4 font-semibold text-ink transition-colors duration-200 hover:bg-tungsten"
              >
                WhatsApp us
              </MagneticButton>
              <a
                href={`tel:${BIZ.phone.replace(/\s/g, '')}`}
                className="rounded-sm border border-steel px-7 py-4 font-semibold text-bone transition-colors duration-200 hover:border-tungsten hover:text-tungsten"
              >
                Call {BIZ.phone}
              </a>
            </div>

            <dl className="ct-reveal grid max-w-md gap-6 font-mono text-[11px] tracking-[0.18em]">
              <div>
                <dt className="text-putty/60">WORKSHOP</dt>
                <dd className="mt-1 text-putty">
                  {BIZ.address.toUpperCase()}{' '}
                  <a
                    href={BIZ.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-tungsten transition-colors duration-200 hover:text-bone"
                  >
                    — OPEN IN MAPS →
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-putty/60">HOURS</dt>
                <dd className="mt-1 text-putty">{BIZ.hours}</dd>
              </div>
              <div>
                <dt className="text-putty/60">EMAIL</dt>
                <dd className="mt-1">
                  <a
                    href={`mailto:${BIZ.email}`}
                    className="text-putty transition-colors duration-200 hover:text-bone"
                  >
                    {BIZ.email.toUpperCase()}
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          <form onSubmit={onSubmit} className="ct-reveal flex flex-col gap-4">
            <p className="font-mono text-[11px] tracking-[0.24em] text-putty">
              OR SEND US YOUR WALL
            </p>
            <input
              className={inputCls}
              placeholder="Your name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              aria-label="Your name"
            />
            <input
              className={inputCls}
              placeholder="Phone number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              aria-label="Phone number"
            />
            <textarea
              className={`${inputCls} min-h-28 resize-y`}
              placeholder="What are we building? Shop name, rough size, where it's going…"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              aria-label="About the job"
            />
            <button
              type="submit"
              className="cursor-pointer rounded-sm border border-tungsten px-6 py-3 text-sm font-semibold text-tungsten transition-colors duration-200 hover:bg-tungsten hover:text-ink"
            >
              Send via WhatsApp →
            </button>
            <p className="text-xs leading-relaxed text-putty/50">
              Opens WhatsApp with your details pre-filled — nothing is stored on this site.
            </p>
          </form>
        </div>
      </div>

      <footer className="mt-24 border-t border-steel/60 px-6 py-8 md:mt-32 md:px-12 lg:px-20">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <p className="font-display text-lg font-extrabold tracking-wide text-bone">
            SUCHITRA <span className="text-neon">ARTS</span>
          </p>
          <p className="font-mono text-[10px] tracking-[0.2em] text-putty/60">
            FABRICATED IN BTM LAYOUT, BENGALURU — BUILT TO GLOW
          </p>
          <p className="font-mono text-[10px] tracking-[0.2em] text-putty/60">
            © {new Date().getFullYear()} SUCHITRA ARTS
          </p>
        </div>
      </footer>
    </section>
  )
}
