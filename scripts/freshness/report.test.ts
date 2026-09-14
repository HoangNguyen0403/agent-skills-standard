// scripts/freshness/report.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { buildReport, renderMarkdown } from "./report";
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
