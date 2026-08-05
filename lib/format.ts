// Display formatters. Keep all readouts tabular + consistent.

export function usd(n: number, dp = 4): string {
  if (n === 0) return "$0";
  if (n < 0.01 && n > 0) return `$${n.toFixed(Math.max(dp, 5))}`;
  return `$${n.toFixed(dp)}`;
}

export function ms(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(2)}s`;
  return `${Math.round(n)}ms`;
}

export function pct(n: number, dp = 0): string {
  return `${(n * 100).toFixed(dp)}%`;
}
