<div align="center">

# Multiplexer

### A learned LLM routing gateway

Multiplexer sits in front of many LLM providers and **learns, in real time, which model to route each request to** - optimizing cost, latency, and quality together with a contextual multi-armed bandit. Not a config file. Not a fan-out compare tool. An adaptive routing system that shows its work.

<br />

<a href="https://multiplexer-routes.vercel.app/"><img alt="Live Demo" src="https://img.shields.io/badge/%20Live%20Demo-multiplexer--routes.vercel.app-FF7A6B?style=for-the-badge&labelColor=141019&logo=vercel&logoColor=white" /></a>

<br /><br />

<img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&labelColor=141019&logo=nextdotjs&logoColor=white" />
<img alt="React" src="https://img.shields.io/badge/React-19-149ECA?style=flat-square&labelColor=141019&logo=react&logoColor=white" />
<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&labelColor=141019&logo=typescript&logoColor=white" />
<img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-3.4-38BDF8?style=flat-square&labelColor=141019&logo=tailwindcss&logoColor=white" />
<img alt="Framer Motion" src="https://img.shields.io/badge/Framer_Motion-12-0055FF?style=flat-square&labelColor=141019&logo=framer&logoColor=white" />
<img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-3FE0A0?style=flat-square&labelColor=141019" />
<img alt="Status" src="https://img.shields.io/badge/status-active-FF7A6B?style=flat-square&labelColor=141019" />

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [API](#api)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

---

## Overview

Teams running LLM products face a bad trade: route everything to the most expensive model and overpay, or route everything to the cheapest and lose quality. Static routers ("use the big model for hard questions") never keep up with drifting traffic, provider outages, or changing task difficulty.

Multiplexer replaces that configuration with **online learning**. A [LinUCB](https://arxiv.org/abs/1003.0146) contextual bandit — one arm per model — scores each candidate from the request's features plus your objective weights, picks a model, observes the reward (cost, latency, quality), and updates. Every decision is inspectable: features, complexity, candidates, cache status, provider, cost, and the answer.

The homepage is the product: type a prompt, watch the seven-step routing pipeline animate, read the answer, then see the routing decision, cost saved, latency breakdown, cache status, and a live dashboard of provider distribution and bandit learning.

> **Demo honesty:** the model roster is real free-tier OpenRouter models (13 general text models, all $0 on the free tier). Reference prices are list rates kept only so "money saved" stays meaningful - actual spend is $0. Without an API key the responses are simulated and clearly labelled.

---

## Features

| | Feature | Description |
|---|---|---|
| 🎰 | **Contextual bandit routing** | LinUCB learns per-model reward online and picks the best model per request - no static rules |
| ⚖️ | **Joint objective** | Cost, latency, and quality optimized together; live sliders re-weight the objective and the policy moves |
| 🧠 | **Semantic cache** | Embedding + vector similarity short-circuits near-duplicate requests before any provider call |
| 🔌 | **Multi-provider gateway** | One integration in front of many hosted models via OpenRouter |
| 🛡️ | **Circuit breaker & failover** | Unhealthy providers trip open and traffic reroutes automatically |
| 🧪 | **Shadow A/B** | Compare the learned policy against static and random baselines on the same traffic |
| 🔍 | **Request Inspector** | Full lifecycle for a single request: prompt → features → complexity → candidates → cache → provider → cost → answer |
| 📊 | **Live observability** | Provider distribution, bandit exploration/exploitation split, per-request history, aggregate metrics |
| 👥 | **Per-tenant rate limits** | Token-bucket limiting per tenant |
| 🎬 | **Choreographed UI** | Seven-step pipeline animation, count-ups, spring entrances - purposeful motion, `prefers-reduced-motion` honored |

---

## How It Works

```
prompt
  │
  ▼
featurize ──► semantic cache ──(hit)──► cached answer
  │                  │
  │                (miss)
  ▼                  ▼
context vector ─► LinUCB scores each model ─► pick arm
                                               │
                              circuit breaker healthy? ──(no)──► failover
                                               │ yes
                                               ▼
                                    call provider (OpenRouter)
                                               │
                                judge quality + measure cost/latency
                                               │
                                     reward ─► update bandit arm
                                               │
                                               ▼
                                    answer + full decision trace
```

The context vector is `[bias, lengthNorm, code, question, reasoning, rare, wQuality, wCost, wLatency]` - the objective weights are part of the context, so the router responds to *what you're optimizing for*, not just the prompt. A discounted update (`γ<1`) lets the policy adapt to drift and provider health.

---

## Tech Stack

**Framework** · [Next.js 16](https://nextjs.org/) (App Router, serverless API routes) · [React 19](https://react.dev/)

**Language** · [TypeScript 5.5](https://www.typescriptlang.org/)

**Styling** · [Tailwind CSS 3.4](https://tailwindcss.com/) · PostCSS · Autoprefixer

**Animation** · [Framer Motion 12](https://www.framer.com/motion/)

**LLM providers** · [OpenRouter](https://openrouter.ai/) (single API over many models; free-tier roster)

**Routing core** · Custom LinUCB contextual bandit, semantic cache, and circuit breaker (no ML dependency)

**Tooling** · Puppeteer-core (screenshots) · Node `--experimental-strip-types` (self-check)

> Designed to run entirely on **reliable free tiers** — no paid dependency is required to run the demo.

---

## Installation

**Prerequisites:** Node.js 20+ and npm.

```bash
git clone https://github.com/ManasBorole/multiplexer.git
cd multiplexer
npm install
```

---

## Environment Variables

Create a `.env.local` in the project root:

```bash
# OpenRouter API key - enables real model calls.
# Get one free at https://openrouter.ai/keys
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | No | OpenRouter key for live model calls. **Omit it** and the gateway runs fully with simulated, clearly-labelled responses - routing, learning, cache, and viz all still work. |

`.env.local` is gitignored - never commit your key.

---

## Running Locally

```bash
npm run dev        # start dev server at http://localhost:3000
npm run build      # production build
npm run start      # serve the production build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```

Verify the routing behavior end-to-end (dev server must be running):

```bash
node verify.mjs                              # drives the API against the spec
node --experimental-strip-types selfcheck.mts   # unit-checks the bandit math
node capture.mjs                             # regenerate screenshots (Chrome required)
```

Open [http://localhost:3000](http://localhost:3000), type a prompt, and watch it route.

---

## API

All routes live under `app/api/` and run as Next.js serverless functions.

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/route` | Route one prompt; returns the answer and the full decision trace |
| `GET` | `/api/state` | Current aggregate state (models, bandit, metrics) |
| `GET` | `/api/metrics` | Metrics and per-model fleet stats |
| `POST` | `/api/provider` | Toggle a provider offline/online (drives the failover demo) |

---

## Project Structure

```
multiplexer/
├── app/
│   ├── api/
│   │   ├── route/route.ts       # POST — route a prompt
│   │   ├── state/route.ts       # GET  — aggregate state
│   │   ├── metrics/route.ts     # GET  — metrics + fleet stats
│   │   └── provider/route.ts    # POST — provider on/off
│   ├── layout.tsx               # root layout + fonts
│   ├── page.tsx                 # homepage → <App/>
│   └── globals.css              # Tailwind + design tokens
├── components/                  # UI: Hero, Pipeline, Chat, RoutingDecision,
│   │                            #     BanditViz, Inspector, dashboard cards…
│   ├── App.tsx                  # orchestrates the whole page
│   ├── motion.tsx               # shared Framer Motion presets
│   └── icons.tsx                # inline SVG icons
├── lib/
│   ├── types.ts                 # shared types
│   ├── models.ts                # free-model roster + prices
│   ├── bandit.ts                # LinUCB contextual bandit
│   ├── cache.ts                 # semantic cache
│   ├── policies.ts              # static / random baselines
│   ├── circuit.ts               # circuit breaker
│   ├── judge.ts                 # quality signal
│   ├── store.ts                 # bandit + history store
│   ├── engine.ts                # routing orchestration
│   ├── session.ts               # per-session helpers
│   ├── state.ts                 # aggregate state builders
│   ├── tenants.ts               # per-tenant rate limits
│   └── format.ts                # display formatting
├── verify.mjs                   # end-to-end feature checks
├── selfcheck.mts                # bandit-math unit checks
├── capture.mjs                  # screenshot capture
├── PRODUCT.md                   # product spec
└── DESIGN.md                    # design system
```

---

## Contributing

Contributions are welcome.

1. Fork the repo and create a branch: `git checkout -b feature/your-feature`.
2. Make your change. Keep `npm run typecheck` and `npm run lint` clean.
3. If you touch routing logic, run `node --experimental-strip-types selfcheck.mts` and `node verify.mjs`.
4. Commit with a short, clear message and open a pull request describing the change and why.

Adding a model? Add its id to `lib/models.ts` - free ids join routing automatically; add a key to enable paid ids.

---

## License

Released under the **MIT License**. See below.

```
MIT License

Copyright (c) 2026 Manas Borole

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Author

**Manas Borole**

Built with Next.js, TypeScript, and a contextual bandit that refuses to be a config file.

<div align="center">
<br />
<sub>If Multiplexer is useful to you, consider giving it a ⭐</sub>
</div>
