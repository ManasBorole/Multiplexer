# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated (constrained to free tools/services by the brief - prefer reliable free tiers, avoid paid deps unless no practical free option exists):

- **Next.js (App Router) on Vercel** - frontend + the gateway's API routes in one free deploy. Serverless routes host the proxy/routing logic; the same project serves the UI.
- **OpenRouter** - single API in front of many hosted models (OpenAI, Anthropic, etc.); **Ollama / vLLM** for local models. One integration, many providers.
- **Upstash Redis (free tier)** - bandit state, per-model reward stats, metrics counters, request history, rate limiting.
- **Semantic cache** - embeddings + vector similarity via **Upstash Vector** or **pgvector on Neon/Supabase** (free tier).
- **Auth** - Supabase Auth or Clerk free tier (or none for the initial demo surface).
- **Charts/viz** - Recharts or visx for live routing/cost/latency/cache visualizations.
- **Styling** - Tailwind CSS.
- **CI/CD** - GitHub + Vercel free integration.

Revisit any choice only if a free tier proves insufficient.

## Users

Primary users are **developers and platform/ML engineers on teams running LLM products at scale**. They integrate the gateway in front of their LLM traffic and watch/tune how requests get routed. Secondary: engineering leads who care about the cost/quality tradeoff.

## Product Purpose

Multiplexer is a **learned LLM routing gateway**. It sits in front of multiple LLM providers and learns, in real time, which model to route each request to - optimizing a joint **cost / latency / quality** objective. It exists so teams stop overpaying (route everything to the most expensive model) or underpaying in quality (route everything to the cheapest), without hand-tuning routing rules forever.

Success = routing decisions measurably improve on the cost/quality frontier as traffic accumulates, and the team can see and trust why each decision was made.

## Positioning

The differentiator no static router can truthfully copy: **online learning, not configuration.** A **contextual multi-armed bandit** picks the model per request and updates from observed reward (cost, latency, quality) as it sees more traffic. It adapts to changing traffic patterns, provider outages, and drifting task difficulty - unlike regex/keyword/config rules ("use GPT-4 for hard questions"). Paired with **semantic caching** (skip the call when a similar request was already answered) and **full request-level observability** (every routing decision is inspectable).

This is explicitly NOT a config file and NOT a simple fan-out/compare tool - it is an adaptive routing system.

## Operating Context

- Deployed as an **API gateway** in front of a team's LLM traffic; requests flow through it, it routes to a provider, returns the response.
- The web surface is **interactive and live** - a homepage where a visitor can type a prompt, watch it get routed, and see the full lifecycle. Not a passive marketing/docs site.
- Real usage scene: a developer testing routing behavior, then watching aggregate metrics as traffic flows.

## Capabilities and Constraints

Confirmed capabilities:
- Multi-provider routing (OpenAI, Anthropic, local via Ollama/vLLM) behind one gateway.
- Contextual multi-armed bandit that learns routing online from a cost/latency/quality reward.
- Semantic caching of similar requests.
- Request-level observability: routing decisions, model selection, cost, latency, cache hits/misses, metrics, request history, failures.
- **Request Inspector**: full request lifecycle for a single request.
- Interactive homepage: prompt interface + chat + live visualizations of the routing lifecycle.

Constraints:
- All infrastructure must use reliable **free tools/services**; avoid paid dependencies unless no practical free option exists.
- Frontend must be polished, responsive, excellent UX.

Undecided: quality-signal source for the reward (heuristic, judge model, user feedback?), auth requirement for the demo, exact model roster, persistence depth of history.

## Brand Commitments

Binding visual constraint from the brief (recorded, not expanded - an anti-reference, not a style spec):

- **NOT the generic AI template.** No purple gradients, no floating squares, no glassmorphism, no the-usual-AI-startup layouts.
- Must feel like a **unique, premium SaaS product**.
- Must **instantly show what the app does**, let users test it via a prompt, and **transparently visualize the entire routing lifecycle**.
- Prioritize clarity, transparency, and visual appeal over a ChatGPT-like chat interface.

Name: **Multiplexer**. Tagline concept: "A Learned LLM Routing Gateway."

## Evidence on Hand

None yet. No real traffic data, benchmarks, provider pricing tables, testimonials, or logos exist. Future work must not fabricate model benchmarks, cost/quality numbers, customer names, or routing-accuracy claims - any numbers shown in the live UI must come from actual runs or be clearly labeled as sample/demo data.

## Product Principles

- **Learning over configuration.** The system adapts; it is never a static rules file.
- **Transparency is the product.** Every routing decision must be inspectable and explainable - trust comes from showing the work.
- **Joint objective.** Cost, latency, and quality are optimized together, never one in isolation.
- **Show, don't tell.** The homepage proves the value by letting the visitor drive the real thing, not by describing it.
- **Free by default.** Reliable free-tier infrastructure is a design constraint, not an afterthought.
