"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { RequestRecord, Weights } from "@/lib/types";
import StepCard, { type StepActions } from "./StepCard";
import { STEPS } from "./routing";

const SP = 1150; // depth between cards, px
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Props = {
  record: RequestRecord;
  weights: Weights;
  share: number | null;
  actions: StepActions;
};

const PERSPECTIVE = 1600; // .story-scene perspective
const ORIGIN_Y = 0.42; // .story-scene perspective-origin y

/**
 * Where each card sits in the closing summary grid, sized from the scene and the
 * real card heights so the whole grid fits on screen (4x2 desktop, 2x4 mobile).
 */
function summaryGrid(scene: HTMLElement, cards: (HTMLDivElement | null)[], mobile: boolean) {
  const sw = scene.clientWidth;
  const sh = scene.clientHeight;
  const cols = mobile ? 2 : 4;
  const rows = Math.ceil(cards.length / cols);
  const gap = 28;
  const cw = cards[0]?.offsetWidth ?? 470;
  const hs = cards.map((c) => c?.offsetHeight ?? 400);
  const rowH = Array.from({ length: rows }, (_, r) => Math.max(...hs.slice(r * cols, r * cols + cols)));
  const W = cols * cw + (cols - 1) * gap;
  const H = rowH.reduce((a, b) => a + b, 0) + (rows - 1) * gap;
  const availH = mobile ? (sh - 190) * 0.96 : sh * 0.86;
  const k = Math.min(1, (sw * 0.94) / W, availH / H); // projected scale
  const z = PERSPECTIVE - PERSPECTIVE / k;
  // Solve for the world-space centre that projects onto the visual centre.
  const vp = (ORIGIN_Y - 0.5) * sh;
  const target = mobile ? -85 : 0;
  const top = vp + (target - vp) / k - H / 2;
  return cards.map((_, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const rowTop = top + rowH.slice(0, r).reduce((a, b) => a + b, 0) + r * gap;
    // Cards are laid out with their top edge at the scene centre (top: 0).
    return [(c - (cols - 1) / 2) * (cw + gap), rowTop, z] as const;
  });
}

/** Scroll position that centres step n (1-based) in the story. */
export function storyTop(n: number) {
  const el = document.getElementById("story-scroll");
  if (!el) return 0;
  return el.getBoundingClientRect().top + scrollY + (n - 0.5) * innerHeight;
}

const REDUCED = "(prefers-reduced-motion: reduce)";
const isReduced = () => matchMedia(REDUCED).matches;
const subscribeReduced = (cb: () => void) => {
  const mq = matchMedia(REDUCED);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export default function Story(props: Props) {
  const reduced = useSyncExternalStore(subscribeReduced, isReduced, () => false);
  const sample = props.record.id === "sample";
  const who = sample ? "Sample request (send a prompt to use yours)" : "Your last request";

  return (
    <section id="story" aria-labelledby="story-title" className="relative">
      <h2 id="story-title" className="sr-only">How one request is routed, step by step</h2>
      {reduced ? <Stepped {...props} who={who} /> : <FlyThrough {...props} who={who} />}
    </section>
  );
}

/** prefers-reduced-motion: no scroll-linked motion, just the steps in order. */
function Stepped({ record, weights, share, actions, who }: Props & { who: string }) {
  return (
    <div id="story-scroll" className="mx-auto grid max-w-5xl gap-12 px-4 py-20">
      <p className="text-[13px] text-mute">{who}</p>
      {STEPS.map((s, i) => (
        <div key={s.name} className="grid items-center gap-6 md:grid-cols-[1fr_470px]">
          <div>
            <p className="num text-xs text-mute">Step {i + 1} of 8, {s.tech}</p>
            <h3 className="mt-1 text-xl font-bold">{s.name}</h3>
            <p className="mt-2 max-w-[44ch] text-dim">{s.desc}</p>
          </div>
          <StepCard i={i} record={record} weights={weights} share={share} interactive actions={actions} />
        </div>
      ))}
    </div>
  );
}

function FlyThrough({ record, weights, share, actions, who }: Props & { who: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const litRef = useRef<HTMLElement>(null);
  const travRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0); // 0 = before the story, 1..8 steps, 9 = summary
  const [focus, setFocus] = useState(-1);

  useEffect(() => {
    let target = -1;
    let cur = -1;
    let raf = 0;
    let lastActive = -1;
    let lastFocus = -2;

    const read = () => {
      const el = scrollRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      target = clamp(-r.top / innerHeight, -1, 9);
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const tick = () => {
      raf = 0;
      const d = target - cur;
      cur = Math.abs(d) < 0.001 ? target : cur + d * 0.14;
      paint(cur);
      if (cur !== target) raf = requestAnimationFrame(tick);
    };

    const paint = (s: number) => {
      const world = worldRef.current;
      const scene = world?.parentElement;
      if (!world || !scene) return;
      const mobile = innerWidth <= 1000;
      const sw = scene.clientWidth;
      // The summary grid forms over s 7.95-8.3 and then holds until the sticky
      // stage releases at s = 9, so it is never cut off mid-scroll.
      const e = ease(clamp((s - 7.95) / 0.35));
      const grid = e > 0 ? summaryGrid(scene, cardRefs.current, mobile) : null;
      world.style.transform = `translateZ(${lerp(Math.max(-0.6, s - 0.5) * SP, 0, e)}px)`;
      if (litRef.current) {
        const lit = Math.max(0, 1600 + Math.max(0, s - 0.5) * SP + 300);
        litRef.current.style.transform = `scaleY(${Math.min(1, lit / 13000)})`;
        litRef.current.parentElement!.style.opacity = String(1 - e);
      }
      // Centre each card on its own height; on phones, in the space above the caption.
      const midY = mobile ? -70 : 0;
      let f = -1;
      cardRefs.current.forEach((c, i) => {
        if (!c) return;
        const dist = i + 0.5 - s;
        let o = dist < -0.1 ? clamp(1 + (dist + 0.1) * 3.2) : clamp(1 - (dist - 0.35) * 0.3);
        o = lerp(o, 1, e);
        const blur = mobile || e > 0 || dist < 0.9 ? 0 : Math.min(6, (dist - 0.9) * 2.2);
        const x = mobile ? 0 : (i % 2 ? 1 : -1) * 200 * Math.min(1, sw / 1000);
        const [gx, gy, gz] = grid ? grid[i] : [0, 0, 0];
        const ry = lerp((i % 2 ? -1 : 1) * 12, 0, Math.max(e, clamp(1 - Math.abs(dist))));
        c.style.opacity = String(o);
        c.style.filter = blur ? `blur(${blur.toFixed(1)}px)` : "none";
        c.style.visibility = o < 0.02 ? "hidden" : "visible";
        c.style.transform = `translate3d(${lerp(x, gx, e)}px,${lerp(-c.offsetHeight / 2 + midY + (i % 2 ? -20 : 20), gy, e)}px,${lerp(-i * SP, gz, e)}px) rotateY(${ry}deg)`;
        if (Math.abs(dist) < 0.45 && e < 0.5) f = i;
      });
      if (travRef.current) travRef.current.style.opacity = s < 0 || e > 0.3 ? "0" : "1";
      const a = s < 0 ? 0 : Math.min(9, Math.floor(s) + 1);
      if (a !== lastActive) {
        lastActive = a;
        setActive(a);
      }
      if (f !== lastFocus) {
        lastFocus = f;
        setFocus(f);
      }
    };

    read();
    addEventListener("scroll", read, { passive: true });
    addEventListener("resize", read);
    return () => {
      removeEventListener("scroll", read);
      removeEventListener("resize", read);
      cancelAnimationFrame(raf);
    };
  }, []);

  const jump = (n: number) => scrollTo({ top: storyTop(n), behavior: "smooth" });
  const k = Math.min(Math.max(active, 1), 8) - 1;

  return (
    <div id="story-scroll" ref={scrollRef} className="relative" style={{ height: "1000vh" }}>
      <div className="story-stage">
        <div className="story-scene">
          <div ref={worldRef} className="story-world">
            <div className="story-route" style={{ transform: "translate3d(0,300px,1600px) rotateX(-90deg)" }} aria-hidden="true">
              <i ref={litRef} />
            </div>
            {STEPS.map((s, i) => (
              <div
                key={s.name}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className="story-card"
                inert={focus !== i}
                aria-label={`Step ${i + 1}: ${s.name}`}
                role="group"
              >
                <StepCard
                  i={i}
                  record={record}
                  weights={weights}
                  share={share}
                  interactive={focus === i}
                  focus={focus === i}
                  actions={actions}
                />
              </div>
            ))}
          </div>
        </div>

        <nav
          className="steps-nav absolute bottom-0 left-0 top-0 z-[5] hidden w-[400px] flex-col justify-center gap-3.5 pb-10 pl-9 pr-6 pt-20 min-[1001px]:flex"
          aria-label="Routing steps"
          style={{ opacity: active > 0 ? 1 : 0.5, transition: "opacity .3s" }}
        >
          <p className="text-[12.5px] text-mute">{who}</p>
          <ol className="grid gap-0.5">
            {STEPS.map((s, i) => {
              const n = i + 1;
              const state = n === active ? "on" : n < active ? "done" : "todo";
              return (
                <li key={s.name} data-state={state} data-skip={record.cached && i >= 3 && i <= 6 ? "true" : undefined}>
                  <button type="button" onClick={() => jump(n)} aria-current={state === "on" ? "step" : undefined}>
                    <span className="dot">{n}</span>
                    <span className="nm">{s.name}</span>
                    <span className="tech">{s.tech}</span>
                    <span className="ds">{s.desc}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div
          className="absolute inset-x-3 bottom-3 grid gap-1.5 rounded-lg border border-line-2 bg-card px-4 pb-[calc(14px+env(safe-area-inset-bottom,0px))] pt-3.5 min-[1001px]:hidden"
          aria-live="polite"
          style={{ display: active > 0 ? undefined : "none", zIndex: 5 }}
        >
          <div className="flex gap-1" aria-hidden="true">
            {STEPS.map((s, i) => (
              <i key={s.name} className={`h-[3px] flex-1 rounded-full ${i + 1 < active ? "bg-good" : i + 1 === active ? "bg-acc" : "bg-line-2"}`} />
            ))}
          </div>
          {active > 8 ? (
            <>
              <b className="text-base">That was one request</b>
              <span className="text-[13.5px] text-dim">The full results and your session are right below.</span>
            </>
          ) : (
            <>
              <small className="text-xs text-mute">Step {k + 1} of 8, {STEPS[k].tech}</small>
              <b className="text-base">{STEPS[k].name}</b>
              <span className="text-[13.5px] text-dim">{STEPS[k].desc}</span>
            </>
          )}
        </div>

        <div ref={travRef} className="traveler" aria-hidden="true">
          <i />
          {record.id === "sample" ? "Sample request" : "Your request"}
        </div>
      </div>
    </div>
  );
}
