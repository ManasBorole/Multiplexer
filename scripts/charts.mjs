// Renders the README charts from docs/data/benchmark.json as static SVG, one
// light and one dark variant each (the README picks via <picture>).
//
// Usage: node scripts/charts.mjs   (run scripts/benchmark.mjs first)

import { readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync("docs/data/benchmark.json", "utf8"));

// Model tiers straight from the roster, so labels match the app.
const roster = readFileSync("lib/models.ts", "utf8");
const TIER = Object.fromEntries(
  [...roster.matchAll(/id: "([^"]+)"[\s\S]*?label: "([^"]+)"[\s\S]*?tier: "(\w+)"/g)].map((m) => [m[1], { label: m[2], tier: m[3] }]),
);

// GitHub's own light/dark UI colours, so charts sit naturally in the README.
const THEMES = {
  light: { text: "#1f2328", muted: "#59636e", grid: "#d1d9e0", accent: "#0969da", second: "#bc4c00", third: "#59636e" },
  dark: { text: "#f0f6fc", muted: "#9198a1", grid: "#3d444d", accent: "#4493f8", second: "#f0883e", third: "#9198a1" },
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const svg = (w, h, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(title)}" font-family="-apple-system, Segoe UI, Helvetica, Arial, sans-serif"><title>${esc(title)}</title>${body}</svg>\n`;

// ── Chart 1: what each objective buys (cost vs quality) ─────────────────────
function tradeoff(t) {
  const W = 720, H = 360, L = 64, R = 150, T = 28, B = 52;
  const iw = W - L - R, ih = H - T - B;
  const x = (v) => L + v * iw; // share of flagship cost, 0..1
  const qMin = 0.4, qMax = 0.9;
  const y = (q) => T + (1 - (q - qMin) / (qMax - qMin)) * ih;
  let b = "";
  for (const q of [0.4, 0.5, 0.6, 0.7, 0.8, 0.9]) {
    b += `<line x1="${L}" x2="${L + iw}" y1="${y(q)}" y2="${y(q)}" stroke="${t.grid}"/>`;
    b += `<text x="${L - 10}" y="${y(q) + 4}" text-anchor="end" font-size="12" fill="${t.muted}">${q.toFixed(1)}</text>`;
  }
  for (const v of [0, 0.25, 0.5, 0.75, 1]) {
    b += `<text x="${x(v)}" y="${T + ih + 20}" text-anchor="middle" font-size="12" fill="${t.muted}">${Math.round(v * 100)}%</text>`;
  }
  b += `<text x="${L + iw / 2}" y="${H - 8}" text-anchor="middle" font-size="13" fill="${t.text}">Spend, as a share of always using the flagship model</text>`;
  b += `<text transform="translate(16 ${T + ih / 2}) rotate(-90)" text-anchor="middle" font-size="13" fill="${t.text}">Average answer quality (0–1)</text>`;
  for (const p of data.presets) {
    const base = p.name === "Always flagship";
    const cx = x(p.costVsFlagship), cy = y(p.avgQuality);
    b += `<circle cx="${cx}" cy="${cy}" r="6" fill="${base ? t.third : t.accent}"/>`;
    // Points near the top-right crowd each other: label those to the left.
    const left = p.costVsFlagship > 0.8 && !base;
    b += `<text x="${left ? cx - 11 : cx + 11}" y="${cy + (left ? 16 : 4)}" text-anchor="${left ? "end" : "start"}" font-size="13" fill="${t.text}">${esc(p.name)}</text>`;
  }
  return svg(W, H, b, "Average quality versus spend for each routing objective");
}

// ── Chart 2: where traffic goes over time, and the failover ─────────────────
function traffic(t) {
  const run = data.runsData[0];
  const rows = run.rows;
  const WIN = 25;
  const W = 720, H = 340, L = 64, R = 110, T = 28, B = 48;
  const iw = W - L - R, ih = H - T - B;
  const x = (i) => L + (i / (rows.length - 1)) * iw;
  const y = (v) => T + (1 - v) * ih;
  const tiers = [
    { key: "flagship", label: "Flagship", color: t.third, dash: "5 4" },
    { key: "mid", label: "Mid tier", color: t.accent, dash: "" },
    { key: "efficient", label: "Efficient tier", color: t.second, dash: "" },
  ];
  let b = "";
  for (const v of [0, 0.25, 0.5, 0.75, 1]) {
    b += `<line x1="${L}" x2="${L + iw}" y1="${y(v)}" y2="${y(v)}" stroke="${t.grid}"/>`;
    b += `<text x="${L - 10}" y="${y(v) + 4}" text-anchor="end" font-size="12" fill="${t.muted}">${Math.round(v * 100)}%</text>`;
  }
  for (const i of [0, 100, 200, 300, 400, 500]) {
    if (i > rows.length) continue;
    b += `<text x="${x(Math.min(i, rows.length - 1))}" y="${T + ih + 20}" text-anchor="middle" font-size="12" fill="${t.muted}">${i}</text>`;
  }
  b += `<text x="${L + iw / 2}" y="${H - 6}" text-anchor="middle" font-size="13" fill="${t.text}">Request number</text>`;
  b += `<text transform="translate(14 ${T + ih / 2}) rotate(-90)" text-anchor="middle" font-size="13" fill="${t.text}">Share of traffic (last ${WIN} requests)</text>`;
  // failover marker
  const fx = x(run.offlineAt);
  b += `<line x1="${fx}" x2="${fx}" y1="${T}" y2="${T + ih}" stroke="${t.muted}" stroke-dasharray="3 3"/>`;
  b += `<text x="${fx - 6}" y="${T + 14}" text-anchor="end" font-size="12" fill="${t.muted}">${esc(TIER[run.offlineModel]?.label ?? "model")} switched off</text>`;
  const ends = [];
  for (const tier of tiers) {
    const pts = [];
    for (let i = WIN - 1; i < rows.length; i++) {
      const win = rows.slice(i - WIN + 1, i + 1);
      const share = win.filter((r) => TIER[r.model]?.tier === tier.key).length / WIN;
      pts.push(`${x(i).toFixed(1)},${y(share).toFixed(1)}`);
    }
    b += `<polyline points="${pts.join(" ")}" fill="none" stroke="${tier.color}" stroke-width="2.5" stroke-dasharray="${tier.dash}" stroke-linejoin="round"/>`;
    const last = pts[pts.length - 1].split(",").map(Number);
    ends.push({ x: last[0] + 8, y: last[1] + 4, tier });
  }
  // End labels: nudge apart any that would overlap.
  ends.sort((a, c) => a.y - c.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 15) ends[i].y = ends[i - 1].y + 15;
  const overflow = ends.length ? Math.max(0, ends[ends.length - 1].y - (T + ih + 4)) : 0;
  for (const e of ends) b += `<text x="${e.x}" y="${e.y - (e.y > T + ih - 30 ? overflow : 0)}" font-size="13" fill="${e.tier.color}">${e.tier.label}</text>`;
  return svg(W, H, b, "Share of traffic by model tier over 500 requests, with a model switched off at request 300");
}

for (const [name, theme] of Object.entries(THEMES)) {
  writeFileSync(`docs/objective-tradeoff-${name}.svg`, tradeoff(theme));
  writeFileSync(`docs/traffic-over-time-${name}.svg`, traffic(theme));
}
console.log("wrote docs/objective-tradeoff-{light,dark}.svg and docs/traffic-over-time-{light,dark}.svg");
