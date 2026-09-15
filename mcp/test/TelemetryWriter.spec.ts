import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SessionTracker } from "../src/services/SessionTracker";
import { TelemetryWriter, buildTelemetryRecord } from "../src/services/TelemetryWriter";

function tracker(): SessionTracker {
  const t = new SessionTracker();
  t.record({ via: "load_skills_for_files", input: ["src/app.ts"], loaded: ["typescript/typescript-language", "nestjs/nestjs-architecture"] });
  t.record({ via: "load_skills_for_keywords", input: ["jwt"], loaded: ["typescript/typescript-language"], dedupedSkills: ["typescript/typescript-language"] });
  t.record({ via: "get_workflow", input: ["dev-fix"], loaded: ["workflow/dev-fix"] });
  t.record({ via: "load_skills_for_keywords", input: ["nothing"], loaded: [] });
  t.record({ via: "get_category_guide", input: ["nestjs"], loaded: ["category/nestjs"] });
  return t;
}

describe("buildTelemetryRecord", () => {
  it("counts skill and workflow loads, tool calls, and no-match calls", () => {
    const record = buildTelemetryRecord(tracker(), { mcpVersion: "0.6.0", now: new Date() });
    expect(record.skills).toEqual({ "typescript/typescript-language": 2, "nestjs/nestjs-architecture": 1 });
    expect(record.workflows).toEqual({ "workflow/dev-fix": 1 });
    expect(record.callsByTool.load_skills_for_keywords).toBe(2);
    expect(record.noMatchCalls).toBe(1);
    expect(record.mcpVersion).toBe("0.6.0");
    const serialized = JSON.stringify(record);
    expect(serialized).not.toContain("src/app.ts");
    expect(serialized).not.toContain("jwt");
    expect(serialized).not.toContain("nothing");
  });

  it("buckets category guide loads separately from skills", () => {
    const record = buildTelemetryRecord(tracker(), { mcpVersion: "0.6.0", now: new Date() });
    expect(record.categories).toEqual({ "category/nestjs": 1 });
    expect(Object.keys(record.skills).some((key) => key.startsWith("category/"))).toBe(false);
  });
});

describe("TelemetryWriter", () => {
  const dirs: string[] = [];
  afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });

  it("appends one JSON line per flush, creating the directory", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "ags-telemetry-"));
    dirs.push(dir);
    const filePath = path.join(dir, "nested", "telemetry.jsonl");
    const writer = new TelemetryWriter({ enabled: true, filePath });
    const record = buildTelemetryRecord(tracker(), { mcpVersion: "0.6.0" });
    expect(writer.flush(record)).toBe(true);
    expect(writer.flush(record)).toBe(true);
    const lines = readFileSync(filePath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).skills["nestjs/nestjs-architecture"]).toBe(1);
  });

  it("does nothing when disabled and never throws on an unwritable path", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "ags-telemetry-"));
    dirs.push(dir);
    const filePath = path.join(dir, "telemetry.jsonl");
    const record = buildTelemetryRecord(tracker(), { mcpVersion: "0.6.0" });
    expect(new TelemetryWriter({ enabled: false, filePath }).flush(record)).toBe(false);
    expect(existsSync(filePath)).toBe(false);
    // A path whose parent is a file cannot be created.
    const blocked = path.join(filePath, "child.jsonl");
    new TelemetryWriter({ enabled: true, filePath }).flush(record);
    expect(new TelemetryWriter({ enabled: true, filePath: blocked }).flush(record)).toBe(false);
  });
});
