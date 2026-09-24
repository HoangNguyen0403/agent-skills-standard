// scripts/metrics/spc.ts
//
// SRS-003: deterministic Western Electric control-band detection, run before any
// agent interprets the signal (SKILL §4). Pure function over a numeric series —
// no I/O — so it is independently testable and reused by bands.ts.

export type SigmaTier = "1sigma" | "2sigma" | "3sigma";

export interface Breach {
  tier: SigmaTier;
  side: "above" | "below";
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stddev(values: number[], avg: number): number {
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Classifies the most recent points in `series` against a baseline drawn from the
 * points preceding them, using the four Western Electric rules (most severe wins):
 *   1. any of the last 3 points beyond 3 sigma            -> "3sigma"
 *   2. 2 of the last 3 points beyond 2 sigma, same side   -> "2sigma"
 *   3. 4 of the last 5 points beyond 1 sigma, same side   -> "1sigma"
 *   4. the last 8 points all on the same side of the mean -> "1sigma"
 *
 * `baselineWindow` points immediately before the tested tail form the baseline.
 * Returns `undefined` when the series has too few points to form a baseline and
 * a detection tail (never guesses a breach from insufficient history).
 */
export function detectWesternElectricBreach(series: number[], baselineWindow: number): Breach | undefined {
  const tailSize = 8;
  if (series.length < baselineWindow + tailSize) return undefined;

  const baseline = series.slice(series.length - tailSize - baselineWindow, series.length - tailSize);
  const tail = series.slice(series.length - tailSize);
  const avg = mean(baseline);
  const sd = stddev(baseline, avg);
  if (sd === 0) return undefined;

  const sigmaOf = (v: number) => (v - avg) / sd;
  const sideOf = (v: number): "above" | "below" => (v >= avg ? "above" : "below");

  const last3 = tail.slice(-3);
  if (last3.some((v) => Math.abs(sigmaOf(v)) > 3)) {
    const point = last3.find((v) => Math.abs(sigmaOf(v)) > 3)!;
    return { tier: "3sigma", side: sideOf(point) };
  }

  for (const side of ["above", "below"] as const) {
    const beyond2 = last3.filter((v) => sideOf(v) === side && Math.abs(sigmaOf(v)) > 2).length;
    if (beyond2 >= 2) return { tier: "2sigma", side };
  }

  const last5 = tail.slice(-5);
  for (const side of ["above", "below"] as const) {
    const beyond1 = last5.filter((v) => sideOf(v) === side && Math.abs(sigmaOf(v)) > 1).length;
    if (beyond1 >= 4) return { tier: "1sigma", side };
  }

  if (tail.every((v) => sideOf(v) === "above") || tail.every((v) => sideOf(v) === "below")) {
    return { tier: "1sigma", side: sideOf(tail[0]) };
  }

  return undefined;
}
