# Design-Skill Compliance Pass — Design Spec

**Date:** 2026-07-17
**Mode:** Redesign – Preserve (taste-skill §11). The site is shipped, client-reviewed, and has a
named brand system ("workshop after dark", industrial job-card language). This pass fixes
measurable defects found by auditing against three installed skills (impeccable, design-taste-frontend,
emil-design-eng) without touching voice, IA, layout, palette, or signature interactions.

**Design read (taste-skill §0.B):** Local-business brand site for a Bengaluru signage workshop's
customers, workshop-after-dark cinematic language, custom Three.js/GSAP + Tailwind v4,
Redesign-Preserve mode. Dials: VARIANCE 8 / MOTION 8 / DENSITY 3 (read from existing site).

## Approaches considered

1. **Full re-skin against every skill rule** (rewrite copy to kill em-dashes/kickers, replace scroll
   listeners with IO, re-architect sections). Rejected: violates Redesign-Preserve, reintroduces
   user-reported bugs (IO skipping), churns client-approved voice.
2. **Fix only the machine-detected finding** (one bounce easing). Rejected: leaves real WCAG
   failures (contrast, touch targets, placeholder-as-label) in place.
3. **Targeted compliance pass (chosen):** fix everything that is measurable and user-harming
   (contrast, touch targets, form labels, easing, hover gating, reduced-motion gaps, press
   feedback, transition specificity), document deliberate deviations with rationale.

## In scope (findings → fixes)

| # | Sev | Finding | Fix |
|---|-----|---------|-----|
| 1 | P1 | `text-putty/50–/70` small text ≈ 2.4–3.6:1 contrast on ink (AA needs 4.5:1) across Nav, About, Contact, Process, Work, Services | Raise to `text-putty` (6.3:1). Contact `dl` keeps hierarchy: `dt` putty, `dd` bone. Placeholders `/50` → `/85` (4.9:1) |
| 2 | P1 | Contact form uses placeholder-as-label (taste §4.6 ban; a11y) | Visible mono `<label>` above each field, `htmlFor`/`id` wired; placeholders stay as examples |
| 3 | P1 | Hamburger + close buttons 36×36px; hero SKIP/SOUND text buttons ~14px tall (WCAG 44px target) | Buttons → `h-11 w-11`; text buttons get `p-3 -m-3` hit-area expansion (visual position unchanged) |
| 4 | P1 | `svc-pop` uses back-overshoot `cubic-bezier(0.34,1.56,0.64,1)` (all three skills ban bounce/elastic on UI; detector hit) | Strong ease-out quint `cubic-bezier(0.22,1,0.36,1)` — already the site's ease vocabulary |
| 5 | P2 | No `:active` press feedback on any pressable (emil: buttons must feel responsive) | `.press` utility using the independent `scale` property (no clash with GSAP/Tailwind transforms): `scale: 0.97`, 140ms strong ease-out; applied to all buttons/CTAs; disabled under reduced motion |
| 6 | P2 | `transition-all` on Nav header, overlay links, overlay CTA, BackToTop (emil: specify properties) | Explicit property lists per element |
| 7 | P2 | `.magnetic-shine:hover` not gated for touch; runs under reduced motion | Wrap in `@media (hover:hover)`; disable sweep under `prefers-reduced-motion` |
| 8 | P2 | `.loader-s` neon-flicker missing reduced-motion disable | Add to reduce block |
| 9 | P2 | Process scroll handler measures 4 rects per scroll event uncoalesced | rAF-coalesce (semantics unchanged; invariant #7 stands) |
| 10 | P3 | Work gallery chips `text-[9px]` below practical legibility | `text-[10px]`, matching every other chip |

## Deliberate deviations (documented, not fixed)

- **Em-dashes and mono uppercase kickers on every section:** the site's named brand system
  (industrial job-card/spec-plate language tied to the hero HUD), client-approved. Both skills
  allow a deliberate, named system; Redesign-Preserve forbids silent copy rewrites.
- **Numbered Process section (01–04):** impeccable explicitly permits numbering for a real sequence.
- **`window.addEventListener('scroll')` in Nav/Process/BackToTop:** taste-skill bans it, but IO
  demonstrably failed here (user-reported: numeral lag/skips under mobile momentum scroll;
  jump-skipped sentinels) — README invariant #7. Listeners are passive and now rAF-coalesced.
- **MagneticButton elastic return:** deliberate decorative pointer-physics (emil endorses springs
  for decorative mouse-tracking); not a UI state transition.
- **Single locked dark theme:** compliant with taste-skill §4.11 Page Theme Lock; dark IS the brand
  ("signs are judged after dark").
- **Playfair Display in gallery renders:** reflex-reject list applies to UI type; these are
  in-image art direction for fictional marques, not site typography.
- **952KB single bundle (three.js):** hero is the product's centerpiece; branded loader masks
  fetch. Code-splitting noted as a future open item, not this pass.

## Success criteria

- Every visible text ≥ 4.5:1 against its background (spot-verified via computed styles).
- All interactive targets ≥ 44×44px effective hit area (verified via getBoundingClientRect).
- Form fields have programmatic and visible labels.
- Detector (`impeccable/scripts/detect.mjs`) reports zero findings on src.
- No visual regression at 1600×1000 and 390×844 (screenshot review of every section).
- `tsc` clean, prod build clean, deploy hash verified live.
