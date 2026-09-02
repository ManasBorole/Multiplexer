"""Offline evaluation harness for the Multiplexer LLM routing gateway.

Implements the LinUCB contextual bandit that the gateway uses to pick a model
per request, then benchmarks it against a fixed "always use the premium model"
baseline over a synthetic request stream to quantify cost/latency savings.

Run:  python route_eval.py
Test: pytest route_eval.py
"""
from __future__ import annotations

import numpy as np
import pandas as pd


# Each model: (name, cost per 1k tokens in USD, mean latency ms, base quality 0-1)
MODELS = [
    ("premium", 0.030, 900, 0.95),
    ("mid",     0.010, 500, 0.88),
    ("cheap",   0.002, 250, 0.78),
]


class LinUCB:
    """Disjoint LinUCB (Li et al., 2010): one ridge model per arm.

    Picks the arm maximizing (predicted reward + alpha * uncertainty), so it
    explores uncertain arms early and exploits the cheapest arm that still
    clears quality once it has learned each arm's payoff for a context.
    """

    def __init__(self, n_arms: int, n_features: int, alpha: float = 1.0):
        self.alpha = alpha
        self.A = [np.identity(n_features) for _ in range(n_arms)]   # d x d per arm
        self.b = [np.zeros(n_features) for _ in range(n_arms)]      # d per arm

    def select(self, context: np.ndarray) -> int:
        scores = []
        for A, b in zip(self.A, self.b):
            A_inv = np.linalg.inv(A)
            theta = A_inv @ b
            mean = float(theta @ context)
            ucb = self.alpha * float(np.sqrt(context @ A_inv @ context))
            scores.append(mean + ucb)
        return int(np.argmax(scores))

    def update(self, arm: int, context: np.ndarray, reward: float) -> None:
        self.A[arm] += np.outer(context, context)
        self.b[arm] += reward * context


def _reward(model_idx: int, ctx: np.ndarray) -> float:
    """Quality-minus-cost reward. Hard prompts (ctx[0] high) punish cheap models."""
    _, cost, _, quality = MODELS[model_idx]
    difficulty = ctx[0]
    effective_quality = quality - difficulty * (1 - quality) * 2
    return effective_quality - cost * 5


def evaluate(n_requests: int = 120, seed: int = 7) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    bandit = LinUCB(n_arms=len(MODELS), n_features=3, alpha=0.8)
    rows = []
    for _ in range(n_requests):
        # context: [difficulty, length_norm, bias]
        ctx = np.array([rng.random(), rng.random(), 1.0])
        arm = bandit.select(ctx)
        bandit.update(arm, ctx, _reward(arm, ctx))
        rows.append({
            "routed_model": MODELS[arm][0],
            "routed_cost": MODELS[arm][1],
            "routed_latency": MODELS[arm][2],
            "baseline_cost": MODELS[0][1],      # baseline = always premium
            "baseline_latency": MODELS[0][2],
        })
    return pd.DataFrame(rows)


def summarize(df: pd.DataFrame) -> dict:
    routed = df["routed_cost"].sum()
    baseline = df["baseline_cost"].sum()
    return {
        "requests": len(df),
        "cost_reduction_pct": round((1 - routed / baseline) * 100, 1),
        "latency_reduction_pct": round(
            (1 - df["routed_latency"].mean() / df["baseline_latency"].mean()) * 100, 1
        ),
        "model_mix": df["routed_model"].value_counts().to_dict(),
    }


def test_bandit_beats_premium_baseline():
    """LinUCB must route cheaper than always-premium while still learning a mix."""
    stats = summarize(evaluate())
    assert stats["requests"] == 120
    assert stats["cost_reduction_pct"] > 20      # backs the "~25% cost cut" claim
    assert len(stats["model_mix"]) >= 2          # it actually explores, not one arm


if __name__ == "__main__":
    stats = summarize(evaluate())
    print(f"requests             : {stats['requests']}")
    print(f"cost reduction       : {stats['cost_reduction_pct']}%")
    print(f"avg latency reduction: {stats['latency_reduction_pct']}%")
    print(f"model mix            : {stats['model_mix']}")
    test_bandit_beats_premium_baseline()
    print("self-check passed")
