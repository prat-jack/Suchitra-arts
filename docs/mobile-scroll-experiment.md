# Mobile scroll-driven hero

**Status: PROMOTED TO DEFAULT (2026-07-17).** The client tested the
`?mobilescroll` trial on a real phone, approved it ("the mobile scroll
effect was working really well"), and asked for it as the main experience.
Scroll-driven is now what every mobile visitor gets; the old autoplay
cinematic remains as an escape hatch.

## The two mobile paths

The default mobile hero is now the same scroll-driven pin desktop uses,
tuned for touch (shorter pin distance, snappier scrub) and hardened per
GSAP's own mobile guidance:

- `ScrollTrigger.normalizeScroll(true)` — forces scroll onto the JS thread
  so pin updates stay in sync with paint, instead of fighting native
  momentum scrolling
- `ScrollTrigger.config({ ignoreMobileResize: true })` — stops iOS's
  address-bar show/hide from triggering a mid-scroll re-measure

The old ~6s autoplay cinematic is reachable via `?mobilecinematic`:

```
https://prat-jack.github.io/Suchitra-arts/?mobilecinematic
```

The legacy `?mobilescroll` flag is redundant (scroll is the default) and
simply ignored.

(There's also a `?forcemobile` flag for testing the mobile branches from a
desktop browser — but it only works in local dev builds; production builds
statically strip it, so it has zero effect on the live site.)

## Where the logic lives

All of it is in `src/hero/Hero.tsx`, in the branch selection inside the
main `useEffect`:

```
reducedMotion                → static lit frame
isMobile && mobileCinematic  → autoplay cinematic (?mobilecinematic)
everything else              → real ScrollTrigger pin
                               (desktop: 4200px / scrub 1.1)
                               (mobile:  3200px / scrub 0.6 — DEFAULT)
```

Related mobile-framing detail: on narrow/portrait viewports `SignScene`
applies a screen-space `setViewOffset` lift so the sign's bottom row clears
the headline block (client screenshot showed "ARTS" touching the headline).

## Rollback plan

A tag marks the last commit before the scroll experiment started:

```
stable-mobile-cinematic-2026-07-12
```

It's pushed to `origin`, not just local — recoverable even from a fresh
clone. If scroll-by-default needs to be undone, the one-line soft revert is
to flip the branch condition in `Hero.tsx` back to opt-in:

```ts
// current (scroll default):
const mobileCinematic = isMobileEarly && params.has('mobilecinematic')
// revert to cinematic default: make the cinematic branch the fallback
// by changing `isMobile && mobileCinematic` to `isMobile && !params.has('mobilescroll')`
```

The full non-destructive git revert also still works:

```bash
git revert --no-commit stable-mobile-cinematic-2026-07-12..HEAD -- src/hero/Hero.tsx
git commit -m "Revert mobile scroll-driven hero"
git push origin main
```

## Watch-list on real hardware

- No jank or jump when the pin engages/releases; no address-bar fighting.
- Whether 3200px stays the right pin distance for a phone swipe.
- Whether `normalizeScroll` causes friction with normal page scrolling for
  the rest of the session (it stays active after the hero).
- iOS Safari vs Android Chrome divergence on address-bar/viewport behavior.
