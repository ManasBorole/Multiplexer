---
name: Multiplexer
description: A learned LLM router explained by its own cards - a tilted dashboard you can lift, a fly-through of one request, and the live results.
colors:
  bg: "#0D1015"
  bg-2: "#121821"
  card: "#161B23"
  card-2: "#1C232D"
  inset: "#0F1318"
  line: "#27303C"
  line-2: "#343F4E"
  ink: "#EDF1F6"
  dim: "#9AA5B4"
  mute: "#8591A2"
  acc: "#5B8CFF"
  good: "#34D399"
  warn: "#F5B94A"
  bad: "#F2605A"
  code: "#C9D3E0"
typography:
  display:
    fontFamily: "Archivo, Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "clamp(2.1rem, 3.9vw, 3.25rem)"
    fontWeight: 800
    lineHeight: 1.03
    letterSpacing: "-0.035em"
  section:
    fontFamily: "Archivo, Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "15.5px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  small:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  figure:
    fontFamily: "Spline Sans Mono, ui-monospace, monospace"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "normal"
  title-lg:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "normal"
  label:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  figure-sm:
    fontFamily: "Spline Sans Mono, ui-monospace, monospace"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  data:
    fontFamily: "Spline Sans Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
typeRamp: ["11px", "11.5px", "12px", "12.5px", "13px", "13.5px", "14px", "14.5px", "15px", "15.5px", "16px", "16.5px", "17px", "22px", "26px", "30px", "1.75rem"]
rounded:
  glyph: "2px"
  tag: "7px"
  control: "8px"
  row: "9px"
  button: "10px"
  input: "14px"
  surface: "16px"
  plane: "28px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.acc}"
    textColor: "{colors.bg}"
    rounded: "{rounded.button}"
    padding: "10px 16px"
  step-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "18px"
  panel:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "20px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "7px"
---

# Design System: Multiplexer

## Overview

**North star: the product explains itself with its own cards.** Every routing step is a plainly titled card with real numbers. The homepage shows those cards three ways, in scroll order:

1. **Assemble (hero).** All eight step cards lie on one tilted dashboard plane beside the prompt box. Hovering or focusing a card lifts it off the plane; selecting it jumps to that step. As the hero scrolls away the plane tilts further and recedes.
2. **Fly-through (story).** A sticky stage moves the camera forward through the eight cards along a lit route, one card in focus at a time, with the step list on the left. At the end the cards gather into a summary grid. The story uses the visitor's last request, or a sample labelled "Sample request".
3. **Results and session.** Flat, readable panels: the live pipeline, the answer, the routing decision, cost/latency/cache/judge, prompt signals, then session metrics, traffic, shadow A/B, providers and history, with the Request Inspector drawer.

The 3D is CSS 3D on real DOM, so every card stays sharp text, keyboard reachable and screen-reader readable. No WebGL, no 3D library.

**Deliberately unlike Christopher** (the owner's other product): Christopher is a light, warm, cool-paper world (teal, mustard, airmail red/blue), Bricolage Grotesque + Figtree + a handwritten face, pill buttons, a mascot, and a drifting cloud of tilted postcards. Multiplexer is a dark graphite control surface, Schibsted Grotesk + Spline Sans Mono, square-shouldered 8-16px radii, no character, and its 3D is ordered (a plane, a straight route, a grid), never a scattered cloud.

## Colors

Roughly 75% graphite neutrals, 20% text tones, 5% signal.

- **Ground** `bg` #0D1015, `bg-2` #121821 (radial lift behind hero and story).
- **Surfaces** `card` #161B23, `card-2` #1C232D (card top gradient), `inset` #0F1318 (tracks, inputs, code).
- **Lines** `line` #27303C, `line-2` #343F4E.
- **Text** `ink` #EDF1F6, `dim` #9AA5B4, `mute` #8591A2 (AA on `bg` and `card`).
- **Route blue** `acc` #5B8CFF: the chosen model, the focused card, the primary action, the lit route. One accent only.
- **State** `good` #34D399 (healthy, saved, hit), `warn` #F5B94A (miss, failover, simulated, learning), `bad` #F2605A (circuit open, errors). State colours never decorate.

Tokens live once as CSS variables in `app/globals.css`, mapped into Tailwind in `tailwind.config.ts`. Components use tokens, never raw hex. (`lib/models.ts` still carries per-model `color` values; the UI does not use them.)

## Typography

- **Archivo** (variable width, set at 112%) for headings only: the hero line, section titles and the wordmark (`.font-display`). Slightly wide and firm, it reads engineered, not friendly.
- **Schibsted Grotesk** for everything else written: a newspaper-grotesque with firm, slightly condensed caps that reads as engineered rather than friendly.
- **Spline Sans Mono** for figures only (scores, costs, latencies, step numbers), always `tabular-nums`, so numbers align and don't jitter as they change. It is not used for prose or labels.
- Ramp (px): 11 / 11.5 / 12 / 12.5 / 13 / 13.5 / 14 / 14.5 / 15 / 15.5 / 16 / 16.5 / 17 / 22 / 26 / 30, section heads 1.75rem, hero `clamp(2.1rem, 3.9vw, 3.25rem)` at 800 with -0.035em tracking. The half steps are for dense data rows (12.5, 13.5) and card titles (15.5).
- No uppercase eyebrows, no tracked labels, no accent-coloured words in headlines.

## Layout

- **Hero**: two columns on desktop (500px copy column + the plane), one column under 1000px with the plane below the controls. The prompt box, example prompts and the "What matters most?" objective controls (three sliders plus Balanced / Best quality / Cheapest / Fastest) are all in the first viewport.
- **Story**: 950vh scroll container with a sticky 100svh stage. Desktop: 400px step list left, scene right. Mobile: full-width scene, a caption bar with progress segments at the bottom.
- **Results/session**: max 1200px. Hierarchy comes from container type, not a card wall: a *step card* is an object you can pick up (gradient, shadow); a *panel* is a region (flat card fill); a *strip* is one object with several readings separated by hairlines (cost/latency/cache/judge; session metrics); tables carry the provider and history lists.

## Shapes

Radii by role: tier glyph squares 2px, tags 7px, controls 8px, list rows 9px, buttons 10px, prompt box 14px, cards and panels 16px, the hero plane 28px, pills only for chips and switches. Model identity uses **shape for tier plus the label**: triangle = flagship, square = mid, circle = efficient; the chosen model's shape turns route blue. Colour alone never identifies a model.

## Motion

Motion answers scroll position, user input or new data. Nothing loops.

| Trigger | What moves | Easing / duration |
|---|---|---|
| Hero scroll | plane tilts 54→72°, recedes 700px, fades | scroll-linked, rAF |
| Card hover/focus on plane | card lifts 46px on Z | `--ease` 350ms |
| Story scroll | camera Z through cards 1150px apart; cards ahead blur and fade; focused card squares up | scroll-linked with 0.14 smoothing |
| Story end | cards gather into a 4x2 grid | scroll-linked |
| New data | bars rescale (`transform: scaleX`), confidence ring stroke | `--ease` 500-600ms |
| Routing | pipeline steps advance; "Call model" holds until the real answer streams back | server-driven |
| Routing from the hero | plane cards light up in step with the real pipeline (running card lifts 70px and glows, done cards go green, skipped cards dim). The page never scrolls on its own: an outcome panel under the prompt ("Routed to X in 1.4s, 85% cheaper") offers Walk me through it (primary on the first prompt in a tab) or Jump to results (primary after that) | server-driven |
| Pointer over a story card | card tilts up to 4deg toward the pointer with a soft highlight (fine pointers only) | `--ease` 250ms |
| A figure changes | number glides from old to new value (`Num`) | ease-out cubic 500ms |
| Answer arrives | answer fades up 6px | `--ease` 400ms, once |
| Streaming | a static caret block follows the text and disappears when done | n/a |
| Inspector | drawer slides in | 300ms |

`--ease` is `cubic-bezier(0.2, 0.8, 0.2, 1)`. Under `prefers-reduced-motion` the story becomes a static stepped list (text + card per step), the plane stays still, and transitions collapse to instant.

## Components

- **StepCard** (`components/StepCard.tsx`): the unit of the whole page. Eight variants, one per step, driven by a `RequestRecord`. In the story the focused card is interactive; others are `inert`. Interactions are real: "Send it again to get a cache hit" re-sends the prompt; preset buttons re-route with those weights; switches take providers offline through `/api/provider`; the judge's reasoning expands.
- **Pipeline strip**: eight states (waiting, running, done, skipped, failed), announced through an `aria-live` status line.
- **Routing decision**: confidence ring, why this model, alternatives with $/$$/$$$ tiers, failover pill.
- **Strip**: several readings in one bordered object with hairline dividers.
- **Providers table**: health, breaker state from `/api/state` and the stream's final state, picks, quality, drift, price, and an online switch per model (the failover demo).
- **Num** (`components/Num.tsx`): figures that glide to new values; screen readers get the final value only.
- **Reward chart**: reward per routed request with a 5-request rolling average, endpoint labelled.
- **Placeholders**: `.skeleton` blocks shaped like the real panels show until the saved session is read, so nothing jumps; they never shimmer.
- **Provider status**: only an open circuit gets a coloured pill; healthy, recovering, recent failure and switched off are a quiet dot plus text.
- **Request Inspector**: `role="dialog"` drawer, Esc closes, focus returns to the row that opened it.

## Honesty rules (from PRODUCT.md)

- Before a visitor routes anything, the story uses `SAMPLE` in `components/routing.ts` and says "Sample request, illustrative numbers" wherever it appears.
- Answers without an API key are labelled "Simulated response".
- Prices are labelled reference prices; the roster is free-tier.
- The feature bars recompute the context vector with a display-only mirror of `featurize()` (routing never uses it); keep the two in sync.

## Do / Don't

- **Do** keep one accent and use state colours only for state.
- **Do** put numbers in Spline Sans Mono with tabular figures, and animate changes with transforms.
- **Do** keep every card's content as real DOM text.
- **Don't** add glow blobs, gradient text, glassmorphism, looping animations, uppercase eyebrows, or icon tiles on headers.
- **Don't** give every container the same card treatment; choose step card, panel, strip or table by role.
