import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import pkg from "../package.json";
import { SERVER_VERSION } from "../src/server";

/**
 * Version truth tests.
 *
 * `mcp/package.json` is the single source of truth: `SERVER_VERSION` must be
 * derived from it, and `--version` must be the only thing on stdout so shell
 * tooling can parse it without stripping log lines.
 */

const PACKAGE_ROOT = fileURLToPath(new URL("..", import.meta.url));

type CliRun = { status: number | null; stdout: string; stderr: string };

function runVersion(args: readonly string[]): CliRun {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "src/index.ts", ...args],
    {
      cwd: PACKAGE_ROOT,
      encoding: "utf8",
      timeout: 60_000,
      maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env },
    },
  );
  if (result.error) throw result.error;
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

describe("SERVER_VERSION", () => {
  it("equals the mcp/package.json version", () => {
    expect(SERVER_VERSION).toBe(pkg.version);
  });
});

describe("--version", () => {
  it("prints exactly the package version and exits 0", () => {
    const run = runVersion(["--version"]);
    expect(run.status).toBe(0);
    expect(run.stdout).toBe(`${pkg.version}\n`);
    expect(run.stderr).toBe("");
  });

  it("accepts -v as an alias", () => {
    const run = runVersion(["-v"]);
    expect(run.status).toBe(0);
    expect(run.stdout).toBe(`${pkg.version}\n`);
    expect(run.stderr).toBe("");
  });
});
