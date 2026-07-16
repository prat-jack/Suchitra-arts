# Suchitra Arts — Website

Premium single-page marketing site for **Suchitra Arts**, a custom signage
manufacturer founded by Samuel, based in BTM Layout, Bengaluru. They design and
fabricate storefront signs, illuminated channel letters, 3D lettering and
custom installations.

The brief: an award-caliber (Awwwards/FWA-tier) site that looks and feels like
it cost ₹10L+ — every motion, spacing, typography and color decision
intentional, never templated. The centerpiece is a scroll-driven hero where
the brand sign is fabricated in front of the visitor and snaps from flat
letters into lit 3D channel letters.

**Live URL (once repo is public):** https://prat-jack.github.io/Suchitra-arts/

---

## Tech stack

| Layer      | Choice                                              | Why |
|------------|-----------------------------------------------------|-----|
| Build      | Vite 8 (rolldown) + TypeScript + React 19           | React shell for composability; strict TS |
| Styling    | Tailwind CSS v4 (CSS-first config in `index.css`)   | Design tokens as `@theme` variables |
| 3D         | Three.js r185, **plain** (not react-three-fiber)    | Full control of scene graph + render loop |
| Animation  | GSAP 3.15 + ScrollTrigger + ScrollToPlugin          | Scrubbed timelines pinned to scroll |
| Audio      | Hand-rolled WebAudio (`SoundKit.ts`)                | 100% procedural — zero audio assets |
| Deploy     | GitHub Actions → GitHub Pages                       | Self-enabling workflow, free hosting |

No other runtime dependencies. Bundle ≈ 269 KB gzip (mostly three.js).

---

## Design system — “The workshop after dark”

The whole site is Samuel's shop at night; **the sign is the only light
source**. Every color derives from real signage physics.

### Palette (Tailwind tokens in `src/index.css` + `src/hero/palette.ts`)

| Token    | Hex       | Role |
|----------|-----------|------|
| ink      | `#0E0C09` | Page background — warm near-black |
| charcoal | `#1C1712` | Panels, cards, workbench tone |
| steel    | `#332C24` | Borders, hairlines, metal returns |
| bone     | `#F4EDE0` | Primary text, painted sign backing |
| putty    | `#9A9182` | Secondary text (AA on ink) |
| neon     | `#FF5A1F` | Primary accent/CTA — actual neon-gas red-orange |
| tungsten | `#FFB443` | Hovers, work-lamp warmth |
| argon    | `#7FD6E8` | Rare cool counterpoint (≤5% usage) — argon tube blue |

### Type

- **Display:** Big Shoulders 700/800 (industrial signage DNA; also the 3D
  letters — extruded at runtime from `public/fonts/BigShoulders-ExtraBold.ttf`)
- **Body:** Archivo 400–600
- **Technical voice:** IBM Plex Mono — job-card captions, spec chips
  (`LED MODULES · ACRYLIC · WEATHERPROOF`), stage labels

### Recurring motifs

- **Job-card mono voice** — `01 — LAYOUT`, spec chips, `STEP 02 / 04`
- **Conduit** — a glowing wire that draws down section edges with scroll,
  junction nodes lighting per item; terminates at Contact in a pulsing node
- **Unlit → lit** — things rest as outlines/dark and *ignite* when reached
- **Easing vocabulary** — `power3.out` placements, `back.out` settles,
  `expo.inOut` reserved exclusively for the hero snap

---

## Page structure (all in `src/`)

```
App.tsx          Nav + Hero + Services + Process + (Work stub) + Contact + BackToTop
                 + delegated smooth-scroll for all #anchors + skip-to-content link
Nav.tsx          Fixed header; appears when the hero sign ignites (progress > 0.8).
                 Desktop links + mobile hamburger → solid-ink overlay menu
BackToTop.tsx    Fixed ↑ past the hero; 1.8s flight home (hero rewinds on the way)
MagneticButton.tsx  CTA that leans toward cursor + shine sweep
sections/
  Services.tsx   “What we make” sample board (see below)
  Process.tsx    “How we work” sticky job-card index
  Contact.tsx    WhatsApp-first conversion + footer  ← BIZ placeholder block here
hero/
  Hero.tsx       React shell: ScrollTrigger pin, HUD, sound wiring, loader, overlays
  SignScene.ts   The entire Three.js world + scrubbed timeline choreography
  SoundKit.ts    Procedural audio: lamp buzz, neon hum, winch, clunks, thunk, spark
  letters.ts     TextGeometry channel letters (LED emissiveMap, trim-cap bevels)
  palette.ts     Hex constants for the scene
```

### Hero — the scroll-driven build (~4200px pinned)

Storyboard on the scrubbed timeline (duration units = % of scroll):

| Range   | Beat |
|---------|------|
| load    | Work-lamp flicker (render-loop envelope, not a tween), pilot LED breathing red in the dark |
| 0–10    | Camera push on the empty wall; installer layout marks visible |
| 10–63   | Two rail trolleys hoist 12 letters in on cables — pendulum sway (top-pivot letters), descend, slack-bounce on seating, contact camera micro-shake |
| 64–72   | Inspection stillness; argon tube appears |
| 70.7–72 | Mains surge dip → breaker throws ITSELF, spark burst, lever glows, pilot LED goes green |
| 72–80   | Letters extrude flat→3D (`expo.inOut`), camera dolly, letter-by-letter neon warm-up flicker, bloom ramps |
| 79.5    | **State lock** — sets guarantee sign integrity for any scrub path |
| 80–100  | Rig strikes upward offscreen, camera settles, headline mask-reveal, CTA |
| idle    | Glow breathing, H-tube blink (~8s), cursor parallax + per-letter proximity glow, museum drift after 14s idle, floor reflection fades in |

Interactive: **click the breaker** to kill/relight the sign (raycast; sound
thunk; scroll re-entry restores timeline state). HUD: scramble-decode build
captions (`01 — LAYOUT … 04 — POWER ON`), `SKIP BUILD →`, sound toggle.

Rendering: ACES tonemapping, UnrealBloom (strength .3 / radius .22 /
threshold .75), film grain + vignette ShaderPass (ends with
`#include <colorspace_fragment>` — required, it’s the final pass), lamp
light-shaft cone, low-res Reflector floor mirror (idle only), flight shadow
blobs, plaster bump maps (canvas-generated), FPS governor (EMA < 45fps for 2s
→ drop pixelRatio → then disable bloom/reflection; downgrade-only).

Device paths in `Hero.tsx`:
- **Desktop:** pinned scrub (ScrollTrigger, scrub 1.1, anticipatePin, 4200px)
- **Mobile** (`pointer: coarse` + <1024px), default: same timeline as a ~6s
  autoplay cinematic — no pin, no scroll-jack; aspect-compensated FOV
  (`computeFov`)
- **Mobile, `?mobilescroll` flag** — EXPERIMENTAL, opt-in only: real
  ScrollTrigger pin tuned for touch (3200px, scrub 0.6) with
  `normalizeScroll(true)` + `config({ ignoreMobileResize: true })` for
  mobile pin reliability. Default mobile path is untouched by this — see
  `docs/mobile-scroll-experiment.md` for testing instructions and the
  rollback plan (tag: `stable-mobile-cinematic-2026-07-12`).
- **prefers-reduced-motion:** static finished frame, everything visible
- WebGL context loss → branded “POWER INTERRUPTED” overlay + tap-to-reload;
  auto-resume on restore

### Services — headings ARE the products

Each row's Big Shoulders title rests as an unlit outline and ignites via the
technology it names when scrolled into the reading band (IntersectionObserver
adds `.lit`):

1. **ILLUMINATED SIGNS** — per-letter tubes strike left→right (staggered
   `--i` delays)
2. **3D LETTERS** — letters pop flat→extruded one-by-one, then the word sways
   in perspective
3. **STOREFRONT SIGNAGE** — backlit fascia panel flickers on with uneven
   hotspots; an OPEN tag drops in and swings from a hook
4. **CUSTOM FABRICATION** — a glowing cutting spark travels the word, filling
   letters behind it (clip-path wipe over an outline base), argon underline
   draws after

Conduit line scrubs down the left edge; junction node lights per row.

### Process — sticky job-card

Left column pins a giant numeral (01–04) that swaps with a mask-rise as steps
cross the viewport midline. Active-step detection is a **scroll listener over
live `getBoundingClientRect`** (straddle test + nearest-block fallback), not
IO — IO fired late or skipped steps under mobile momentum scrolling
(invariant #7). Right column: Measure → Design & Proof → Fabricate →
Install & Light Up, each with an argon-tinted line icon and spec chip.
Cool-tinted where Services is warm. Numeral column works on mobile too
(76px column, 3.4rem numeral, sticky below the solid nav).

### The Work — gallery (id="gallery")

Uniform 16:10 grid (`sections/Work.tsx`) of six signage images with job-card
captions. Tiles rest dimmed/desaturated and light up in the reading band
(IO adds `.lit`) — same unlit→lit language as Services. **All six images are
our own concept renders** — fictional Indian marques (KANAKA & CO, MARIGOLD,
BASAVA SILKS, THE BAKEHOUSE, VEDA WELLNESS, CUBBON HOUSE) in the halo-lit
reverse-channel style of premium café/boutique signage, rendered by the
dev-only `StillSign` renderer (below). Files in `public/work/render-*.jpg`;
swap the `WORKS` array entries for real install photos when Samuel provides
them. A tungsten disclaimer line says "STUDIO CONCEPT RENDERS".
Tile `<img>`s are `aspect-[16/10]` to match the renders — fixed-height
`object-cover` would crop letter edges off the wide signs.

#### StillSign — dev-only concept-sign renderer

`src/hero/StillSign.ts`, mounted by `Hero.tsx` **only when
`import.meta.env.DEV && ?still=<id>`** (dynamic import — dead-code-eliminated
from prod; verify with `grep mountStill dist/assets/*.js`). Renders one
halo-lit sign to the hero canvas for screenshotting: procedural wall texture
(stone/plaster/brick/charcoal), letters via `buildStillRows` in `letters.ts`,
one RectAreaLight strip per row (the halo — point lights read as bead
hotspots), camera-side fill + downlight spot, auto-fit camera distance
computed from row span/fov/aspect with a per-config `fit` bias. Configs live
in the `STILLS` record (`?still=kanaka|marigold|basava|bakehouse|veda|cubbon`).
Fonts for it: `public/fonts/PlayfairDisplay-Bold.ttf`, `Poppins-SemiBold.ttf`
(fetched only in DEV). Capture at 1600×1000, save to
`public/work/render-<id>.jpg`.

### About — the workshop (id="about")

General (deliberately not Samuel-specific yet): "A WORKSHOP, NOT AN AGENCY"
headline, three paragraphs in the site voice, mono spec strip. Swap in the
real founder story when it exists.

### Contact — the conversion point

“LET'S PUT YOUR NAME IN LIGHTS” (second line breathes neon). WhatsApp deep
link + tap-to-call as primary actions; address/hours/email in mono voice; a
zero-backend form that composes a pre-filled WhatsApp message. Footer bar.
**All business details live in the `BIZ` const at the top of `Contact.tsx` —
one swap updates everything (they are placeholders right now).**

---

## Engineering invariants (learned the hard way — do not break)

1. **Scrubbed timelines:** never use `overwrite: 'auto'`; every `fromTo`
   gets `immediateRender: false`. Violation symptom: objects teleport to a
   later tween's `from` state.
2. **Single-writer principle:** anything both the timeline and runtime code
   touch goes through a proxy (`letter.glow`, `lampLevel`, `ambientLevel`,
   `argonGlow`) and `render()` is the only writer of the real property each
   frame. GSAP tweens only re-render when their local playhead *changes*, so
   completed tweens won't restore values someone else changed.
3. **State lock at 79.5:** timeline `set`s force final letter/cable/trolley
   state so any wild scrub path still ends with a whole sign.
4. **Interactive overrides must restore on exit:** the breaker toggle's
   runtime tweens are tracked in `toggleTweens`; `setIdle(false)` kills them
   AND writes the timeline end-state back (there are no timeline writers
   between ~82–97%).
5. **After creating the hero pin, call global `ScrollTrigger.refresh()`** —
   the pin adds ~4200px after async font load; instance `st.refresh()` leaves
   every other section's triggers positioned as if the pin didn't exist.
6. **`overflow-x` on body must be `clip`, never `hidden`** — hidden creates a
   scroll container that silently kills every `position: sticky` descendant.
7. **Visibility-by-scroll uses live geometry** (scroll listener or IO on the
   element itself). A sentinel IO can be skipped entirely by instant jumps.
8. **Custom final ShaderPass must end with `#include <colorspace_fragment>`**
   or the whole frame renders dark/oversaturated (linear written to sRGB).
9. **Bloom + emissive:** letters must cross the bloom threshold on their own
   emissive (≈1.6 with threshold .75); if they only cross with lamp light
   added, edge letters drop out of the glow.
10. **Reveal masks (`overflow: hidden` + rise)** clip glow halos and hanging
    tags — release `overflow` in `onComplete`.
11. **Hero cleanup kills only `heroSt`**, never `ScrollTrigger.getAll()`.
12. **three.js addons:** import from `three/addons/…`; TextGeometry uses
    `depth` (not `height`); UV coords on TextGeometry are raw glyph units —
    normalize per-letter for emissiveMaps.
13. **Pinned ScrollTrigger on mobile needs `normalizeScroll(true)` +
    `config({ ignoreMobileResize: true })`** or momentum scroll fights the
    pin and iOS's address-bar resize causes mid-scroll jumps (GSAP's own
    guidance). Both are opt-in per visitor, not global defaults — see
    `docs/mobile-scroll-experiment.md`.
14. **GitHub Pages' first deploy can't be automated by the workflow token**
    — `configure-pages`'s `enablement: true` still throws "Resource not
    accessible by integration" on a repo where Pages has never been
    configured. The one-time fix is manual: Settings → Pages → Source →
    GitHub Actions. After that, every push deploys with zero manual steps.

Dev debug handles (DEV builds only): `window.__heroTl`, `__heroScene`,
`__heroHud`. Force states in the console, e.g.
`__heroTl.progress(0.78); __heroScene.render(0.016)`.

---

## Deployment

**Live at https://prat-jack.github.io/Suchitra-arts/** (repo public, Pages
source set to GitHub Actions, deploy verified end-to-end 2026-07-12).

- `.github/workflows/deploy.yml` — on push to `main`: build with
  `GITHUB_PAGES=true` (sets Vite `base: '/Suchitra-arts/'`), upload → deploy.
  Every push to `main` redeploys automatically.
- Runtime asset paths use `import.meta.env.BASE_URL` (see TTF load in
  `SignScene.ts`).
- OG image (`public/og.jpg`, rendered from the live scene), favicon, JSON-LD
  LocalBusiness, `sitemap.xml`, `robots.txt` all reference the Pages URL —
  **TODO markers in `index.html` for the eventual custom domain.**

Local dev: `npm run dev` (launch config `.claude/launch.json`, port 5173).
Prod check: `npm run build && npx vite preview`.

---

## Progress log (milestones = commits)

| Commit    | Milestone |
|-----------|-----------|
| `bbf2c9f` | Full hero: scaffold, design system, cable-rig build sequence, snap, neon ignition, breaker interactivity, cursor parallax, HUD (captions/skip), procedural sound, filmic pass (grain/shaft/reflection/shadows/shake), nav-at-snap, branded loader, OG/favicon, mobile autoplay cinematic, FPS-safe fallbacks. Earlier iterations (cartoon workers → silhouettes → no humans + set dressing) were replaced after review — final: rig + ladder/bench/layout-marks, breaker throws itself. |
| `34fdcdf` | Services sample-board section + conduit motif; fixed breaker-toggle scroll-back corruption (state restore + 400-step scrub-symmetry verification) |
| `fb152fd` | Process sticky job-card section |
| `faa9423` | Contact (WhatsApp-first) + footer; reveal-mask glow fix |
| `d9405bc` | Production hardening: Pages workflow, preloads, JSON-LD, sitemap/robots, smooth-scroll anchors, a11y (skip link, canvas narration, focus rings), FPS governor; first-ever prod build verified |
| `a7350df` | Services headings made literal product demos (tubes/pop/fascia+OPEN tag/cutting spark) |
| `d133140` | Fixed all section triggers stale by pin height (global refresh) + body overflow killing sticky; lit/active detection moved to IO |
| `3214eb6` | Back-to-top button + mobile pack: hamburger menu, `h-svh` hero, WebGL context-loss recovery, sound toggle clearance |
| `8204c05` | README rewritten as full project context (this file) |
| `9ec4d0f` | Copy workshop doc: full-site copy in 3 voices + recommended cut (`docs/copy-workshop.md`) |
| `8577e3b` | **Site went live.** Repo made public; GitHub Pages source manually set to "GitHub Actions" (the workflow's automated `configure-pages` step can't create a Pages site on its own — see invariant #14); deploy verified end-to-end on the real URL |
| `0c0d756` | Mobile scroll-driven hero experiment, opt-in via `?mobilescroll` — see `docs/mobile-scroll-experiment.md`. Safety tag: `stable-mobile-cinematic-2026-07-12` |
| `e4a61aa` | Work gallery (CC0 prototype imagery), general About section, nav goes solid past the hero (fixes huge content colliding with the transparent header), Process sticky numeral now also on mobile |
| *(pending)* | Gallery replaced with six self-rendered halo-lit concept signs (dev-only `StillSign` renderer, `?still=<id>`) after user found the CC0 photos weak; Process active-step detection moved from IO to a scroll listener (IO lagged/skipped under mobile momentum scrolling) |

## Open items

- [ ] Decide whether the mobile scroll experiment (`?mobilescroll`) becomes
      the new default, stays opt-in, or gets reverted — needs real-phone
      testing on iOS Safari + Android Chrome (see the doc's open questions)
- [ ] Swap `BIZ` placeholders in `Contact.tsx` + phone in `index.html` JSON-LD
- [ ] **The Work**: replace the six concept renders in `public/work/` with
      real install photos (edit the `WORKS` array in `sections/Work.tsx`)
- [ ] **About**: replace the general copy with Samuel's real story + photos
- [ ] Copy pass in Samuel's voice (all current copy is placeholder; the copy
      workshop doc has a recommended cut ready to apply)
- [ ] Custom domain → update absolute URLs (`index.html`, sitemap, robots)
- [ ] Declined for now: idle moths, letter-hover flicker, dying-sign easter egg
