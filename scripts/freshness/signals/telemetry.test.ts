import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import fs from "fs-extra";
import { aggregateTelemetry, loadsByTarget, readTelemetryFiles, telemetryIssues } from "./telemetry";

const TODAY = new Date("2026-09-14T00:00:00Z");
const line = (at: string, skills: Record<string, number>, noMatchCalls = 0) =>
  JSON.stringify({ at, mcpVersion: "0.6.0", skills, workflows: {}, callsByTool: {}, noMatchCalls });

function sample(): string[] {
  const lines: string[] = [];
  for (let i = 0; i < 22; i++) {
    lines.push(line(`2026-09-${String(1 + (i % 13)).padStart(2, "0")}T10:00:00Z`, { "nextjs/nextjs-caching": 2, "golang/golang-logging": i % 2 }, i % 5 === 0 ? 1 : 0));
  }
  lines.push(line("2026-05-01T00:00:00Z", { "php/php-language": 9 })); // outside window
  lines.push(line("2026-05-02T00:00:00Z", { "php/php-language": 9 }));
  lines.push(line("2026-05-03T00:00:00Z", { "php/php-language": 9 }));
  lines.push("{not json");
  lines.push("");
  lines.push(line("2026-09-05T00:00:00Z", [1, 2, 3] as unknown as Record<string, number>));
  return lines;
}

test("aggregateTelemetry keeps in-window valid records and sums loads", () => {
  const agg = aggregateTelemetry(sample(), { today: TODAY, windowDays: 90 });
  assert.equal(agg.sessions, 22);
  assert.equal(agg.loadsBySkill.get("nextjs/nextjs-caching"), 44);
  assert.equal(agg.loadsBySkill.get("golang/golang-logging"), 11);
  assert.equal(agg.loadsBySkill.get("php/php-language"), undefined);
  assert.equal(agg.noMatchCalls, 5);
  assert.equal(agg.from, "2026-09-01T10:00:00Z");
  assert.equal(agg.to, "2026-09-13T10:00:00Z");
  assert.equal(agg.loadsBySkill.has("0"), false);
});

test("telemetryIssues flags unused version-sensitive skills only past minSessions", () => {
  const agg = aggregateTelemetry(sample(), { today: TODAY, windowDays: 90 });
  const skills = [
    { category: "nextjs", name: "nextjs-caching" },
    { category: "nextjs", name: "nextjs-pages-router" },
    { category: "common", name: "common-tdd" },
    { category: "android", name: "android-compose" },
  ];
  const issues = telemetryIssues(agg, skills, { minSessions: 20, windowDays: 90 });
  assert.deepEqual(issues.map((i) => `${i.type}:${i.category}/${i.skillName}:${i.severity}`), ["unused-skill:nextjs/nextjs-pages-router:low"]);
  assert.match(issues[0].message, /22 sessions/);
  assert.deepEqual(telemetryIssues(agg, skills, { minSessions: 50, windowDays: 90 }), []);
});

test("telemetryIssues does not flag a skill in a category with zero observed loads", () => {
  const agg = aggregateTelemetry(sample(), { today: TODAY, windowDays: 90 });
  const issues = telemetryIssues(agg, [{ category: "android", name: "android-compose" }], { minSessions: 20, windowDays: 90 });
  assert.deepEqual(issues, []);
});

test("a record.categories entry marks a category as seen even with zero skill loads", () => {
  const raw = JSON.stringify({
    at: "2026-09-05T00:00:00Z",
    mcpVersion: "0.6.0",
    skills: {},
    workflows: {},
    categories: { "category/android": 1 },
    callsByTool: {},
    noMatchCalls: 0,
  });
  const agg = aggregateTelemetry([raw], { today: TODAY, windowDays: 90 });
  assert.equal(agg.categoriesSeen.has("android"), true);
  const issues = telemetryIssues(agg, [{ category: "android", name: "android-compose" }], { minSessions: 1, windowDays: 90 });
  assert.deepEqual(issues.map((i) => i.skillName), ["android-compose"]);
});

test("aggregateTelemetry ignores negative, non-integer, and unsafely large counts", () => {
  const raw = line("2026-09-05T00:00:00Z", { "nextjs/nextjs-caching": -1, "golang/golang-logging": 1.5, "php/php-language": 1e308 });
  const agg = aggregateTelemetry([raw], { today: TODAY, windowDays: 90 });
  assert.equal(agg.loadsBySkill.size, 0);
  assert.equal(agg.categoriesSeen.size, 0);
  assert.equal(agg.sessions, 1);
});

test("aggregateTelemetry ignores an invalid noMatchCalls", () => {
  const raw = JSON.stringify({ at: "2026-09-05T00:00:00Z", skills: {}, noMatchCalls: -3 });
  const agg = aggregateTelemetry([raw], { today: TODAY, windowDays: 90 });
  assert.equal(agg.noMatchCalls, 0);
});

test("aggregateTelemetry picks from/to by epoch order", () => {
  const lines = [
    line("2026-09-10T00:00:01Z", { "nextjs/nextjs-caching": 1 }),
    line("2026-09-02T23:59:59Z", { "nextjs/nextjs-caching": 1 }),
  ];
  const agg = aggregateTelemetry(lines, { today: TODAY, windowDays: 90 });
  assert.equal(agg.sessions, 2);
  assert.equal(agg.from, "2026-09-02T23:59:59Z");
  assert.equal(agg.to, "2026-09-10T00:00:01Z");
});

test("legacy category/ keys in skills are ignored by aggregation and ranking", () => {
  const raw = line("2026-09-05T00:00:00Z", { "category/android": 3 });
  const agg = aggregateTelemetry([raw], { today: TODAY, windowDays: 90 });
  assert.equal(agg.loadsBySkill.size, 0);
  assert.equal(agg.categoriesSeen.has("android"), false);
  assert.deepEqual(loadsByTarget(agg), {});
});

test("loadsByTarget includes category sums", () => {
  const agg = aggregateTelemetry(sample(), { today: TODAY, windowDays: 90 });
  const loads = loadsByTarget(agg);
  assert.equal(loads["nextjs/nextjs-caching"], 44);
  assert.equal(loads["nextjs (category)"], 44);
  assert.equal(loads["golang (category)"], 11);
});

test("readTelemetryFiles reads a file or every .jsonl in a directory, and rejects a missing path", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ags-tel-"));
  try {
    await writeFile(path.join(root, "a.jsonl"), "1\n2\n");
    await writeFile(path.join(root, "b.jsonl"), "3\n");
    await writeFile(path.join(root, "c.jsonl"), "");
    await writeFile(path.join(root, "ignore.txt"), "9\n");
    assert.deepEqual(readTelemetryFiles(path.join(root, "a.jsonl")), ["1", "2"]);
    assert.deepEqual(readTelemetryFiles(path.join(root, "c.jsonl")), []);
    assert.deepEqual(readTelemetryFiles(root), ["1", "2", "3"]);
    assert.throws(() => readTelemetryFiles(path.join(root, "nope.jsonl")), /telemetry path not found/);
  } finally {
    await fs.remove(root);
  }
});
