import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  isRetrospectiveInvocation,
  runRetrospectiveCli,
  runRetrospectiveCliFromProcess,
  USAGE,
  type CliIo,
} from "../src/retrospective-cli";
import { CONSENT_TEXT, consentFilePath } from "../src/retrospective/consent";
/**
 * Behavioral tests for the packaged retrospective CLI.
 *
 * Every assertion is about what a person at a terminal observes: exit code,
 * stdout JSON and stderr. Nothing reads the CLI's source text.
 * The binary must be built first:
 *   pnpm --filter agent-skills-standard-mcp build
 */

const CLI_PATH = fileURLToPath(new URL("../dist/index.js", import.meta.url));

const PACKAGE_ROOT = fileURLToPath(new URL("..", import.meta.url));

/**
 * Build the packaged CLI for every suite run so no change to a build input,
 * including copied resources or package configuration, can reuse stale output.
 */
async function ensureBuiltCli(): Promise<void> {
  const build = spawnSync("pnpm", ["run", "build"], {
    cwd: PACKAGE_ROOT,
    encoding: "utf8",
    timeout: 300_000,
    maxBuffer: 8 * 1024 * 1024,
    shell: process.platform === "win32",
  });
  if (build.error) throw build.error;
  if (build.status !== 0)
    throw new Error(
      `The packaged CLI could not be built (exit ${String(build.status)}):\n${(
        build.stderr ?? ""
      ).slice(-2_000)}`,
    );
  const rebuilt = await fs.stat(CLI_PATH).catch(() => null);
  if (rebuilt === null)
    throw new Error(`The build did not produce the CLI at ${CLI_PATH}.`);
}

const temporaryRoots: string[] = [];

type CliRun = { status: number | null; stdout: string; stderr: string };

function runCli(args: readonly string[]): CliRun {
  const result = spawnSync(
    process.execPath,
    [CLI_PATH, "retrospective", ...args],
    {
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

async function temporaryDirectory(mode?: number): Promise<string> {
  const base = await fs.realpath(os.tmpdir());
  const directory = await fs.mkdtemp(path.join(base, "ags-retro-cli-"));
  temporaryRoots.push(directory);
  if (mode !== undefined) await fs.chmod(directory, mode);
  return directory;
}

beforeAll(async () => {
  await ensureBuiltCli();
}, 300_000);

afterAll(async () => {
  await Promise.all(
    temporaryRoots.map((directory) =>
      fs.rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("retrospective CLI usage errors", () => {
  it("exits 2 with usage on stdout-free stderr when no command is given", () => {
    const run = runCli([]);
    expect(run.status).toBe(2);
    expect(run.stdout).toBe("");
    expect(run.stderr).toContain("Usage:");
  });

  it("exits 2 for an unknown command and prints no stdout", () => {
    const run = runCli(["publish"]);
    expect(run.status).toBe(2);
    expect(run.stdout).toBe("");
    expect(run.stderr).toContain("Unknown command.");
  });
  it("fails removed commands as unknown commands with exit code 2", () => {
    const expectedStderr = `Unknown command.\n\n${USAGE}\n`;
    for (const command of ["prepare", "status", "paths", "delete"]) {
      const run = runCli([command]);
      expect(run.status).toBe(2);
      expect(run.stdout).toBe("");
      expect(run.stderr).toBe(expectedStderr);
    }
  });

  it("exits 2 for an unknown option", () => {
    const run = runCli(["disable", "--nope"]);
    expect(run.status).toBe(2);
    expect(run.stdout).toBe("");
  });

  it("exits 2 for a flag that belongs to another command", () => {
    const run = runCli(["disable", "--store-root", "/tmp/x"]);
    expect(run.status).toBe(2);
    expect(run.stdout).toBe("");
  });

  it("prints usage to stdout and exits 0 for --help", () => {
    const run = runCli(["--help"]);
    expect(run.status).toBe(0);
    expect(run.stderr).toBe("");
    expect(run.stdout).toContain("agent-skills-standard-mcp retrospective");
    expect(run.stdout).toContain("must not be invoked automatically");
  });
});

describe("isRetrospectiveInvocation", () => {
  it("recognizes retrospective subcommand at argv[2]", () => {
    expect(
      isRetrospectiveInvocation([
        "node",
        "index.js",
        "retrospective",
        "enable",
      ]),
    ).toBe(true);
    expect(isRetrospectiveInvocation(["node", "index.js"])).toBe(false);
    expect(isRetrospectiveInvocation(["node", "index.js", "--foo"])).toBe(
      false,
    );
    expect(
      isRetrospectiveInvocation(["node", "index.js", "retrospectives"]),
    ).toBe(false);
  });
});

describe("runRetrospectiveCliFromProcess dispatch", () => {
  it("consent-status returns disabled JSON with exit code 0", async () => {
    const tempHome = await temporaryDirectory();
    const tempConfig = path.join(tempHome, "config");
    await fs.mkdir(tempConfig, { recursive: true });
    const originalHome = process.env.HOME;
    const originalXdg = process.env.XDG_CONFIG_HOME;
    const stdoutChunks: string[] = [];
    const originalStdoutWrite = process.stdout.write;
    process.env.HOME = tempHome;
    process.env.XDG_CONFIG_HOME = tempConfig;
    process.stdout.write = ((chunk: string | Uint8Array) => {
      stdoutChunks.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      const code = await runRetrospectiveCliFromProcess(["consent-status"]);
      expect(code).toBe(0);
      const output = JSON.parse(stdoutChunks.join("").trim());
      expect(output).toEqual({
        schemaVersion: 1,
        state: "disabled",
        reason: "missing",
      });
    } finally {
      process.stdout.write = originalStdoutWrite;
      if (originalHome !== undefined) process.env.HOME = originalHome;
      else delete process.env.HOME;
      if (originalXdg !== undefined) process.env.XDG_CONFIG_HOME = originalXdg;
      else delete process.env.XDG_CONFIG_HOME;
    }
  });
});

describe("retrospective CLI consent commands", () => {
  type TestHarness = {
    tempHome: string;
    tempConfig: string;
    storeDir: string;
    sourceDir: string;
    targetConsentPath: string;
    createIo: (overrides?: Partial<CliIo>) => {
      io: CliIo;
      getWritten: () => string;
    };
  };

  async function setupHarness(): Promise<TestHarness> {
    const tempHome = await temporaryDirectory();
    const tempConfig = path.join(tempHome, "custom-config");
    await fs.mkdir(tempConfig, { recursive: true });
    const storeDir = path.join(tempHome, "store");
    await fs.mkdir(storeDir, { recursive: true, mode: 0o700 });
    const sourceDir = path.join(tempHome, "sessions");
    await fs.mkdir(sourceDir, { recursive: true });
    const targetConsentPath = consentFilePath(
      { XDG_CONFIG_HOME: tempConfig },
      process.platform,
      tempHome,
    );

    const createIo = (overrides?: Partial<CliIo>) => {
      let written = "";
      const io: CliIo = {
        isTTY: true,
        ask: async () => "yes",
        write: (text: string) => {
          written += text;
        },
        env: { XDG_CONFIG_HOME: tempConfig },
        platform: process.platform,
        home: tempHome,
        ...overrides,
      };
      return { io, getWritten: () => written };
    };

    return {
      tempHome,
      tempConfig,
      storeDir,
      sourceDir,
      targetConsentPath,
      createIo,
    };
  }

  it("enable with isTTY: false -> code 1, TTY_REQUIRED, and no file exists afterwards", async () => {
    const { storeDir, sourceDir, targetConsentPath, createIo } =
      await setupHarness();
    const { io } = createIo({ isTTY: false });
    const outcome = await runRetrospectiveCli(
      ["enable", "--store-root", storeDir, "--source-root", sourceDir],
      io,
    );
    expect(outcome.code).toBe(1);
    expect(JSON.parse(outcome.stderr)).toEqual({
      schemaVersion: 1,
      error: { code: "TTY_REQUIRED" },
    });
    expect(outcome.stdout).toBe("");
    const exists = await fs
      .access(targetConsentPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(false);
  });

  it("enable with TTY and ask returning yes -> code 0, file exists, consent-status reports enabled", async () => {
    const { storeDir, sourceDir, targetConsentPath, createIo } =
      await setupHarness();
    const { io } = createIo({ isTTY: true, ask: async () => "yes" });
    const outcome = await runRetrospectiveCli(
      ["enable", "--store-root", storeDir, "--source-root", sourceDir],
      io,
    );
    expect(outcome.code).toBe(0);
    expect(outcome.stdout).toBe('{"schemaVersion":1,"enabled":true}\n');
    expect(outcome.stderr).toBe("");
    const exists = await fs
      .access(targetConsentPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);

    const statusOutcome = await runRetrospectiveCli(["consent-status"], io);
    expect(statusOutcome.code).toBe(0);
    expect(JSON.parse(statusOutcome.stdout)).toEqual({
      schemaVersion: 1,
      state: "enabled",
      storeRoot: storeDir,
      allowedSourceRoots: [sourceDir],
    });
  });

  it("ask returning no / empty / YES please -> CONSENT_DECLINED, no file", async () => {
    for (const answer of ["no", "", "YES please"]) {
      const { storeDir, sourceDir, targetConsentPath, createIo } =
        await setupHarness();
      const { io } = createIo({ isTTY: true, ask: async () => answer });
      const outcome = await runRetrospectiveCli(
        ["enable", "--store-root", storeDir, "--source-root", sourceDir],
        io,
      );
      expect(outcome.code).toBe(1);
      expect(JSON.parse(outcome.stderr)).toEqual({
        schemaVersion: 1,
        error: { code: "CONSENT_DECLINED" },
      });
      const exists = await fs
        .access(targetConsentPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    }
  });

  it("--source-root that does not exist -> code 2, no file", async () => {
    const { tempHome, storeDir, targetConsentPath, createIo } =
      await setupHarness();
    const nonExistent = path.join(tempHome, "does-not-exist");
    const { io } = createIo({ isTTY: true, ask: async () => "yes" });
    const outcome = await runRetrospectiveCli(
      ["enable", "--store-root", storeDir, "--source-root", nonExistent],
      io,
    );
    expect(outcome.code).toBe(2);
    expect(outcome.stderr).toContain("Usage:");
    const exists = await fs
      .access(targetConsentPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(false);
  });

  it("repeated --source-root replaces the defaults", async () => {
    const { tempHome, storeDir, createIo } = await setupHarness();
    const defaultOmp = path.join(tempHome, ".omp", "agent", "sessions");
    await fs.mkdir(defaultOmp, { recursive: true });
    const src1 = path.join(tempHome, "src1");
    const src2 = path.join(tempHome, "src2");
    await fs.mkdir(src1, { recursive: true });
    await fs.mkdir(src2, { recursive: true });

    const { io } = createIo({ isTTY: true, ask: async () => "yes" });
    const outcome = await runRetrospectiveCli(
      [
        "enable",
        "--store-root",
        storeDir,
        "--source-root",
        src1,
        "--source-root",
        src2,
      ],
      io,
    );
    expect(outcome.code).toBe(0);

    const statusOutcome = await runRetrospectiveCli(["consent-status"], io);
    expect(JSON.parse(statusOutcome.stdout)).toEqual({
      schemaVersion: 1,
      state: "enabled",
      storeRoot: storeDir,
      allowedSourceRoots: [src1, src2],
    });
  });

  it("default roots that exist are proposed when no --source-root given", async () => {
    const { tempHome, storeDir, createIo } = await setupHarness();
    const defaultOmp = path.join(tempHome, ".omp", "agent", "sessions");
    const defaultCodex = path.join(tempHome, ".codex", "sessions");
    await fs.mkdir(defaultOmp, { recursive: true });
    await fs.mkdir(defaultCodex, { recursive: true });

    const { io } = createIo({ isTTY: true, ask: async () => "yes" });
    const outcome = await runRetrospectiveCli(
      ["enable", "--store-root", storeDir],
      io,
    );
    expect(outcome.code).toBe(0);

    const statusOutcome = await runRetrospectiveCli(["consent-status"], io);
    expect(JSON.parse(statusOutcome.stdout)).toEqual({
      schemaVersion: 1,
      state: "enabled",
      storeRoot: storeDir,
      allowedSourceRoots: [defaultOmp, defaultCodex],
    });
  });

  it("disable removes and is idempotent; works with isTTY: false", async () => {
    const { storeDir, sourceDir, targetConsentPath, createIo } =
      await setupHarness();
    const { io: enableIo } = createIo({ isTTY: true, ask: async () => "yes" });
    await runRetrospectiveCli(
      ["enable", "--store-root", storeDir, "--source-root", sourceDir],
      enableIo,
    );
    expect(
      await fs
        .access(targetConsentPath)
        .then(() => true)
        .catch(() => false),
    ).toBe(true);

    const { io: disableIo } = createIo({ isTTY: false });
    const disable1 = await runRetrospectiveCli(["disable"], disableIo);
    expect(disable1.code).toBe(0);
    expect(JSON.parse(disable1.stdout)).toEqual({
      schemaVersion: 1,
      enabled: false,
      removed: true,
    });
    expect(
      await fs
        .access(targetConsentPath)
        .then(() => true)
        .catch(() => false),
    ).toBe(false);

    const disable2 = await runRetrospectiveCli(["disable"], disableIo);
    expect(disable2.code).toBe(0);
    expect(JSON.parse(disable2.stdout)).toEqual({
      schemaVersion: 1,
      enabled: false,
      removed: false,
    });
  });

  it("consent-status with no file -> code 0, state: disabled", async () => {
    const { createIo } = await setupHarness();
    const { io } = createIo();
    const outcome = await runRetrospectiveCli(["consent-status"], io);
    expect(outcome.code).toBe(0);
    expect(JSON.parse(outcome.stdout)).toEqual({
      schemaVersion: 1,
      state: "disabled",
      reason: "missing",
    });
  });

  it("--store-root on a verb other than enable -> code 2", async () => {
    const { storeDir, createIo } = await setupHarness();
    const { io } = createIo();
    const outcomeIndex = await runRetrospectiveCli(
      ["index", "--store-root", storeDir],
      io,
    );
    expect(outcomeIndex.code).toBe(2);
    expect(outcomeIndex.stderr).toContain("Usage:");

    const outcomeDisable = await runRetrospectiveCli(
      ["disable", "--store-root", storeDir],
      io,
    );
    expect(outcomeDisable.code).toBe(2);

    const outcomeConsentStatus = await runRetrospectiveCli(
      ["consent-status", "--store-root", storeDir],
      io,
    );
    expect(outcomeConsentStatus.code).toBe(2);
  });

  it("the prompt text goes to io.write and stdout contains ONLY the JSON line", async () => {
    const { storeDir, sourceDir, createIo } = await setupHarness();
    const { io, getWritten } = createIo({
      isTTY: true,
      ask: async () => "yes",
    });
    const outcome = await runRetrospectiveCli(
      ["enable", "--store-root", storeDir, "--source-root", sourceDir],
      io,
    );
    expect(outcome.code).toBe(0);
    expect(outcome.stdout).toBe('{"schemaVersion":1,"enabled":true}\n');
    expect(outcome.stderr).toBe("");
    const written = getWritten();
    expect(written).toContain(CONSENT_TEXT);
    expect(written).toContain(storeDir);
    expect(written).toContain(sourceDir);
    expect(written).toContain('Type "yes" to enable');
  });

  it.skipIf(process.platform === "win32")(
    "consent-status for a permissive file reports disabled with reason permissive",
    async () => {
      const { storeDir, sourceDir, targetConsentPath, createIo } =
        await setupHarness();
      const { io: enableIo } = createIo({
        isTTY: true,
        ask: async () => "yes",
      });
      await runRetrospectiveCli(
        ["enable", "--store-root", storeDir, "--source-root", sourceDir],
        enableIo,
      );
      await fs.chmod(targetConsentPath, 0o644);

      const { io } = createIo();
      const outcome = await runRetrospectiveCli(["consent-status"], io);
      expect(outcome.code).toBe(0);
      expect(JSON.parse(outcome.stdout)).toEqual({
        schemaVersion: 1,
        state: "disabled",
        reason: "permissive",
      });
    },
  );
});

describe("retrospective CLI index", () => {
  type TestHarness = {
    tempHome: string;
    tempConfig: string;
    storeDir: string;
    sourceDir: string;
    targetConsentPath: string;
    createIo: (overrides?: Partial<CliIo>) => {
      io: CliIo;
      getWritten: () => string;
    };
  };

  async function setupHarness(): Promise<TestHarness> {
    const tempHome = await temporaryDirectory();
    const tempConfig = path.join(tempHome, "custom-config");
    await fs.mkdir(tempConfig, { recursive: true });
    const storeDir = path.join(tempHome, "store");
    await fs.mkdir(storeDir, { recursive: true, mode: 0o700 });
    const sourceDir = path.join(tempHome, "sessions");
    await fs.mkdir(sourceDir, { recursive: true });
    const targetConsentPath = consentFilePath(
      { XDG_CONFIG_HOME: tempConfig },
      process.platform,
      tempHome,
    );

    const createIo = (overrides?: Partial<CliIo>) => {
      let written = "";
      const io: CliIo = {
        isTTY: true,
        ask: async () => "yes",
        write: (text: string) => {
          written += text;
        },
        env: { XDG_CONFIG_HOME: tempConfig },
        platform: process.platform,
        home: tempHome,
        ...overrides,
      };
      return { io, getWritten: () => written };
    };

    return {
      tempHome,
      tempConfig,
      storeDir,
      sourceDir,
      targetConsentPath,
      createIo,
    };
  }

  it("--help includes index command in usage", async () => {
    const { createIo } = await setupHarness();
    const { io } = createIo();
    const outcome = await runRetrospectiveCli(["--help"], io);
    expect(outcome.code).toBe(0);
    expect(outcome.stdout).toContain(
      "agent-skills-standard-mcp retrospective index [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--folder NAME]",
    );
  });

  it("index with no consent file -> code 0, state: disabled", async () => {
    const { createIo } = await setupHarness();
    const { io } = createIo();
    const outcome = await runRetrospectiveCli(["index"], io);
    expect(outcome.code).toBe(0);
    expect(outcome.stderr).toBe("");
    expect(JSON.parse(outcome.stdout)).toEqual({
      schemaVersion: 1,
      state: "disabled",
      reason: "missing",
    });
  });

  it("index with invalid date -> code 1, stderr has INVALID_DATE", async () => {
    const { createIo } = await setupHarness();
    const { io } = createIo();
    const outcome = await runRetrospectiveCli(
      ["index", "--since", "2026-99-99"],
      io,
    );
    expect(outcome.code).toBe(1);
    expect(outcome.stdout).toBe("");
    expect(JSON.parse(outcome.stderr)).toEqual({
      schemaVersion: 1,
      error: { code: "INVALID_DATE" },
    });
  });

  it("index with invalid range (since > until) -> code 1, stderr has INVALID_RANGE", async () => {
    const { createIo } = await setupHarness();
    const { io } = createIo();
    const outcome = await runRetrospectiveCli(
      ["index", "--since", "2026-10-25", "--until", "2026-10-01"],
      io,
    );
    expect(outcome.code).toBe(1);
    expect(outcome.stdout).toBe("");
    expect(JSON.parse(outcome.stderr)).toEqual({
      schemaVersion: 1,
      error: { code: "INVALID_RANGE" },
    });
  });

  it("index with invalid folder (control character) -> code 1, stderr has INVALID_FOLDER", async () => {
    const { createIo } = await setupHarness();
    const { io } = createIo();
    const outcome = await runRetrospectiveCli(
      ["index", "--folder", "bad\x01folder"],
      io,
    );
    expect(outcome.code).toBe(1);
    expect(outcome.stdout).toBe("");
    expect(JSON.parse(outcome.stderr)).toEqual({
      schemaVersion: 1,
      error: { code: "INVALID_FOLDER" },
    });
  });

  it("index with unknown flag -> code 2 (usage error)", async () => {
    const { createIo } = await setupHarness();
    const { io } = createIo();
    const outcome = await runRetrospectiveCli(
      ["index", "--root", "/tmp/store"],
      io,
    );
    expect(outcome.code).toBe(2);
    expect(outcome.stderr).toContain("Invalid arguments.");
  });

  it("starting the packaged bin without arguments serves MCP and does not run the retrospective CLI", () => {
    const initialize = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "spec", version: "0" },
      },
    });
    const result = spawnSync(process.execPath, [CLI_PATH], {
      encoding: "utf8",
      input: `${initialize}\n`,
      timeout: 8_000,
      env: { ...process.env },
    });
    expect(result.stdout).toContain('"serverInfo"');
    expect(result.stderr).not.toContain("A command is required");
  });

  it("index with enabled consent produces written state with counts and date range", async () => {
    const { storeDir, sourceDir, createIo } = await setupHarness();
    const { io: enableIo } = createIo({
      isTTY: true,
      ask: async () => "yes",
    });
    await runRetrospectiveCli(
      ["enable", "--store-root", storeDir, "--source-root", sourceDir],
      enableIo,
    );

    const { io } = createIo();
    const outcome = await runRetrospectiveCli(
      ["index", "--since", "2026-10-01", "--until", "2026-10-31"],
      io,
    );
    expect(outcome.code).toBe(0);
    expect(outcome.stderr).toBe("");
    const parsed = JSON.parse(outcome.stdout);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.state).toBe("written");
    expect(typeof parsed.path).toBe("string");
    expect(path.isAbsolute(parsed.path)).toBe(true);
    expect(path.basename(parsed.path)).toBe("index.html");
    expect(typeof parsed.sessions).toBe("number");
    expect(typeof parsed.omitted).toBe("number");
    expect(typeof parsed.unreadable).toBe("number");
    expect(parsed.since).toBe("2026-10-01");
    expect(parsed.until).toBe("2026-10-31");
  });
});
