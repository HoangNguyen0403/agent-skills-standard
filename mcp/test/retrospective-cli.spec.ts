import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runRetrospectiveCli, type CliIo } from "../src/retrospective-cli";
import { CONSENT_TEXT, consentFilePath } from "../src/retrospective";

/**
 * Behavioral tests for the packaged `ags-retrospective` binary.
 *
 * Every assertion is about what a person at a terminal observes: exit code,
 * stdout JSON and stderr. Nothing reads the CLI's source text, and nothing
 * expects report content or a filesystem path on stdout except `paths`.
 *
 * The binary must be built first:
 *   pnpm --filter agent-skills-standard-mcp build
 */

const CLI_PATH = fileURLToPath(
  new URL("../dist/retrospective-cli.js", import.meta.url),
);
const FIXTURE_PATH = fileURLToPath(
  new URL("./fixtures/retrospective/native-events.jsonl", import.meta.url),
);
const CUTOFF = "2026-10-01T10:10:00.000Z";
const HOST_ID = "host-main";
const SESSION_ID = "main-session";
const CHILD_SESSION_ID = "child-session";

/** Sentinels present in the fixture; none may reach stdout on any command. */
const SENTINELS = [
  "PRIVATE_THINKING_SENTINEL",
  "PRIVATE_TEXT_SENTINEL",
  "PRIVATE_OUTPUT_SENTINEL",
  "PRIVATE_COMMAND_SENTINEL",
  "PRIVATE_SYSTEM_SENTINEL",
  "PRIVATE_USER_SENTINEL",
];

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
  const result = spawnSync(process.execPath, [CLI_PATH, ...args], {
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env },
  });
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

function manifestDocument(
  options: { childDisposition?: "restricted" | "unavailable" } = {},
): unknown {
  const nodes: unknown[] = [
    {
      key: { hostId: HOST_ID, sessionId: SESSION_ID },
      parent: null,
      disposition: "local-allowed",
      source: { format: "omp", absolutePath: FIXTURE_PATH },
    },
  ];
  if (options.childDisposition !== undefined) {
    nodes.push({
      key: { hostId: HOST_ID, sessionId: CHILD_SESSION_ID },
      parent: { hostId: HOST_ID, sessionId: SESSION_ID },
      disposition: options.childDisposition,
      source: null,
    });
  }
  return {
    schemaVersion: 1,
    provenance: "user-supplied",
    main: { hostId: HOST_ID, sessionId: SESSION_ID },
    checkpointId:
      options.childDisposition === undefined
        ? "checkpoint-cli-1"
        : "checkpoint-cli-partial",
    cutoff: CUTOFF,
    nodes,
  };
}

async function writeManifest(
  directory: string,
  document: unknown,
  name = "manifest.json",
): Promise<string> {
  const target = path.join(directory, name);
  await fs.writeFile(target, `${JSON.stringify(document)}\n`, "utf8");
  return target;
}

function receipt(run: CliRun): unknown {
  expect(run.status).toBe(0);
  const lines = run.stdout.split("\n").filter((line) => line !== "");
  expect(lines).toHaveLength(1);
  return JSON.parse(lines[0]!);
}

/** One field of parsed JSON read without trusting an unchecked shape. */
function jsonField(value: unknown, key: string): unknown {
  if (value === null || typeof value !== "object")
    throw new Error("Expected a JSON object.");
  return Reflect.get(value, key);
}

function jsonString(value: unknown, key: string): string {
  const field = jsonField(value, key);
  if (typeof field !== "string")
    throw new Error(`Expected string field: ${key}`);
  return field;
}

function jsonKeys(value: unknown): string[] {
  if (value === null || typeof value !== "object") return [];
  return Object.keys(value);
}

function expectNoSentinels(run: CliRun): void {
  for (const sentinel of SENTINELS) {
    expect(run.stdout).not.toContain(sentinel);
    expect(run.stderr).not.toContain(sentinel);
  }
}

function failureCode(run: CliRun): string {
  const code = jsonField(
    jsonField(JSON.parse(run.stderr.trim()), "error"),
    "code",
  );
  return typeof code === "string" ? code : "";
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

describe("ags-retrospective usage errors", () => {
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

  it("exits 2 for an unknown option", () => {
    const run = runCli([
      "status",
      "--root",
      "/tmp/x",
      "--artifact",
      "a.report",
      "--nope",
    ]);
    expect(run.status).toBe(2);
    expect(run.stdout).toBe("");
  });

  it("exits 2 for a flag that belongs to another command", async () => {
    const run = runCli([
      "status",
      "--root",
      await temporaryDirectory(),
      "--artifact",
      "run-1.report",
      "--manifest",
      "/tmp/x.json",
    ]);
    expect(run.status).toBe(2);
    expect(run.stdout).toBe("");
  });

  it("exits 2 for a relative --root", async () => {
    const directory = await temporaryDirectory();
    const manifestPath = await writeManifest(directory, manifestDocument());
    const run = runCli([
      "prepare",
      "--manifest",
      manifestPath,
      "--consent",
      "local-only",
      "--ack-storage-risk",
      "--root",
      "relative/root",
    ]);
    expect(run.status).toBe(2);
    expect(run.stdout).toBe("");
    expect(run.stderr).toContain("--root must be an absolute path.");
  });

  it("exits 2 for a missing --root on read commands", () => {
    const run = runCli(["paths", "--artifact", "run-1.report"]);
    expect(run.status).toBe(2);
    expect(run.stdout).toBe("");
  });

  it("prints usage to stdout and exits 0 for --help", () => {
    const run = runCli(["--help"]);
    expect(run.status).toBe(0);
    expect(run.stderr).toBe("");
    expect(run.stdout).toContain("ags-retrospective");
    expect(run.stdout).toContain("must not be invoked automatically");
  });
});

describe("ags-retrospective prepare refusals", () => {
  it("refuses without an explicit consent value", async () => {
    const directory = await temporaryDirectory();
    const manifestPath = await writeManifest(directory, manifestDocument());
    const run = runCli([
      "prepare",
      "--manifest",
      manifestPath,
      "--ack-storage-risk",
      "--root",
      await temporaryDirectory(),
    ]);
    expect(run.status).toBe(1);
    expect(run.stdout).toBe("");
    expect(failureCode(run)).toBe("CONSENT_REQUIRED");
    expect(run.stderr).not.toContain(manifestPath);
    expectNoSentinels(run);
  });

  it("refuses a consent value other than local-only", async () => {
    const directory = await temporaryDirectory();
    const manifestPath = await writeManifest(directory, manifestDocument());
    const run = runCli([
      "prepare",
      "--manifest",
      manifestPath,
      "--consent",
      "hosted",
      "--ack-storage-risk",
      "--root",
      await temporaryDirectory(),
    ]);
    expect(run.status).toBe(1);
    expect(failureCode(run)).toBe("CONSENT_MODE_REFUSED");
  });

  it("refuses an unsupported processing mode without collecting", async () => {
    const directory = await temporaryDirectory();
    const manifestPath = await writeManifest(directory, manifestDocument());
    const run = runCli([
      "prepare",
      "--manifest",
      manifestPath,
      "--consent",
      "local-only",
      "--mode",
      "local-model",
      "--ack-storage-risk",
      "--root",
      await temporaryDirectory(),
    ]);
    expect(run.status).toBe(1);
    expect(run.stdout).toBe("");
    expect(failureCode(run)).toBe("MODE_UNAVAILABLE");
  });

  it("refuses when the storage risk was not acknowledged", async () => {
    const directory = await temporaryDirectory();
    const manifestPath = await writeManifest(directory, manifestDocument());
    const run = runCli([
      "prepare",
      "--manifest",
      manifestPath,
      "--consent",
      "local-only",
      "--root",
      await temporaryDirectory(),
    ]);
    expect(run.status).toBe(1);
    expect(run.stdout).toBe("");
    expect(failureCode(run)).toBe("STORAGE_RISK_NOT_ACKNOWLEDGED");
  });

  it("refuses a malformed manifest without echoing its path or the parser error", async () => {
    const directory = await temporaryDirectory();
    const manifestPath = path.join(directory, "broken.json");
    await fs.writeFile(manifestPath, "{ not json\n", "utf8");
    const run = runCli([
      "prepare",
      "--manifest",
      manifestPath,
      "--consent",
      "local-only",
      "--ack-storage-risk",
      "--root",
      await temporaryDirectory(),
    ]);
    expect(run.status).toBe(1);
    expect(run.stdout).toBe("");
    expect(failureCode(run)).toBe("MANIFEST_INVALID");
    expect(run.stderr).not.toContain(manifestPath);
    expect(run.stderr).not.toContain("broken.json");
  });

  it("refuses an otherwise-valid manifest over the byte ceiling", async () => {
    const directory = await temporaryDirectory();
    const validPath = path.join(directory, "valid.json");
    const oversizedPath = path.join(directory, "oversized.json");
    const document = `${JSON.stringify(manifestDocument())}\n`;
    // JSON-legal trailing whitespace: the document still parses and validates
    // against the strict schema, so only the byte ceiling can explain a refusal.
    const oversized = `${document}${" ".repeat(300_000)}\n`;
    expect(Buffer.byteLength(document, "utf8")).toBeLessThan(262_144);
    expect(Buffer.byteLength(oversized, "utf8")).toBeGreaterThan(262_144);
    await fs.writeFile(validPath, document, "utf8");
    await fs.writeFile(oversizedPath, oversized, "utf8");

    const accepted = receipt(
      runCli([
        "prepare",
        "--manifest",
        validPath,
        "--consent",
        "local-only",
        "--ack-storage-risk",
        "--root",
        await temporaryDirectory(),
      ]),
    );
    expect(accepted).toMatchObject({ status: "complete" });

    const refused = runCli([
      "prepare",
      "--manifest",
      oversizedPath,
      "--consent",
      "local-only",
      "--ack-storage-risk",
      "--root",
      await temporaryDirectory(),
    ]);
    expect(refused.status).toBe(1);
    expect(refused.stdout).toBe("");
    expect(failureCode(refused)).toBe("MANIFEST_INVALID");
    expect(refused.stderr).not.toContain(oversizedPath);
  });

  it.skipIf(process.platform === "win32")(
    "refuses a POSIX-permissive root without printing the root path",
    async () => {
      const directory = await temporaryDirectory();
      const manifestPath = await writeManifest(directory, manifestDocument());
      const unsafeRoot = await temporaryDirectory(0o755);
      const run = runCli([
        "prepare",
        "--manifest",
        manifestPath,
        "--consent",
        "local-only",
        "--ack-storage-risk",
        "--root",
        unsafeRoot,
      ]);
      expect(run.status).toBe(1);
      expect(run.stdout).toBe("");
      expect(failureCode(run)).toBe("ROOT_PERMISSIVE");
      expect(run.stderr).not.toContain(unsafeRoot);
    },
  );

  it.skipIf(process.platform !== "win32")(
    "refuses a reparse-point root through the Windows ACL helper",
    async () => {
      const directory = await temporaryDirectory();
      const manifestPath = await writeManifest(directory, manifestDocument());
      const target = await temporaryDirectory();
      const junction = path.join(directory, "junction-root");
      await fs.symlink(target, junction, "junction");
      const run = runCli([
        "prepare",
        "--manifest",
        manifestPath,
        "--consent",
        "local-only",
        "--ack-storage-risk",
        "--root",
        junction,
      ]);
      expect(run.status).toBe(1);
      expect(run.stdout).toBe("");
      expect(failureCode(run)).toBe("WINDOWS_REPARSE_POINT");
      expect(run.stderr).not.toContain(junction);
    },
  );

  it("refuses a filesystem root as the store root", async () => {
    const directory = await temporaryDirectory();
    const manifestPath = await writeManifest(directory, manifestDocument());
    const run = runCli([
      "prepare",
      "--manifest",
      manifestPath,
      "--consent",
      "local-only",
      "--ack-storage-risk",
      "--root",
      path.parse(await temporaryDirectory()).root,
    ]);
    expect(run.status).toBe(1);
    expect(failureCode(run)).toBe("INVALID_ROOT_PATH");
  });
});

describe("ags-retrospective prepare and read commands", () => {
  it("prints a minimal receipt only, and status never returns evidence", async () => {
    const directory = await temporaryDirectory();
    const manifestPath = await writeManifest(directory, manifestDocument());
    const root = await temporaryDirectory();

    const prepared = runCli([
      "prepare",
      "--manifest",
      manifestPath,
      "--consent",
      "local-only",
      "--ack-storage-risk",
      "--root",
      root,
    ]);
    const receiptBody = receipt(prepared);
    expect(prepared.stderr).toBe("");
    expect(jsonKeys(receiptBody).sort()).toEqual([
      "artifactId",
      "modelCalls",
      "outboundRequests",
      "runId",
      "schemaVersion",
      "status",
    ]);
    expect(receiptBody).toMatchObject({
      schemaVersion: 1,
      status: "complete",
      modelCalls: 0,
      outboundRequests: 0,
    });
    const artifactId = jsonString(receiptBody, "artifactId");
    expect(artifactId).toMatch(/\.report$/);
    expect(prepared.stdout).not.toContain(root);
    expect(prepared.stdout).not.toContain("report.md");
    expectNoSentinels(prepared);

    const status = runCli(["status", "--root", root, "--artifact", artifactId]);
    expect(status.status).toBe(0);
    expect(status.stderr).toBe("");
    expect(JSON.parse(status.stdout)).toEqual({
      schemaVersion: 1,
      artifactId,
      kind: "report",
      status: "complete",
    });
    expectNoSentinels(status);

    const paths = runCli(["paths", "--root", root, "--artifact", artifactId]);
    expect(paths.status).toBe(0);
    expect(paths.stderr).toBe("");
    const pathsBody: unknown = JSON.parse(paths.stdout);
    expect(jsonKeys(pathsBody).sort()).toEqual([
      "proposals",
      "report",
      "session",
    ]);
    const reportPath = jsonString(pathsBody, "report");
    expect(path.isAbsolute(reportPath)).toBe(true);
    expect(path.basename(reportPath)).toBe("report.md");
    expect(reportPath.startsWith(root)).toBe(true);
    expect(jsonString(pathsBody, "proposals")).not.toBe("");
    expect(jsonString(pathsBody, "session")).not.toBe("");
    const reportBytes = await fs.readFile(reportPath, "utf8");
    expect(reportBytes.length).toBeGreaterThan(0);
    // The human-only channel is the only place report text exists.
    expect(paths.stdout).not.toContain(reportBytes.trim().slice(0, 40));
    expectNoSentinels(paths);
  });

  it("labels a restricted child as partial and still exits 0", async () => {
    const directory = await temporaryDirectory();
    const manifestPath = await writeManifest(
      directory,
      manifestDocument({ childDisposition: "restricted" }),
      "partial.json",
    );
    const root = await temporaryDirectory();
    const prepared = runCli([
      "prepare",
      "--manifest",
      manifestPath,
      "--consent",
      "local-only",
      "--ack-storage-risk",
      "--root",
      root,
    ]);
    const receiptBody = receipt(prepared);
    expect(receiptBody).toMatchObject({ status: "partial" });
    expect(prepared.stderr).toBe("");
    expectNoSentinels(prepared);

    const status = runCli([
      "status",
      "--root",
      root,
      "--artifact",
      jsonString(receiptBody, "artifactId"),
    ]);
    expect(status.status).toBe(0);
    expect(JSON.parse(status.stdout)).toMatchObject({ status: "partial" });
  });

  it("reports an unknown artifact as a refusal, not a crash", async () => {
    const root = await temporaryDirectory();
    const run = runCli([
      "status",
      "--root",
      root,
      "--artifact",
      "run-missing.report",
    ]);
    expect(run.status).toBe(1);
    expect(run.stdout).toBe("");
    expect(failureCode(run)).toBe("ARTIFACT_NOT_FOUND");
  });
});

describe("ags-retrospective delete", () => {
  it("requires --confirm before touching the store", async () => {
    const root = await temporaryDirectory();
    const run = runCli([
      "delete",
      "--root",
      root,
      "--session",
      SESSION_ID,
      "--host",
      HOST_ID,
    ]);
    expect(run.status).toBe(1);
    expect(run.stdout).toBe("");
    expect(failureCode(run)).toBe("CONFIRMATION_REQUIRED");
  });

  it("deletes only the managed generation and leaves nothing resolvable", async () => {
    const directory = await temporaryDirectory();
    const manifestPath = await writeManifest(directory, manifestDocument());
    const root = await temporaryDirectory();
    const artifactId = jsonString(
      receipt(
        runCli([
          "prepare",
          "--manifest",
          manifestPath,
          "--consent",
          "local-only",
          "--ack-storage-risk",
          "--root",
          root,
        ]),
      ),
      "artifactId",
    );

    const deleted = runCli([
      "delete",
      "--root",
      root,
      "--session",
      SESSION_ID,
      "--host",
      HOST_ID,
      "--confirm",
    ]);
    expect(deleted.status).toBe(0);
    expect(deleted.stderr).toBe("");
    expect(JSON.parse(deleted.stdout)).toEqual({
      schemaVersion: 1,
      deleted: true,
      removedArtifacts: 4,
    });

    const afterDelete = runCli([
      "status",
      "--root",
      root,
      "--artifact",
      artifactId,
    ]);
    expect(afterDelete.status).toBe(1);
    expect(failureCode(afterDelete)).toBe("ARTIFACT_NOT_FOUND");

    // The source transcript is never part of the managed store.
    expect(existsSync(FIXTURE_PATH)).toBe(true);
  });

  it("rejects a malformed session identifier", async () => {
    const root = await temporaryDirectory();
    const run = runCli([
      "delete",
      "--root",
      root,
      "--session",
      "not a session",
      "--host",
      HOST_ID,
      "--confirm",
    ]);
    expect(run.status).toBe(1);
    expect(failureCode(run)).toBe("INVALID_NODE_KEY");
  });
});

describe("ags-retrospective consent commands", () => {
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
    const outcomeStatus = await runRetrospectiveCli(
      ["status", "--store-root", storeDir, "--artifact", "some.id"],
      io,
    );
    expect(outcomeStatus.code).toBe(2);
    expect(outcomeStatus.stderr).toContain("Usage:");

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

describe("ags-retrospective index", () => {
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

  it("--help includes ags-retrospective index command in usage", async () => {
    const { createIo } = await setupHarness();
    const { io } = createIo();
    const outcome = await runRetrospectiveCli(["--help"], io);
    expect(outcome.code).toBe(0);
    expect(outcome.stdout).toContain(
      "ags-retrospective index [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--folder NAME]",
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
    expect(outcome.stderr).toContain("Option --root is not valid for index.");
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
