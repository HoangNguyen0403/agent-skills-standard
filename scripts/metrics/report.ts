// scripts/metrics/report.ts
//
// SRS-004: renders a `MetricsReport` to the exact skeleton in
// `skills/common/common-sdlc-metrics/references/metrics-schema.md`. No composite
// score is ever computed here (AC-003) — every row is one named indicator with
// its own source (AC-002); rows the producer could not derive land in the
// `## Unavailable` table with a reason, never a guessed value (REQ-002).

import type { BandBreach, BandConfigError, Metric, MetricsReport, StageIndicatorRow } from "./types";

function cell(metric: Metric): {
  value: string;
  trend: string;
  basis: string;
  sample: string;
  coverage: string;
  source: string;
} {
  if (metric.available) {
    return {
      value: metric.value,
      trend: metric.trend,
      basis: metric.basis,
      sample: metric.sampleSize === null ? "n/a" : String(metric.sampleSize),
      coverage: metric.coverage,
      source: metric.source,
    };
  }
  return {
    value: "unavailable",
    trend: "unavailable",
    basis: "n/a",
    sample: "n/a",
    coverage: "unknown",
    source: metric.source ?? "n/a",
  };
}

/** Every stated limitation, keyed by the metric it qualifies. */
function limitationRows(report: MetricsReport): string[][] {
  const rows: string[][] = [];
  for (const row of report.deliveryHealth) {
    if (row.metric_result.available) {
      for (const limitation of row.metric_result.limitations) rows.push([row.metric, limitation]);
    }
  }
  for (const row of report.stageIndicators) {
    if (row.metric_result.available) {
      for (const limitation of row.metric_result.limitations) {
        rows.push([`${row.stage}: ${row.indicator}`, limitation]);
      }
    }
  }
  return rows;
}

function mdTable(header: string[], rows: string[][]): string {
  const lines = [`| ${header.join(" | ")} |`, `| ${header.map(() => "---").join(" | ")} |`];
  for (const row of rows) lines.push(`| ${row.join(" | ")} |`);
  return lines.join("\n");
}

export function renderMarkdown(report: MetricsReport): string {
  const lines: string[] = [];
  lines.push(`# SDLC Metrics: ${report.scope}`, "");
  lines.push(`Period: ${report.period}`, `Generated at: ${report.generatedAt}`, "");

  lines.push("## Delivery Health", "");
  lines.push(
    mdTable(
      ["Metric", "Value", "Trend vs previous", "Basis", "Sample", "Coverage", "Source"],
      report.deliveryHealth.map((row) => {
        const c = cell(row.metric_result);
        return [row.metric, c.value, c.trend, c.basis, c.sample, c.coverage, c.source];
      }),
    ),
    "",
  );

  lines.push("## Stage Indicators", "");
  lines.push(
    mdTable(
      ["Stage", "Indicator", "Value", "Trend", "Basis", "Sample", "Coverage", "Source"],
      report.stageIndicators.map((row) => {
        const c = cell(row.metric_result);
        return [row.stage, row.indicator, c.value, c.trend, c.basis, c.sample, c.coverage, c.source];
      }),
    ),
    "",
  );

  lines.push("## Control Bands", "");
  const bandRows = report.bandBreaches.map((b) => [b.metric, b.baselineWindow, b.tier, b.action, b.routedTo]);
  for (const err of report.bandConfigErrors) {
    bandRows.push([err.band, "n/a", "config error", "none (fix config first)", `CONFIG ERROR: ${err.problem}`]);
  }
  lines.push(mdTable(["Metric", "Baseline window", "Tier reached", "Action taken", "Routed to"], bandRows), "");

  lines.push("## Attribution", "");
  lines.push(
    mdTable(
      ["Identity class", "Changes", "Notes"],
      report.attribution.map((row) => [row.identityClass, String(row.changes), row.notes]),
    ),
    "",
  );

  lines.push("## Measurement Limitations", "");
  const limitations = limitationRows(report);
  if (limitations.length === 0) {
    lines.push("- none", "");
  } else {
    lines.push(mdTable(["Metric", "Limitation"], limitations), "");
  }

  lines.push("## Unavailable", "");
  lines.push(
    mdTable(
      ["Metric", "Reason"],
      report.unavailable.map((u) => [u.metric, u.reason]),
    ),
    "",
  );

  lines.push("## Follow-Ups", "");
  for (const item of report.followUps) lines.push(`- ${item}`);
  if (report.followUps.length === 0) lines.push("- none");

  return lines.join("\n") + "\n";
}

/** Collects every unavailable metric (delivery health, stage indicators, plus band-evaluation gaps) into one list. */
export function collectUnavailable(
  deliveryHealth: MetricsReport["deliveryHealth"],
  stageIndicators: StageIndicatorRow[],
  bandUnavailable: { metric: string; reason: string }[],
): { metric: string; reason: string }[] {
  const unavailable: { metric: string; reason: string }[] = [];
  for (const row of deliveryHealth) {
    if (!row.metric_result.available) unavailable.push({ metric: row.metric, reason: row.metric_result.reason });
  }
  for (const row of stageIndicators) {
    if (!row.metric_result.available) {
      unavailable.push({ metric: `${row.stage}: ${row.indicator}`, reason: row.metric_result.reason });
    }
  }
  unavailable.push(...bandUnavailable.map((u) => ({ metric: `band: ${u.metric}`, reason: u.reason })));
  return unavailable;
}

