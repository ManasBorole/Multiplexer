// LinUCB - a contextual multi-armed bandit (one arm per model).
//
// Each arm keeps a ridge-regression of reward on the context vector x:
//   A  (d×d, init identity),  b (d, init 0)
//   theta = A⁻¹ b                                 (exploitation)
//   score = theta·x + alpha·sqrt(xᵀ A⁻¹ x)        (+ exploration bonus)
// Pick the arm with the highest score; after observing reward r, update
//   A += x xᵀ,  b += r·x.
// This is a real online learner: it improves its cost/latency/quality routing
// as it sees more traffic, and adapts when the objective weights change.

// [bias, lengthNorm, code, question, reasoning, rare, wQuality, wCost, wLatency]
// The objective weights are part of the context so routing responds to the
// objective, not just the prompt - drag the sliders and the policy moves.
export const FEATURE_DIM = 9;

export type ArmState = { A: number[][]; b: number[] };

export function newArm(d = FEATURE_DIM): ArmState {
  return { A: identity(d), b: new Array(d).fill(0) };
}

function identity(d: number): number[][] {
  return Array.from({ length: d }, (_, i) =>
    Array.from({ length: d }, (_, j) => (i === j ? 1 : 0)),
  );
}

// Invert a small square matrix via Gauss-Jordan (d ≤ ~8; ample for our use).
export function invert(m: number[][]): number[][] {
  const n = m.length;
  const a = m.map((row, i) => [...row, ...identity(n)[i]]);
  for (let col = 0; col < n; col++) {
    // partial pivot for numerical stability
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(a[r][col]) > Math.abs(a[piv][col])) piv = r;
    }
    if (Math.abs(a[piv][col]) < 1e-12) continue; // singular-ish; A stays ~PD via ridge
    [a[col], a[piv]] = [a[piv], a[col]];
    const d = a[col][col];
    for (let j = 0; j < 2 * n; j++) a[col][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = a[r][col];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[col][j];
    }
  }
  return a.map((row) => row.slice(n));
}

function matVec(m: number[][], v: number[]): number[] {
  return m.map((row) => row.reduce((s, x, j) => s + x * v[j], 0));
}
function dot(a: number[], b: number[]): number {
  return a.reduce((s, x, i) => s + x * b[i], 0);
}

export type Scored = { mean: number; bonus: number; score: number };

/** Score one arm for context x. alpha controls exploration (UCB width). */
export function scoreArm(arm: ArmState, x: number[], alpha: number): Scored {
  const Ainv = invert(arm.A);
  const theta = matVec(Ainv, arm.b);
  const mean = dot(theta, x);
  const variance = Math.max(0, dot(x, matVec(Ainv, x)));
  const bonus = alpha * Math.sqrt(variance);
  return { mean, bonus, score: mean + bonus };
}

/**
 * Observe reward r for context x.
 *   A ← γ·A + (1−γ)·I + x xᵀ,   b ← γ·b + r·x
 * With γ=1 this is textbook LinUCB (A += xxᵀ, b += r·x). With γ<1 the arm
 * discounts old evidence, so the router adapts to a changed objective, a
 * provider outage, or drifting difficulty instead of staying frozen on what
 * used to be optimal. The (1−γ)·I term keeps A well-conditioned (ridge prior).
 */
export function updateArm(
  arm: ArmState,
  x: number[],
  r: number,
  decay = 1,
): void {
  const d = x.length;
  for (let i = 0; i < d; i++) {
    arm.b[i] = decay * arm.b[i] + r * x[i];
    for (let j = 0; j < d; j++) {
      arm.A[i][j] = decay * arm.A[i][j] + (i === j ? 1 - decay : 0) + x[i] * x[j];
    }
  }
}
