import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveTelemetry } from "../src/services/telemetryConfig";

describe("resolveTelemetry", () => {
  const dirs: string[] = [];
  afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
  const project = () => { const d = mkdtempSync(path.join(os.tmpdir(), "ags-proj-")); dirs.push(d); return d; };

  it("is off by default with the home-directory path", () => {
    const r = resolveTelemetry(project(), {}, "/home/u");
    expect(r).toEqual({ enabled: false, filePath: path.join("/home/u", ".agent-skills-standard", "telemetry.jsonl"), source: "default" });
  });

  it("env wins: AGS_TELEMETRY=1 enables, =0 disables even when .skillsrc says true", () => {
    const root = project();
    writeFileSync(path.join(root, ".skillsrc"), "registry: https://example.com\ntelemetry: true\n");
    expect(resolveTelemetry(root, { AGS_TELEMETRY: "1" }, "/h").enabled).toBe(true);
    expect(resolveTelemetry(root, { AGS_TELEMETRY: "1" }, "/h").source).toBe("env");
    expect(resolveTelemetry(root, { AGS_TELEMETRY: "0" }, "/h").enabled).toBe(false);
  });

  it("reads telemetry: true from .skillsrc and honors AGS_TELEMETRY_PATH", () => {
    const root = project();
    writeFileSync(path.join(root, ".skillsrc"), "telemetry: true\n");
    const r = resolveTelemetry(root, { AGS_TELEMETRY_PATH: "/tmp/t.jsonl" }, "/h");
    expect(r).toEqual({ enabled: true, filePath: "/tmp/t.jsonl", source: "skillsrc" });
  });

  it("treats a malformed or absent .skillsrc as off", () => {
    const root = project();
    writeFileSync(path.join(root, ".skillsrc"), "telemetry: [unclosed\n");
    expect(resolveTelemetry(root, {}, "/h").enabled).toBe(false);
    expect(resolveTelemetry(project(), {}, "/h").enabled).toBe(false);
  });
});
