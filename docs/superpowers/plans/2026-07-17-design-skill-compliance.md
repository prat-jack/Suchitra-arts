# Design-Skill Compliance Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every measurable defect found auditing the shipped Suchitra Arts site against the impeccable, design-taste-frontend, and emil-design-eng skills, without touching brand voice, IA, or signature interactions.

**Architecture:** CSS-token/utility-level fixes in `src/index.css` plus surgical className/JSX edits in six components. No new dependencies, no layout changes. Verification is browser-based (this repo has no unit-test infra and the changes are presentational: computed-style contrast checks, hit-area measurements, screenshots) — the TDD test cycle is replaced by a verify-in-browser cycle per task, which is the honest equivalent for class-string edits.

**Tech Stack:** Tailwind CSS v4 (CSS-first tokens), React 19, GSAP, Playwright MCP for verification.

## Global Constraints

- Mode: Redesign–Preserve. Do not change copy wording, section structure, palette tokens, fonts, or scroll-listener architecture (README invariant #7).
- `putty` on `ink` = 6.3:1, `putty/85` = 4.9:1, `putty/70` = 3.6:1 (fails AA). Small text must end ≥ 4.5:1.
- Press feedback uses the independent `scale` CSS property, never `transform` (GSAP and Tailwind own `transform` on these elements).
- All hover-only effects in raw CSS must be inside `@media (hover: hover)`.
- Dev server: `preview_start` name `suchitra-dev` (port 5173).

---

### Task 1: index.css — easing, press utility, hover gating, reduced-motion gaps

**Files:**
- Modify: `src/index.css:119` (svc-pop easing), `:474-496` (magnetic-shine), `:498-519` (loader-s), reduce blocks, new `.press` utility

**Interfaces:**
- Produces: `.press` class — later tasks add it to every pressable element.

- [ ] **Step 1: Replace back-overshoot easing**

`.svc-extrude.lit .svc-ltr`: `cubic-bezier(0.34, 1.56, 0.64, 1)` → `cubic-bezier(0.22, 1, 0.36, 1)`.

- [ ] **Step 2: Add press utility + gate magnetic shine + loader reduced-motion**

```css
/* Pressables: instant physical feedback. `scale` (not transform) so it
   composes with GSAP x/y and Tailwind translate utilities. */
.press { transition: scale 0.14s cubic-bezier(0.23, 1, 0.32, 1); }
.press:active { scale: 0.97; }
```

Wrap `.magnetic-shine:hover::after` rule in `@media (hover: hover)`. Add `.magnetic-shine::after { display: none }`, `.loader-s { animation: none }`, and `.press { transition: none } .press:active { scale: none }` to a `prefers-reduced-motion: reduce` block.

- [ ] **Step 3: Verify** — run `node <impeccable>/scripts/detect.mjs --json src index.html`; expect `[]`.

### Task 2: Contrast raise across six components

**Files:**
- Modify: `src/Nav.tsx:120`, `src/sections/About.tsx:86`, `src/sections/Contact.tsx:100,148,162,166,210,222,225`, `src/sections/Process.tsx:202`, `src/sections/Work.tsx:140`, `src/sections/Services.tsx:228`

**Interfaces:** none.

- [ ] **Step 1:** Replace every `text-putty/50`, `/60`, `/70` with `text-putty`. In Contact's `dl`, set `dd` values to `text-bone` (keeps label < value hierarchy). `placeholder:text-putty/50` → `placeholder:text-putty/85`. Work chip `text-[9px]` → `text-[10px]`.
- [ ] **Step 2: Verify** — `getComputedStyle` on a chip and a placeholder in the browser; recompute contrast ≥ 4.5.

### Task 3: Contact form labels

**Files:**
- Modify: `src/sections/Contact.tsx:179-203`

- [ ] **Step 1:** Add above each field a visible label in the site's mono voice, wire `htmlFor`/`id`, keep placeholders as examples, keep `aria-label` removed (label supersedes):

```tsx
<div className="flex flex-col gap-2">
  <label htmlFor="ct-name" className="font-mono text-[11px] tracking-[0.18em] text-putty">NAME</label>
  <input id="ct-name" className={inputCls} placeholder="e.g. Meera" … />
</div>
```

Same for `ct-phone` (label PHONE, placeholder "10-digit mobile") and `ct-job` (label ABOUT THE JOB, placeholder unchanged).

- [ ] **Step 2: Verify** — click each label in the browser; focus lands in its field.

### Task 4: Touch targets + press feedback on every pressable

**Files:**
- Modify: `src/Nav.tsx` (hamburger `h-9 w-9`→`h-11 w-11`, close same, `.press` on both + desktop CTA handled via MagneticButton + overlay CTA), `src/MagneticButton.tsx:36` (add `press` to base class), `src/hero/Hero.tsx:354-365,419-426,438-445` (skip/sound: add `p-3 -m-3 press`; reload: `press py-2.5`), `src/BackToTop.tsx:38` (add `press`), `src/sections/Contact.tsx` (call link + submit: add `press`)

- [ ] **Step 1:** Apply the class/size changes above.
- [ ] **Step 2: Verify** — `getBoundingClientRect()` on hamburger, close, skip, sound ≥ 44px both axes.

### Task 5: transition-all → explicit properties

**Files:**
- Modify: `src/Nav.tsx:37` → `transition-[opacity,transform,background-color,border-color,backdrop-filter]`; `:101,112` → `transition-[opacity,transform]`; `src/BackToTop.tsx:38` → `transition-[opacity,transform,border-color,color]`

- [ ] **Step 1:** Apply. **Step 2: Verify** — nav still fades/slides on scroll flip; back-to-top still fades in/out.

### Task 6: Process scroll handler rAF coalescing

**Files:**
- Modify: `src/sections/Process.tsx:129-146`

- [ ] **Step 1:**

```ts
let raf = 0
const onScroll = () => {
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    updateActive()
  })
}
window.addEventListener('scroll', onScroll, { passive: true })
// cleanup: cancelAnimationFrame(raf); removeEventListener('scroll', onScroll)
```

- [ ] **Step 2: Verify** — numeral still flips exactly at title-crossings at 390px (repeat the six-position check).

### Task 7: Full verification + ship

- [ ] `npx tsc -b --noEmit` clean; `GITHUB_PAGES=true npm run build` clean; detector `[]`.
- [ ] Screenshot every section at 1600×1000 and 390×844; compare against pre-change look (no visual regressions beyond intended contrast lift).
- [ ] Commit, push, poll live HTML for new bundle hash.
