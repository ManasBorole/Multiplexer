"use client";

import { useEffect } from "react";

/**
 * Cards marked `data-tilt` lean toward the pointer (max 4deg) and pick up a soft
 * highlight under it. Fine pointers only; off under reduced motion. One
 * delegated listener for the whole page.
 */
export default function useTilt() {
  useEffect(() => {
    const ok = matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!ok) return;
    let current: HTMLElement | null = null;
    const reset = (el: HTMLElement) => {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
      el.style.setProperty("--glare", "0");
    };
    const move = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>("[data-tilt]") ?? null;
      if (current && current !== el) reset(current);
      current = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--ry", `${((x - 0.5) * 8).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${((0.5 - y) * 8).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
      el.style.setProperty("--glare", "1");
    };
    const leave = () => {
      if (current) reset(current);
      current = null;
    };
    addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, []);
}
