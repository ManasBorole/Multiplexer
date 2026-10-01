"use client";

import { useEffect, useRef } from "react";
import type { RequestRecord, Weights } from "@/lib/types";
import StepCard, { type StepActions } from "./StepCard";
import type { StepState } from "./Results";
import { STEPS } from "./routing";

export type PlaneProps = {
  record: RequestRecord;
  weights: Weights;
  share: number | null;
  actions: StepActions;
  onJump: (step: number) => void;
  /** While a prompt routes, each card mirrors its live pipeline state. */
  live: StepState[] | null;
};

const W = 1176;

/**
 * The hero's tilted dashboard: all eight step cards laid on one plane. Hover or
 * focus lifts a card; selecting it jumps to that step in the story. As the hero
 * scrolls away the plane tilts further and recedes (scroll-linked, never timed).
 */
export default function CardPlane({ record, weights, share, actions, onJump, live }: PlaneProps) {
  const scene = useRef<HTMLDivElement>(null);
  const plane = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    // Projected size of the tilted plane at scale 1, measured once per resize.
    // Perspective also pushes the projected shape off-centre; dx/dy undo that.
    let base: { w: number; h: number; dx: number; dy: number } | null = null;
    const measure = (p: HTMLElement, s: HTMLElement) => {
      p.style.transform = "scale(1) rotateX(54deg) rotateZ(-34deg)";
      const r = p.getBoundingClientRect();
      const sr = s.getBoundingClientRect();
      base = {
        w: r.width,
        h: r.height,
        dx: sr.left + sr.width / 2 - (r.left + r.width / 2),
        dy: sr.top + sr.height / 2 - (r.top + r.height / 2),
      };
    };
    const apply = () => {
      raf = 0;
      const s = scene.current;
      const p = plane.current;
      if (!s || !p) return;
      const mobile = innerWidth <= 1000;
      if (!base) measure(p, s);
      // Desktop: fit the whole tilted plane inside the visible scene (width and
      // height). Mobile: let it bleed past the sides as a backdrop.
      const fit = mobile
        ? Math.min((s.clientWidth * 1.35) / W, 1.1)
        : Math.min((s.clientWidth * 0.98) / base!.w, (s.clientHeight * 0.94) / base!.h, 1.1);
      const t = reduce ? 0 : Math.min(1, Math.max(0, scrollY / (innerHeight * 0.9)));
      if (t >= 1) return; // offscreen: leave it be
      const off = mobile || !base ? "" : `translate(${base.dx * fit}px, ${base.dy * fit}px) `;
      p.style.transform = `${off}translateZ(${-t * 700}px) scale(${fit}) rotateX(${54 + t * 18}deg) rotateZ(${-34 + t * 8}deg)`;
      p.style.opacity = String(1 - t * 0.85);
    };
    const req = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    addEventListener("scroll", req, { passive: true });
    const onResize = () => {
      base = null;
      req();
    };
    addEventListener("resize", onResize);
    return () => {
      removeEventListener("scroll", req);
      removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={scene}
      className="plane-scene -mx-4 min-h-[380px] min-[1001px]:sticky min-[1001px]:top-[72px] min-[1001px]:mx-0 min-[1001px]:h-[calc(100svh-96px)] min-[1001px]:self-start"
      role="group"
      aria-label={`The eight routing steps for the ${record.id === "sample" ? "sample" : "last"} request. Select one to jump to it.`}
    >
      <div ref={plane} className="plane">
        <div className="plane-floor" />
        {STEPS.map((s, i) => (
          <div
            key={s.name}
            className="plane-slot cursor-pointer"
            style={{ left: (i % 4) * 300, top: Math.floor(i / 4) * 342 }}
            tabIndex={0}
            role="button"
            aria-label={`Step ${i + 1}: ${s.name}`}
            data-live={live ? live[i] : undefined}
            onClick={() => onJump(i + 1)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onJump(i + 1);
              }
            }}
          >
            <div aria-hidden="true" className="plane-card">
              <StepCard i={i} record={record} weights={weights} share={share} interactive={false} actions={actions} />
            </div>
          </div>
        ))}
      </div>
      <span className="absolute bottom-4 right-4 z-10 text-xs text-mute">
        {record.id === "sample" ? "Sample request, illustrative numbers" : "Your last request"}
      </span>
    </div>
  );
}
