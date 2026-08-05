---
name: Multiplexer
description: An LLM routing gateway told as a warm, animated product story.
colors:
  bg: "#141019"
  bg-2: "#181320"
  surface: "#1E1727"
  surface-2: "#261E32"
  surface-3: "#30273D"
  border: "#352B44"
  border-soft: "#2A2235"
  ink: "#F6F0FA"
  ink-2: "#C3B7D2"
  ink-3: "#948AA6"
  ink-4: "#6E6483"
  coral: "#FF7A6B"
  rose: "#FF6E9C"
  mint: "#3FE0A0"
  amber: "#FFC24B"
  sky: "#5CC8FF"
  violet: "#A78BFA"
  danger: "#FF5C6A"
typography:
  display:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(3.5rem, 9vw, 6rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 3vw, 2rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  small:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  eyebrow:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.16em"
  data:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "normal"
rounded:
  soft: "12px"
  card: "18px"
  xl2: "24px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.coral}"
    textColor: "#2a0f0b"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "24px"
  chip:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "20px"
    padding: "12px 12px"
---

# Design System: Multiplexer

## Overview

**Creative North Star: "The Warm Product Story"**

Multiplexer is technical infrastructure - a learned LLM routing gateway - dressed as a warm, welcoming product a first-time visitor understands in thirty seconds. The surface is a soft, deep plum-charcoal lit by coral and rose glow pools, populated by rounded, lifted cards and fluid motion. Nothing here is cold or intimidating: the goal is that a recruiter or engineer immediately grasps *what it is, what to do, and what's happening behind the scenes* - then feels invited to press Try the demo.

The narrative is choreographed. The visitor lands on a bold Bricolage Grotesque wordmark and a single clear promise, sends a prompt, and watches a seven-step pipeline animate what the gateway is doing. Then the answer arrives ChatGPT-style, followed by a cascade of explainer cards - the routing decision (with confidence and alternatives), cost saved, latency breakdown, cache status - and a living dashboard of provider distribution, a learning bandit, history, and a failover demo. Color is used with meaning: coral carries the brand and primary actions, mint means money saved and health, amber highlights, and each model owns a distinct hue.

This world deliberately rejects both the cold "infrastructure dashboard" and the blank "enter prompt" ChatGPT clone. **Confirmed anti-references:** no gradient text, no hard measurement grids, no dense monospace-everything, no glassmorphism as decoration.

**Key Characteristics:**
- Soft deep plum-charcoal ground with coral/rose glow pooling from the top.
- Rounded, lifted cards (18px radius) with soft warm shadows.
- Bricolage Grotesque display, Hanken Grotesk body, JetBrains Mono for figures.
- Motion everywhere, but purposeful: pipeline choreography, count-ups, bar growth, spring entrances.
- Color as signal: coral = brand/action, mint = savings/health, per-model hues.

## Colors

A warm dark palette: a plum-charcoal ground, cool-tinted neutrals, and a friendly accent family led by coral.

### Primary
- **Coral** (#FF7A6B): The brand and primary action - Send, Try the demo, the flagship model trace, wordmark accents, focus glows.

### Secondary
- **Rose** (#FF6E9C): Coral's companion in glow gradients and as a model hue.
- **Mint** (#3FE0A0): Money saved, cache hits, healthy/online states, positive deltas.
- **Amber** (#FFC24B): Highlights, cache-hit-rate metric, a model hue.
- **Danger** (#FF5C6A): Offline providers and failure states only.

### Tertiary (model hues)
- **Sky** (#5CC8FF), **Violet** (#A78BFA): Per-model trace colors alongside coral/rose/mint/amber, so each model is identifiable across chat, decision, distribution, and history.

### Neutral
- **BG Plum-Charcoal** (#141019): Page ground.
- **Surface / Surface-2 / Surface-3** (#1E1727 / #261E32 / #30273D): Card and inset layers.
- **Border / Border-soft** (#352B44 / #2A2235): Hairline edges and dividers.
- **Ink** (#F6F0FA) primary text · **Ink-2** (#C3B7D2) secondary · **Ink-3** (#948AA6) labels · **Ink-4** (#6E6483) captions/placeholders. All tinted warm, never flat gray.

### Named Rules
**The Meaningful-Color Rule.** Coral is action, mint is savings/health, danger is failure, and every other saturated hue identifies a specific model. A color on this surface always means something.

## Typography

**Display Font:** Bricolage Grotesque (with system-ui)
**Body Font:** Hanken Grotesk (with system-ui)
**Figure Font:** JetBrains Mono (with ui-monospace)

**Character:** Bricolage Grotesque brings warm, slightly quirky confidence to headings; Hanken Grotesk keeps body text friendly and highly legible; JetBrains Mono makes every number (cost, latency, confidence, share) precise and tabular.

### Hierarchy
- **Display** (Bricolage 800, clamp(3.5rem, 9vw, 6rem), tracking -0.035em): The hero wordmark.
- **Headline** (Bricolage 700, clamp(1.5rem, 3vw, 2rem)): Section leads and big metrics.
- **Title** (Bricolage 700, ~15px): Card headers, selected-model name.
- **Body** (Hanken 400, ~15px, lh 1.6): Prose, chat, descriptions.
- **Small / Caption** (Hanken, 13px / 12px): Secondary rows, helper text.
- **Eyebrow** (Hanken 600, 12px, tracking 0.16em, UPPERCASE): Card and section labels.
- **Data** (JetBrains Mono 500, tabular-nums, 11-28px): All numeric readouts.

### Named Rules
**The Tabular-Figures Rule.** Every number uses JetBrains Mono with tabular-nums so values line up and count-up animations don't jitter.

## Layout

A single centered column (`max-w-5xl`) of stacked sections with generous vertical rhythm. The hero is centered and airy; the prompt box sits just below it. Interaction unfolds in place: the pipeline animation, then the chat answer, then a full-width Routing Decision with Cost + Latency balanced beneath it, then the always-on dashboard (Live Metrics tiles, then two-column Provider Distribution + Bandit, then History + Failure Resilience). Grids collapse to a single column below `lg`; metric tiles go 2-up on mobile. Horizontal overflow is clipped at the body so the inspector drawer never widens the page.

## Elevation & Depth

Soft and lifted. Cards use a subtle inner top-highlight plus a large, soft, warm-black drop shadow, over a plum ground washed with coral/rose radial glows. Primary actions carry a colored glow (coral). **No glassmorphism as decoration**; the only blur is a functional scrim behind the inspector drawer.

### Shadow Vocabulary
- **card** (`0 1px 0 rgba(255,255,255,0.045) inset, 0 24px 60px -30px rgba(0,0,0,0.75)`): Default resting card depth.
- **lift** (`0 1px 0 rgba(255,255,255,0.06) inset, 0 32px 70px -28px rgba(0,0,0,0.85)`): Prompt box and inspector drawer.
- **glow-coral** (`0 0 50px -12px rgba(255,122,107,0.45)`) / **glow-mint**: Reserved for the primary action and celebratory states.

## Shapes

Soft and rounded. Cards 18px, larger containers 24px, insets 12px, and fully-round pills (999px) for chips, buttons, bars, and toggles. Borders are 1px in border/border-soft. Recurring motifs: pill chips, rounded progress/gauge bars, the circular confidence ring, and small colored dots identifying models.

## Components

### Buttons
- **Shape:** fully-round pill (999px), or 20px for the boxed Send.
- **Primary** (Send, Try the demo): coral fill, dark text (#2a0f0b), coral glow shadow, 12×24px padding.
- **Hover / Active:** `brightness(1.1)`; `whileTap` scale 0.94-0.95 via Framer Motion; disabled is opacity-40, no glow.

### Chips
- **Style:** surface-2 fill, 1px border-soft, pill radius, Hanken 12-13px; reason chips add a mint check and mint-tinted border.

### Cards
- **Corner Style:** 18px (`.card`).
- **Background:** surface at ~80% over the glow ground, with a light backdrop-blur.
- **Shadow:** `card` (see Elevation). **Border:** 1px border-soft.
- **Header:** a rounded-square accent-tinted icon tile + Bricolage title.

### Inputs
- **Style:** the prompt box is a 20px-radius surface panel with a soft coral gradient glow behind it that intensifies on focus; text in Hanken 15px.

### Signature Components
- **Pipeline** - a seven-step vertical stepper (Request received → … → Response received) that auto-advances and gates its final steps on the real response; steps complete with a spring-scaled mint check, and a cache hit celebrates and short-circuits.
- **Routing Decision** - selected model, an animated circular confidence ring, mint "why" reason chips, and an alternatives list with quality bars + $/$$/$$$ cost tiers.
- **Confidence Ring** - an SVG ring animating its stroke to the confidence value with a count-up center number.
- **Bandit Viz** - an exploration/exploitation split bar plus per-model traffic-share bars that re-animate as the numbers move.
- **Request Inspector** - a spring-in right drawer showing the full lifecycle: prompt → features → complexity → candidates → cache → provider → cost → answer.

## Do's and Don'ts

### Do:
- **Do** give color meaning (coral=action, mint=savings/health, danger=failure, other hues=models).
- **Do** render every number in JetBrains Mono with tabular-nums, and animate value changes with count-ups.
- **Do** keep motion purposeful - pipeline choreography, spring entrances, bar growth - and honor `prefers-reduced-motion`.
- **Do** keep the story legible: what it is, what to do, what's happening, within seconds.
- **Do** disclose the demo honestly - free-tier models, reference prices, simulated responses without a key.

### Don't:
- **Don't** use gradient text, hard measurement grids, glassmorphism decoration, or dense monospace-as-costume.
- **Don't** make the hero or key content depend on JS to be legible where it can be avoided; keep entrances short.
- **Don't** let a card's expression bury its number - the metric is the point.
- **Don't** use pure gray for text; tint neutrals warm toward the plum ground.
