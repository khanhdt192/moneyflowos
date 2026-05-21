# MoneyFlowOS — PWA & iOS UX Engineering Guidelines

## Purpose

This document defines the engineering rules and UX standards for all future PWA/mobile-related work in MoneyFlowOS.

Goal:
- Make MoneyFlowOS feel close to a native iOS app.
- Keep desktop SaaS density and workflow efficiency.
- Prevent regressions caused by random mobile fixes.
- Give Codex a stable implementation standard.

This document should be read before:
- any PWA task
- any mobile UX polish task
- any touch/safe-area/layout task
- any modal/sheet/sidebar work
- any form/input work

---

# Core Philosophy

MoneyFlowOS should:
- behave like an iOS app
- NOT visually clone Apple apps
- preserve the current fintech/workspace design language

Priority order:

1. Interaction quality
2. Touch comfort
3. Safe-area correctness
4. Keyboard/input behavior
5. Scroll behavior
6. Motion polish
7. Visual polish

Native-feeling interaction matters more than fancy animations.

---

# Global PWA Rules

## DO NOT

- Do not change business logic during UI polish PRs.
- Do not modify Supabase schema unless explicitly requested.
- Do not change finance calculations.
- Do not redesign desktop layouts in mobile-focused PRs.
- Do not add heavy animation libraries.
- Do not introduce random platform hacks without documenting them.

## ALWAYS

- Preserve desktop density using responsive classes.
- Test on iPhone PWA Home Screen mode.
- Prefer shared UI primitives.
- Keep PRs small and isolated.
- Use responsive overrides:
  - mobile-first
  - desktop preserved via `md:*`

---

# PWA Standards

## Manifest

Required:

```json
{
  "display": "standalone",
  "start_url": "/",
  "scope": "/"
}
```

Rules:
- Never leave debug params in `start_url`.
- PWA debug tools must be runtime-only.
- Theme colors must support light/dark mode.

---

# iOS Safe Area Standards

## Required CSS Variables

```css
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
}
```

## Apply Safe Area To

Must support safe area:
- mobile header
- mobile sidebar
- bottom sheets
- sticky CTA/footer
- floating buttons
- fullscreen dialogs
- install banners

---

# Input & Keyboard Standards

## iOS Zoom Prevention

Critical rule:

Mobile inputs must never render below 16px font-size.

Required:

```txt
text-base md:text-sm
```

Applies to:
- input
- textarea
- select
- searchable combobox
- inline editor
- modal forms

## Shared Primitive Rule

Prefer:

```txt
@/components/ui/input
@/components/ui/textarea
```

Avoid raw `<input>` unless necessary.

---

# Touch Target Standards

## Minimum Touch Size

All tappable controls:

```txt
>= 44px
```

## Recommended Button Sizes

### Default

```txt
h-11 md:h-9
```

### Small

```txt
h-10 md:h-8
```

### Icon

```txt
h-11 w-11 md:h-9 md:w-9
```

---

# Modal & Sheet Standards

## Mobile

Use:
- bottom sheet
- fullscreen sheet
- rounded top corners
- safe-area bottom padding

## Desktop

Use:
- centered modal
- preserved compact layout

---

# Scroll Standards

## Required

```css
-webkit-overflow-scrolling: touch;
overscroll-behavior: contain;
```

Applies to:
- sidebar
- sheet
- modal
- nested mobile scroll containers

---

# Motion Standards

## Recommended

### Tap feedback

```txt
active:scale-[0.98]
transition-transform duration-75
```

Avoid:
- large bounce
- spring exaggeration
- slow transitions

---

# Mobile Testing Checklist

Before merging any PWA/mobile PR:

```txt
[ ] No white gap near status bar
[ ] No Dynamic Island overlap
[ ] No home indicator overlap
[ ] No iOS input auto-zoom
[ ] Buttons easy to tap
[ ] Sidebar safe-area correct
[ ] Bottom sheet safe-area correct
[ ] Desktop layout preserved
[ ] npm run build passes
```

---

# Codex PR Strategy

Preferred:
- 1 UX issue
- 1 interaction family
- 1 component category

Avoid mega-PRs like:

```txt
Make PWA feel native
```

Instead split into:
- shell polish
- input polish
- modal polish
- touch polish
- motion polish
