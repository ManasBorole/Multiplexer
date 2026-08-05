// Self-check for the online-learning core. Run:
//   node --experimental-strip-types selfcheck.mts
import { newArm, scoreArm, updateArm, invert } from "./lib/bandit.ts";
import assert from "node:assert";

// invert(identity) ≈ identity
const I = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
const inv = invert(I);
for (let i = 0; i < 3; i++)
  for (let j = 0; j < 3; j++)
    assert(Math.abs(inv[i][j] - I[i][j]) < 1e-9, "identity inverse");

// invert a known matrix: [[4,7],[2,6]]⁻¹ = [[0.6,-0.7],[-0.2,0.4]]
const m = invert([
  [4, 7],
  [2, 6],
]);
assert(Math.abs(m[0][0] - 0.6) < 1e-9 && Math.abs(m[1][1] - 0.4) < 1e-9, "2x2 inverse");

// The bandit should learn: for a fixed context, the arm that receives higher
// reward must end up scoring higher than the arm that receives lower reward.
const x = [1, 1, 0, 0.5, 0, 0];
const good = newArm(6);
const bad = newArm(6);
for (let t = 0; t < 40; t++) {
  updateArm(good, x, 0.9);
  updateArm(bad, x, 0.1);
}
const g = scoreArm(good, x, 0.35);
const b = scoreArm(bad, x, 0.35);
assert(g.mean > b.mean, `learned mean: good ${g.mean.toFixed(3)} > bad ${b.mean.toFixed(3)}`);
assert(g.score > b.score, "learned arm scores higher");

// Exploration: an unseen arm carries a positive UCB bonus (optimism).
const fresh = scoreArm(newArm(6), x, 0.35);
assert(fresh.bonus > 0, "unseen arm has exploration bonus");

console.log("OK - invert, LinUCB convergence, and exploration bonus all pass.");
console.log(
  `   good.mean=${g.mean.toFixed(3)} bad.mean=${b.mean.toFixed(3)} fresh.bonus=${fresh.bonus.toFixed(3)}`,
);
