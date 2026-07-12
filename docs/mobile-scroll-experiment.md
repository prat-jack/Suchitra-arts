# Mobile scroll-driven hero — experiment

**Status: experimental, opt-in only. Default mobile behavior is unchanged.**

## What this is

The default mobile hero (built earlier) plays the whole sign-building
sequence as a ~6s autoplay animation with no scroll pin, because pinned
scroll is unreliable on phone browsers — momentum scroll fights the pin,
and iOS's collapsing address bar shifts viewport geometry mid-scroll.

This experiment tries the real thing anyway: the same scroll-driven pin
desktop uses, tuned for touch (shorter pin distance, snappier scrub) and
hardened per GSAP's own mobile guidance:

- `ScrollTrigger.normalizeScroll(true)` — forces scroll onto the JS thread
  so pin updates stay in sync with paint, instead of fighting native
  momentum scrolling
- `ScrollTrigger.config({ ignoreMobileResize: true })` — stops iOS's
  address-bar show/hide from triggering a mid-scroll re-measure

Both only activate when the experiment is active — they are global GSAP
settings, but the code path that calls them only runs for opted-in mobile
visitors, so no other visitor's scroll behavior is touched.

## How to test it

Append `?mobilescroll` to the live URL on an actual phone:

```
https://prat-jack.github.io/Suchitra-arts/?mobilescroll
```

Without the flag, mobile visitors get the exact same autoplay cinematic as
before — nothing about the default experience changed.

(There's also a `?forcemobile` flag for testing the mobile branch from a
desktop browser — but it only works in local dev builds; production builds
statically strip it, so it has zero effect on the live site.)

## Where the logic lives

All of it is in `src/hero/Hero.tsx`, in the branch selection inside the
main `useEffect`:

```
reducedMotion              → static lit frame (unchanged)
isMobile && !mobileScrollFlag → autoplay cinematic (unchanged — default)
everything else             → real ScrollTrigger pin
                               (desktop: 4200px / scrub 1.1 — unchanged)
                               (mobile+flag: 3200px / scrub 0.6 — NEW)
```

## Rollback plan

A tag marks the last commit before this experiment started:

```
stable-mobile-cinematic-2026-07-12
```

It's pushed to `origin`, not just local — recoverable even from a fresh
clone. If the experiment needs to be undone:

```bash
git revert --no-commit stable-mobile-cinematic-2026-07-12..HEAD -- src/hero/Hero.tsx
git commit -m "Revert mobile scroll-driven hero experiment"
git push origin main
```

This creates a new commit that undoes the change (non-destructive — no
history is rewritten, no force-push). Since the experiment is entirely
opt-in via URL flag, a simpler "soft revert" also works if the code should
stay in place for later but be fully inert: delete this file and remove the
`mobileScrollFlag` line in `Hero.tsx` so the flag can never be true.

## Open questions to resolve before promoting this to default

- Does it actually feel good on real hardware — no jank, no jump when the
  pin engages/releases, no address-bar fighting?
- Is 3200px the right pin distance for a phone swipe, or should it be
  shorter/longer?
- Does `normalizeScroll` cause any friction with normal (non-hero) page
  scrolling once it's active for the rest of the session?
- Test on both iOS Safari and Android Chrome — they diverge most on exactly
  the address-bar/viewport behavior this experiment is trying to tame.
