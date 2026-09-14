// scripts/freshness/report.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { buildReport, renderMarkdown, scoreTargets } from "./report";
import type { FreshnessIssue } from "./types";

const issues: FreshnessIssue[] = [
  { type: "missing-pin", severity: "low", category: "php", skillName: "", message: "no pins" },
  { type: "claim-behind-pin", severity: "med", category: "nextjs", skillName: "nextjs-legacy", upstream: "next", message: "Claims 14", file: "skills/nextjs/nextjs-legacy/SKILL.md", line: 3 },
  { type: "reviewed-stale", severity: "med", category: "nextjs", skillName: "", upstream: "next", message: "old" },
];

test("buildReport summarizes by severity and category", () => {
  const report = buildReport("audit", 120, issues, [], "2026-09-14T00:00:00.000Z");
  assert.equal(report.summary.issueCount, 3);
  assert.deepEqual(report.summary.bySeverity, { high: 0, med: 2, low: 1, warn: 0 });
  assert.deepEqual(report.summary.byCategory, { nextjs: 2, php: 1 });
  assert.equal(report.generatedAt, "2026-09-14T00:00:00.000Z");
});

test("renderMarkdown groups by category, severity first, with file:line", () => {
  const md = renderMarkdown(buildReport("audit", 120, issues, [], "2026-09-14T00:00:00.000Z"));
  assert.match(md, /^# Skill Freshness Report/m);
  assert.match(md, /\| high \| 0 \|/);
  assert.match(md, /^## nextjs/m);
  assert.match(md, /^## php/m);
  assert.ok(md.indexOf("## nextjs") < md.indexOf("## php"));
  assert.match(md, /`skills\/nextjs\/nextjs-legacy\/SKILL.md:3`/);
  assert.match(md, /No upstream versions fetched/);
});

test("renderMarkdown says clean when there are no issues", () => {
  const md = renderMarkdown(buildReport("audit", 120, [], []));
  assert.match(md, /No freshness issues/);
});

test("renderMarkdown escapes backslashes before pipes and strips newlines in messages", () => {
  // Real characters in the message: a \ b | c <newline> d
  const backslashIssues: FreshnessIssue[] = [
    { type: "missing-pin", severity: "low", category: "php", skillName: "", message: "a\\b|c\nd" },
  ];
  const md = renderMarkdown(buildReport("audit", 120, backslashIssues, [], "2026-09-14T00:00:00.000Z"));
  // Escaping order matters: the original backslash is doubled first, then
  // the pipe gets its own escaping backslash, then the newline becomes a
  // space — giving the real character sequence a \ \ b \ | c ' ' d.
  const expectedMessageCell = "a\\\\b\\|c d";
  assert.ok(
    md.includes(`| low | missing-pin | (category) |  | ${expectedMessageCell} |  |`),
    `expected escaped message cell "${expectedMessageCell}" in:\n${md}`,
  );
});

test("scoreTargets weights severities and renderMarkdown lists the top targets", () => {
  const mixed: FreshnessIssue[] = [
    { type: "upstream-major-drift", severity: "high", category: "java", skillName: "", upstream: "java", message: "" },
    { type: "claim-behind-pin", severity: "med", category: "nextjs", skillName: "nextjs-caching", message: "" },
    { type: "eval-remediation", severity: "low", category: "nextjs", skillName: "nextjs-caching", message: "" },
    { type: "eval-remediation", severity: "low", category: "nextjs", skillName: "nextjs-caching", message: "" },
    { type: "learning-log-gap", severity: "low", category: "golang", skillName: "golang-logging", message: "" },
    { type: "fetch-failed", severity: "warn", category: "flutter", skillName: "", message: "" },
  ];
  const scored = scoreTargets(mixed);
  assert.deepEqual(
    scored.map((s) => [s.target, s.score]),
    [["nextjs/nextjs-caching", 4], ["java (category)", 3], ["golang/golang-logging", 1]],
  );
  assert.deepEqual(scored[0].counts, { "claim-behind-pin": 1, "eval-remediation": 2 });
  const md = renderMarkdown(buildReport("audit", 120, mixed, [], "2026-09-14T00:00:00.000Z"));
  assert.match(md, /^## Improve next/m);
  assert.match(md, /\| 1 \| nextjs\/nextjs-caching \| 4 \| claim-behind-pin×1, eval-remediation×2 \|/);
  assert.ok(md.indexOf("## Improve next") < md.indexOf("## golang"));
  assert.equal(scoreTargets([], 10).length, 0);
});

test("renderMarkdown notes hidden score-1 targets beyond the top-10 limit", () => {
  const many: FreshnessIssue[] = Array.from({ length: 12 }, (_, i) => ({
    type: "eval-remediation" as const,
    severity: "low" as const,
    category: "cat",
    skillName: `skill-${i}`,
    message: "",
  }));
  const md = renderMarkdown(buildReport("audit", 120, many, [], "2026-09-14T00:00:00.000Z"));
  assert.match(md, /_\+2 more target\(s\) at score 1_/);
});

test("scoreTargets breaks ties by loads and renderMarkdown shows telemetry", () => {
  const tied: FreshnessIssue[] = [
    { type: "claim-behind-pin", severity: "med", category: "nextjs", skillName: "nextjs-a", message: "" },
    { type: "claim-behind-pin", severity: "med", category: "nextjs", skillName: "nextjs-b", message: "" },
  ];
  const loads = { "nextjs/nextjs-b": 40, "nextjs/nextjs-a": 3 };
  assert.deepEqual(scoreTargets(tied, 10, loads).map((t) => [t.target, t.loads]), [["nextjs/nextjs-b", 40], ["nextjs/nextjs-a", 3]]);
  const report = buildReport("audit", 120, tied, [], "2026-09-14T00:00:00.000Z", {
    source: "telemetry.jsonl",
    sessions: 22,
    from: "2026-09-01T10:00:00Z",
    to: "2026-09-13T10:00:00Z",
    noMatchCalls: 5,
    loadsByTarget: loads,
  });
  const md = renderMarkdown(report);
  assert.match(md, /^Telemetry: 22 sessions \(2026-09-01T10:00:00Z → 2026-09-13T10:00:00Z\), 5 no-match calls, from telemetry\.jsonl$/m);
  assert.match(md, /\| # \| target \| score \| loads \| signals \|/);
  assert.match(md, /\| 1 \| nextjs\/nextjs-b \| 2 \| 40 \| claim-behind-pin×1 \|/);
});
