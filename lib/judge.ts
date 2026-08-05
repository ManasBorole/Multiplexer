import type { Judgement } from "./types";

// LLM-as-Judge - scores an answer's quality and explains why. This verdict is the
// quality signal the bandit's reward is built on (replacing a bare heuristic).
//
// With OPENROUTER_API_KEY set, a real judge model scores the answer against a
// rubric. Without a key (or if the judge call fails), a local rubric heuristic
// stands in so the demo stays free and never blocks a response.

const HAS_KEY = !!process.env.OPENROUTER_API_KEY;
// A capable free model used only to score answers - kept separate from routing.
const JUDGE_MODEL = "google/gemma-4-26b-a4b-it:free";

const clampScore = (n: number) => Math.max(0.2, Math.min(0.99, n));

/** Score a completed answer 0..1 with a one-line rationale. */
export async function judge(
  prompt: string,
  response: string,
  priorQuality: number,
): Promise<Judgement> {
  if (HAS_KEY) {
    const real = await judgeReal(prompt, response);
    if (real) return real;
  }
  return judgeHeuristic(prompt, response, priorQuality);
}

// Real judge model: ask for a strict 0..1 score + short reasoning as JSON.
async function judgeReal(
  prompt: string,
  response: string,
): Promise<Judgement | null> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://multiplexer.dev",
        "X-Title": "Multiplexer",
      },
      body: JSON.stringify({
        model: JUDGE_MODEL,
        messages: [
          {
            role: "system",
            content:
              'You are a strict answer-quality judge. Rate how well the ANSWER addresses the PROMPT (accuracy, completeness, relevance) from 0 to 1. Reply with ONLY compact JSON: {"score": <number 0..1>, "reasoning": "<=14 words"}.',
          },
          {
            role: "user",
            content: `PROMPT:\n${prompt}\n\nANSWER:\n${response.slice(0, 4000)}`,
          },
        ],
        max_tokens: 120,
        temperature: 0,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    const score = Number(parsed.score);
    if (!Number.isFinite(score)) return null;
    const reasoning =
      String(parsed.reasoning ?? "").trim().slice(0, 160) || "Scored by judge model.";
    return { score: clampScore(score), reasoning };
  } catch {
    return null;
  }
}

/** Local rubric heuristic - the no-key / fallback judge. */
export function judgeHeuristic(
  prompt: string,
  response: string,
  priorQuality: number,
): Judgement {
  const text = response.trim();
  const len = text.length;
  const hasCode = /```|(^|\n)\s*(def |class |function |const |SELECT )/i.test(text);
  const structured = /\n\s*[-*\d]/.test(text);
  const wantsCode = /\bcode|function|regex|sql|query|algorithm|schema|python|javascript\b/i.test(
    prompt,
  );

  let score = priorQuality; // start from the model's own quality proxy
  const notes: string[] = [];

  if (len > 500) notes.push("thorough");
  else if (len < 80) {
    score -= 0.14;
    notes.push("terse");
  }
  if (structured) {
    score += 0.03;
    notes.push("well-structured");
  }
  if (wantsCode && hasCode) {
    score += 0.05;
    notes.push("code provided as asked");
  } else if (wantsCode && !hasCode) {
    score -= 0.08;
    notes.push("missing requested code");
  }

  score = clampScore(score);
  const grade = score > 0.82 ? "Strong" : score > 0.62 ? "Adequate" : "Weak";
  const why = notes.length ? notes.join(", ") : "on-topic, relevant response";
  return { score, reasoning: `${grade} answer - ${why}.` };
}
