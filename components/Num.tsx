"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A number that glides from its previous value to the new one (500ms) when the
 * data changes. Reduced motion jumps straight to the new value.
 */
export default function Num({
  value,
  format,
  className,
}: {
  value: number;
  format: (v: number) => string;
  className?: string;
}) {
  const [shown, setShown] = useState(value);
  const last = useRef(value);

  useEffect(() => {
    const start = last.current;
    if (start === value) return;
    last.current = value;
    const instant =
      !Number.isFinite(start) ||
      !Number.isFinite(value) ||
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = instant ? 1 : Math.min(1, (t - t0) / 500);
      setShown(k >= 1 ? value : start + (value - start) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span className={className}>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
