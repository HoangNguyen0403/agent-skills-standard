/**
 * Core execution harness for the executable task-evaluation pilot.
 *
 * Implements:
 * - Deterministic, non-shell process invocation with process-group timeout signaling.
 * - Out-of-workspace verifier execution with expected-digest checks before, during, and after.
 * - Fresh temporary fixtures with finally-based workspace cleanup.
 * - Prompt and bounded worker/verifier logs stored outside the writable fixture.
 * - Fail-closed handling of observed verifier and prompt tampering.
 * - Raw worker argv omitted from result artifacts; captured logs are sensitive evidence.
 * - Honest null usage/cost tracking.
 * - Strict configuration & manifest validation with canonical paths and symlink rejection.
 *
 * SECURITY & TRUST BOUNDARY NOTICE:
 * Local execution does NOT provide an OS-level sandbox or container boundary.
 * Worker and verifier commands run with the privileges of the executing host user.
 * Canonical paths and before/after hashes detect observed source tampering; they
 * do not make files immutable or prevent transient same-user replacement.
 * Use only trusted worker commands and isolated non-production fixtures.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import os from "node:os";
import * as path from "node:path";
import fs from "fs-extra";
import type {
  ExitOutcomes,
  GuidanceArm,
  TaskArmSummary,
  TaskDefinition,
  TaskGuidancePaths,
  TaskManifest,
  TaskRunOptions,
  TaskRunResult,
  TaskSplit,
  TaskSuiteSummary,
  TaskSummary,
  WorkerConfig,
} from "./task-types";
import { GUIDANCE_ARMS } from "./task-types";

// Maximum bytes captured per stream (stdout/stderr) before truncating to prevent memory exhaustion
export const MAX_CAPTURE_BYTES = 5 * 1024 * 1024; // 5 MB

// ============================================================================
// Hashing Utilities
// ============================================================================

export function sha256(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export function hashWorkerConfig(config: WorkerConfig): string {
  const normalized = JSON.stringify({
    executable: config.executable,
    args: config.args,
    model: config.model,
    effort: config.effort,
    timeoutMs: config.timeoutMs,
  });
  return createHash("sha256").update(normalized).digest("hex");
}

export async function hashFile(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return createHash("sha256").update(content).digest("hex");
}
async function writePrivateJson(filePath: string, value: unknown): Promise<void> {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(filePath, serialized, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
}

export async function hashDirectory(dirPath: string): Promise<string> {
  const rootStat = await fs.lstat(dirPath);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error(`Fixture root must be a real directory: ${dirPath}`);
  }
  const entries: Array<{ relativePath: string; hash: string }> = [];

  async function walk(currentDir: string): Promise<void> {
    const items = await fs.readdir(currentDir, { withFileTypes: false });
    for (const itemName of items) {
      const fullPath = path.join(currentDir, itemName);
      const lstat = await fs.lstat(fullPath);

      if (lstat.isSymbolicLink()) {
        throw new Error(
          `Security violation: Symbolic links in fixtures are strictly prohibited: ${fullPath}`,
        );
      }

      if (lstat.isDirectory()) {
        await walk(fullPath);
      } else if (lstat.isFile()) {
        const relativePath = path
          .relative(dirPath, fullPath)
          .split(path.sep)
          .join("/");
        const fileContent = await fs.readFile(fullPath);
        const fileHash = createHash("sha256").update(fileContent).digest("hex");
        entries.push({ relativePath, hash: fileHash });
      }
    }
  }

  await walk(dirPath);

  // Deterministically sort by relative path
  entries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  const manifestString = entries
    .map((e) => `${e.relativePath}:${e.hash}`)
    .join("\n");
  return createHash("sha256").update(manifestString).digest("hex");
}


// ============================================================================
// Validation & Path Containment
// ============================================================================

export function isPathContained(parentDir: string, childPath: string): boolean {
  const relative = path.relative(parentDir, childPath);
  return (
    !relative.startsWith("..") &&
    !path.isAbsolute(relative) &&
    relative !== ""
  );
}

export function validateWorkerConfig(raw: unknown): WorkerConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(
      "Worker configuration must be a valid non-null JSON object.",
    );
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.executable !== "string" || obj.executable.trim() === "") {
    throw new Error(
      "Worker configuration missing or empty required field: 'executable'. Fake fallbacks are prohibited.",
    );
  }

  if (
    !Array.isArray(obj.args) ||
    !obj.args.every((a) => typeof a === "string")
  ) {
    throw new Error(
      "Worker configuration 'args' must be an array of string arguments.",
    );
  }

  if (typeof obj.model !== "string" || obj.model.trim() === "") {
    throw new Error(
      "Worker configuration missing or empty required field: 'model'. Model guessing is prohibited.",
    );
  }

  if (typeof obj.effort !== "string" || obj.effort.trim() === "") {
    throw new Error(
      "Worker configuration missing or empty required field: 'effort'.",
    );
  }

  // Strict integer timeout between 100ms and 600,000ms (10 minutes)
  if (
    typeof obj.timeoutMs !== "number" ||
    !Number.isInteger(obj.timeoutMs) ||
    obj.timeoutMs < 100 ||
    obj.timeoutMs > 600000
  ) {
    throw new Error(
      "Worker configuration 'timeoutMs' must be a positive integer between 100 and 600,000.",
    );
  }

  return {
    executable: obj.executable.trim(),
    args: [...obj.args],
    model: obj.model.trim(),
    effort: obj.effort.trim(),
    timeoutMs: obj.timeoutMs,
  };
}

export async function validateManifest(
  raw: unknown,
  manifestDir: string,
): Promise<TaskManifest> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Manifest must be a valid non-null JSON object.");
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.schemaVersion !== "number" || obj.schemaVersion < 1) {
    throw new Error("Manifest 'schemaVersion' must be a positive integer.");
  }

  if (!Array.isArray(obj.tasks) || obj.tasks.length === 0) {
    throw new Error("Manifest 'tasks' must be a non-empty array of tasks.");
  }

  const realManifestDir = await fs.realpath(path.resolve(manifestDir));
  const taskIds = new Set<string>();
  const validatedTasks: TaskDefinition[] = [];

  for (let idx = 0; idx < obj.tasks.length; idx++) {
    const rawTask = obj.tasks[idx];
    if (!rawTask || typeof rawTask !== "object") {
      throw new Error(`Manifest task at index ${idx} is not an object.`);
    }

    const t = rawTask as Record<string, unknown>;

    // Enforce safe single-component task ID: prevent traversal escape like ../../outside
    if (typeof t.id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(t.id.trim())) {
      throw new Error(
        `Task at index ${idx} has invalid 'id': '${t.id}'. Task ID must be a single path component matching [a-zA-Z0-9_-]+.`,
      );
    }
    const id = t.id.trim();
    if (taskIds.has(id)) {
      throw new Error(`Duplicate task id detected: '${id}'. IDs must be unique.`);
    }
    taskIds.add(id);

    if (t.split !== "calibration" && t.split !== "holdout") {
      throw new Error(
        `Task '${id}' split must be either 'calibration' or 'holdout', got: ${t.split}`,
      );
    }
    const split = t.split as TaskSplit;

    if (typeof t.fixtureDir !== "string" || t.fixtureDir.trim() === "") {
      throw new Error(`Task '${id}' missing or empty 'fixtureDir'.`);
    }
    const candidateFixtureDir = path.resolve(realManifestDir, t.fixtureDir.trim());
    if (
      !(await fs.pathExists(candidateFixtureDir)) ||
      !(await fs.stat(candidateFixtureDir)).isDirectory()
    ) {
      throw new Error(
        `Task '${id}' fixture directory not found: ${candidateFixtureDir}`,
      );
    }
    const realFixtureDir = await fs.realpath(candidateFixtureDir);
    if (!isPathContained(realManifestDir, realFixtureDir)) {
      throw new Error(
        `Task '${id}' fixtureDir escapes manifest directory: ${realFixtureDir}`,
      );
    }

    // Check for symlinks in fixture directory
    await hashDirectory(realFixtureDir);

    if (typeof t.prompt !== "string" || t.prompt.trim() === "") {
      throw new Error(`Task '${id}' missing or empty 'prompt'.`);
    }
    const prompt = t.prompt.trim();

    if (!t.guidance || typeof t.guidance !== "object") {
      throw new Error(`Task '${id}' missing required 'guidance' object.`);
    }
    const g = t.guidance as Record<string, unknown>;
    const validatedGuidancePaths: Partial<TaskGuidancePaths> = {};

    for (const arm of GUIDANCE_ARMS) {
      if (typeof g[arm] !== "string" || (g[arm] as string).trim() === "") {
        throw new Error(
          `Task '${id}' missing guidance path for arm '${arm}'.`,
        );
      }
      const candidateGuidancePath = path.resolve(
        realManifestDir,
        (g[arm] as string).trim(),
      );
      if (!(await fs.pathExists(candidateGuidancePath))) {
        throw new Error(
          `Task '${id}' guidance file for arm '${arm}' not found: ${candidateGuidancePath}`,
        );
      }
      const realGuidancePath = await fs.realpath(candidateGuidancePath);
      if (!isPathContained(realManifestDir, realGuidancePath)) {
        throw new Error(
          `Task '${id}' guidance for arm '${arm}' escapes manifest directory: ${realGuidancePath}`,
        );
      }
      if (!(await fs.stat(realGuidancePath)).isFile()) {
        throw new Error(`Task '${id}' guidance for arm '${arm}' must be a regular file.`);
      }
      validatedGuidancePaths[arm] = realGuidancePath;
    }

    const guidance = validatedGuidancePaths as TaskGuidancePaths;

    if (!t.verifier || typeof t.verifier !== "object") {
      throw new Error(`Task '${id}' missing required 'verifier' object.`);
    }
    const v = t.verifier as Record<string, unknown>;
    if (typeof v.executable !== "string" || v.executable.trim() === "") {
      throw new Error(`Task '${id}' verifier missing or empty 'executable'.`);
    }
    if (
      !Array.isArray(v.args) ||
      v.args.length === 0 ||
      !v.args.every((a) => typeof a === "string")
    ) {
      throw new Error(
        `Task '${id}' verifier 'args' must be a non-empty array of string arguments specifying the verifier script.`,
      );
    }

    // First argument must be the verifier script file, existing outside the mutable fixture
    const verifierScriptPath = path.resolve(realManifestDir, v.args[0]);
    if (
      !(await fs.pathExists(verifierScriptPath)) ||
      !(await fs.stat(verifierScriptPath)).isFile()
    ) {
      throw new Error(
        `Task '${id}' trusted verifier script not found: ${verifierScriptPath}`,
      );
    }
    const realVerifierScriptPath = await fs.realpath(verifierScriptPath);
    if (!isPathContained(realManifestDir, realVerifierScriptPath)) {
      throw new Error(
        `Task '${id}' verifier script escapes manifest directory: ${realVerifierScriptPath}`,
      );
    }
    if (isPathContained(realFixtureDir, realVerifierScriptPath)) {
      throw new Error(
        `Task '${id}' verifier script must reside outside fixture directory: ${realVerifierScriptPath}`,
      );
    }

    let verifierTimeout: number | undefined;
    if (v.timeoutMs !== undefined) {
      if (
        typeof v.timeoutMs !== "number" ||
        !Number.isInteger(v.timeoutMs) ||
        v.timeoutMs < 1000 ||
        v.timeoutMs > 300000
      ) {
        throw new Error(
          `Task '${id}' verifier 'timeoutMs' must be an integer between 1,000 and 300,000.`,
        );
      }
      verifierTimeout = v.timeoutMs;
    }

    validatedTasks.push({
      id,
      split,
      fixtureDir: realFixtureDir,
      prompt,
      guidance,
      verifier: {
        executable: v.executable.trim(),
        args: [realVerifierScriptPath, ...v.args.slice(1)],
        timeoutMs: verifierTimeout,
        scriptHash: await hashFile(realVerifierScriptPath),
      },
    });
  }

  return {
    schemaVersion: obj.schemaVersion as number,
    description: typeof obj.description === "string" ? obj.description : undefined,
    tasks: validatedTasks,
  };
}

// ============================================================================
// Process Execution with Process-Group Bounds & Output Capping
// ============================================================================

export interface BoundedProcessResult {
  exitCode: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  timedOut: boolean;
  infrastructureError: string | null;
  durationMs: number;
}
function redactCredentialValues(text: string, args: string[]): string {
  let redacted = text;
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    const inline = argument.match(/^(-{1,2}[^=]*(?:secret|token|key|auth|password|credential)[^=]*)=(.+)$/i);
    if (inline?.[2]) redacted = redacted.replaceAll(inline[2], "[REDACTED]");
    if (
      /^(?:-{1,2}[^=]*(?:secret|token|key|auth|password|credential)|-H)$/i.test(argument) &&
      args[index + 1]
    ) {
      const nextArgument = args[index + 1];
      const credential = nextArgument.match(/(?:Bearer|Basic)\s+(\S+)|Authorization:\s*(\S+)/i);
      if (credential) {
        const value = credential[1] ?? credential[2];
        redacted = redacted.replaceAll(value, "[REDACTED]");
      } else if (/-{1,2}[^=]*(?:secret|token|key|auth|password|credential)/i.test(argument)) {
        redacted = redacted.replaceAll(nextArgument, "[REDACTED]");
      }
    }
  }
  return redacted;
}

export function runBoundedProcess(options: {
  executable: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
  stdinInput?: string;
  env?: NodeJS.ProcessEnv;
}): Promise<BoundedProcessResult> {
  const { promise, resolve } = Promise.withResolvers<BoundedProcessResult>();
  const startTime = Date.now();
  let timedOut = false;
  let stdoutBuffer = "";
  let stderrBuffer = "";
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let stdoutTruncated = false;
  let stderrTruncated = false;
  let settled = false;

  // Filter environment to avoid secret leakage while preserving system essentials
  const safeEnv: NodeJS.ProcessEnv = {
    PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
    NODE_PATH: process.env.NODE_PATH,
    HOME: process.env.HOME ?? os.homedir(),
    LANG: process.env.LANG ?? "en_US.UTF-8",
    ...options.env,
  };

  const isPosix = process.platform !== "win32";

  let child: ChildProcess;
  try {
    child = spawn(options.executable, options.args, {
      cwd: options.cwd,
      detached: isPosix,
      shell: false,
      env: safeEnv,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    const message = err instanceof Error ? err.message : String(err);
    resolve({
      exitCode: null,
      signal: null,
      stdout: "",
      stderr: "",
      stdoutTruncated: false,
      stderrTruncated: false,
      timedOut: false,
      infrastructureError: `Failed to spawn process (${options.executable}): ${message}`,
      durationMs,
    });
    return promise;
  }

  if (child.stdout) {
    child.stdout.on("data", (chunk: Buffer) => {
      if (stdoutTruncated) return;
      stdoutBytes += chunk.length;
      if (stdoutBytes > MAX_CAPTURE_BYTES) {
        stdoutTruncated = true;
        stdoutBuffer += chunk.toString("utf8", 0, Math.max(0, chunk.length - (stdoutBytes - MAX_CAPTURE_BYTES)));
        stdoutBuffer += "\n[TRUNCATED: Exceeded 5MB limit]\n";
      } else {
        stdoutBuffer += chunk.toString("utf8");
      }
    });
  }

  if (child.stderr) {
    child.stderr.on("data", (chunk: Buffer) => {
      if (stderrTruncated) return;
      stderrBytes += chunk.length;
      if (stderrBytes > MAX_CAPTURE_BYTES) {
        stderrTruncated = true;
        stderrBuffer += chunk.toString("utf8", 0, Math.max(0, chunk.length - (stderrBytes - MAX_CAPTURE_BYTES)));
        stderrBuffer += "\n[TRUNCATED: Exceeded 5MB limit]\n";
      } else {
        stderrBuffer += chunk.toString("utf8");
      }
    });
  }

  // Handle child stdin error gracefully (prevent unhandled EPIPE on early termination)
  if (child.stdin) {
    child.stdin.on("error", () => {
      // Ignored: child closed stdin early
    });

    if (options.stdinInput !== undefined) {
      try {
        child.stdin.write(options.stdinInput);
        child.stdin.end();
      } catch {
        // Child closed stdin before write
      }
    }
  }

  let killTimer: NodeJS.Timeout | undefined;
  let timeoutHandle: NodeJS.Timeout | undefined;
  let escalationComplete = false;
  let ownedProcessGroupExited = false;
  let closeResult:
    | { code: number | null; signal: NodeJS.Signals | null; infrastructureError: string | null }
    | undefined;
  let processExitResult:
    | { code: number | null; signal: NodeJS.Signals | null }
    | undefined;
  let cleanupError: string | null = null;

  const resolveResult = (
    code: number | null,
    signal: NodeJS.Signals | null,
    infraError: string | null,
  ) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeoutHandle);
    clearTimeout(killTimer);
    if (timedOut) {
      child.stdin?.destroy();
      child.stdout?.destroy();
      child.stderr?.destroy();
    }
    resolve({
      exitCode: code,
      signal,
      stdout: stdoutBuffer,
      stderr: stderrBuffer,
      stdoutTruncated,
      stderrTruncated,
      timedOut,
      infrastructureError: infraError ?? cleanupError,
      durationMs: Date.now() - startTime,
    });
  };

  const finish = (
    code: number | null,
    signal: NodeJS.Signals | null,
    infraError: string | null = null,
  ) => {
    if (settled) return;
    if (timedOut && !escalationComplete) {
      closeResult = { code, signal, infrastructureError: infraError };
      return;
    }
    resolveResult(code, signal, infraError);
  };

  const waitForProcessGroupExit = async (processGroupId: number): Promise<boolean> => {
    const deadline = Date.now() + 5000;
    let permissionDenied = false;
    while (Date.now() < deadline) {
      try {
        process.kill(-processGroupId, 0);
      } catch (err: unknown) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === "ESRCH") return true;
        if (code !== "EPERM") {
          cleanupError = `Unable to inspect timed-out process group: ${String(err)}`;
          return false;
        }
        permissionDenied = true;
      }
      const { promise, resolve: resume } = Promise.withResolvers<void>();
      setTimeout(resume, 25);
      await promise;
    }
    cleanupError = permissionDenied
      ? "Timed-out process group remained inaccessible after SIGKILL."
      : "Timed-out process group did not exit after SIGKILL.";
    return false;
  };

  timeoutHandle = setTimeout(() => {
    timedOut = true;
    if (!settled && child.pid) {
      try {
        if (isPosix) {
          process.kill(-child.pid, "SIGTERM");
        } else {
          child.kill("SIGTERM");
        }
      } catch {
        // The process may have exited between timeout and signal delivery.
      }
    }

    killTimer = setTimeout(() => {
      void (async () => {
        if (child.pid) {
          try {
            if (isPosix) {
              process.kill(-child.pid, "SIGKILL");
            } else {
              child.kill("SIGKILL");
            }
          } catch {
            // The process group may already be gone.
          }
        }

        const groupExited =
          isPosix && child.pid
            ? await waitForProcessGroupExit(child.pid)
            : true;
        ownedProcessGroupExited = groupExited;
        if (!groupExited) {
          cleanupError ??= "Timed-out process group did not exit after SIGKILL.";
        }
        escalationComplete = true;
        if (closeResult) {
          resolveResult(
            closeResult.code,
            closeResult.signal,
            closeResult.infrastructureError,
          );
        } else if (processExitResult) {
          resolveResult(processExitResult.code, processExitResult.signal, null);
        } else if (!groupExited) {
          resolveResult(null, "SIGKILL", cleanupError);
        }
      })();
    }, 1500);
  }, options.timeoutMs);

  child.on("exit", (code, signal) => {
    processExitResult = { code, signal };
    if (timedOut && escalationComplete && ownedProcessGroupExited) {
      resolveResult(code, signal, closeResult?.infrastructureError ?? null);
    }
  });
  child.on("close", (code, signal) => finish(code, signal));
  child.on("error", (err) => {
    const message = err instanceof Error ? err.message : String(err);
    const prefix = child.pid === undefined ? "Failed to spawn process" : "Process error";
    finish(null, null, `${prefix} (${options.executable}): ${message}`);
  });

  return promise;
}

// ============================================================================
// Single Task Run Execution
// ============================================================================

interface ExecuteTaskRunParams {
  task: TaskDefinition;
  arm: GuidanceArm;
  repetition: number;
  workerConfig: WorkerConfig;
  manifestDir: string;
  outputDir: string;
  keepWorkspaces?: boolean;
}

export async function executeTaskRun(
  params: ExecuteTaskRunParams,
): Promise<TaskRunResult> {
  return executeTaskRunFromFixture(params, params.task.fixtureDir);
}

async function executeTaskRunFromFixture(
  params: ExecuteTaskRunParams,
  fixtureSourceDir: string,
): Promise<TaskRunResult> {

  const {
    task,
    arm,
    repetition,
    workerConfig,
    manifestDir,
    outputDir,
    keepWorkspaces,
  } = params;

  const startedAt = new Date().toISOString();
  const configHash = hashWorkerConfig(workerConfig);

  // Verify output directory containment
  const evidenceDir = path.join(
    outputDir,
    "evidence",
    task.id,
    arm,
    `rep-${repetition}`,
  );
  if (!isPathContained(path.resolve(outputDir), path.resolve(evidenceDir))) {
    throw new Error(
      `Security violation: Evidence directory escapes output root: ${evidenceDir}`,
    );
  }
  const sourceFixtureDir = task.fixtureDir;
  if (
    path.resolve(sourceFixtureDir) === path.resolve(outputDir) ||
    isPathContained(sourceFixtureDir, path.resolve(outputDir))
  ) {
    throw new Error(`Output directory must not be inside fixture: ${outputDir}`);
  }
  await fs.mkdir(evidenceDir, { recursive: true, mode: 0o700 });

  const promptFilePath = path.join(evidenceDir, "prompt.txt");

  const guidanceFilePath = task.guidance[arm];
  const guidanceContent = await fs.readFile(guidanceFilePath, "utf8");
  const guidanceHash = createHash("sha256").update(guidanceContent).digest("hex");

  const fullPromptText = `# Guidance\n\n${guidanceContent}\n\n# Task\n\n${task.prompt}\n`;
  const promptHash = createHash("sha256").update(fullPromptText).digest("hex");
  await fs.writeFile(promptFilePath, fullPromptText, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  let fixtureHash = "";

  const tempWorkspaceParent = await fs.mkdtemp(
    path.join(os.tmpdir(), `task-eval-${task.id}-${arm}-rep${repetition}-`),
  );
  const tempWorkspaceDir = path.join(tempWorkspaceParent, "workspace");
  let workspaceCopied = false;
  try {
    await fs.copy(fixtureSourceDir, tempWorkspaceDir, {
      dereference: false,
      errorOnExist: true,
      overwrite: false,
    });
    fixtureHash = await hashDirectory(tempWorkspaceDir);
    workspaceCopied = true;
  } finally {
    if (!workspaceCopied) {
      try {
        await fs.remove(tempWorkspaceParent);
      } catch {
        // Best-effort cleanup of a partial copy.
      }
    }
  }

  const workerStdoutPath = path.join(evidenceDir, "worker.stdout.log");
  const workerStderrPath = path.join(evidenceDir, "worker.stderr.log");
  const verifierStdoutPath = path.join(evidenceDir, "verifier.stdout.log");
  const verifierStderrPath = path.join(evidenceDir, "verifier.stderr.log");

  const verifierScriptPath = task.verifier.args[0];
  const verifierResolvedArgs = task.verifier.args.map((arg) =>
    arg === "{workspace}" ? tempWorkspaceDir : arg,
  );

  // 5. Worker Execution
  const substitutedWorkerArgs = workerConfig.args.map((arg) => {
    let result = arg;
    if (result.includes("{workspace}")) {
      result = result.replaceAll("{workspace}", tempWorkspaceDir);
    }
    if (result.includes("{promptFile}")) {
      result = result.replaceAll("{promptFile}", promptFilePath);
    }
    return result;
  });

  let infrastructureError: string | null = null;
  let verifierHashBefore = "";
  let workerResult: BoundedProcessResult = {
    exitCode: null,
    signal: null,
    stdout: "",
    stderr: "",
    stdoutTruncated: false,
    stderrTruncated: false,
    timedOut: false,
    infrastructureError: null,
    durationMs: 0,
  };
  let verifierResult: BoundedProcessResult = {
    exitCode: null,
    signal: null,
    stdout: "",
    stderr: "",
    stdoutTruncated: false,
    stderrTruncated: false,
    timedOut: false,
    infrastructureError: null,
    durationMs: 0,
  };

  try {
    try {
      verifierHashBefore = await hashFile(verifierScriptPath);
      if (verifierHashBefore !== task.verifier.scriptHash) {
        infrastructureError = "Trusted verifier changed or disappeared after manifest validation.";
        workerResult.infrastructureError = infrastructureError;
        workerResult.stderr = infrastructureError;
      } else {
        workerResult = await runBoundedProcess({
          executable: workerConfig.executable,
          args: substitutedWorkerArgs,
          cwd: tempWorkspaceDir,
          timeoutMs: workerConfig.timeoutMs,
          stdinInput: fullPromptText,
        });
      }

      if (workerResult.infrastructureError) {
        infrastructureError = workerResult.infrastructureError;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      infrastructureError = verifierHashBefore
        ? `Worker execution infrastructure failure: ${msg}`
        : `Verifier setup infrastructure failure: ${msg}`;
      workerResult = {
        exitCode: null,
        signal: null,
        stdout: "",
        stderr: infrastructureError,
        stdoutTruncated: false,
        stderrTruncated: false,
        timedOut: false,
        infrastructureError,
        durationMs: 0,
      };
    }

    workerResult.stdout = redactCredentialValues(workerResult.stdout, workerConfig.args);
    workerResult.stderr = redactCredentialValues(workerResult.stderr, workerConfig.args);
    await fs.writeFile(workerStdoutPath, workerResult.stdout, { encoding: "utf8", flag: "wx", mode: 0o600 });
    await fs.writeFile(workerStderrPath, workerResult.stderr, { encoding: "utf8", flag: "wx", mode: 0o600 });

    // 6. Verifier Execution (only if worker completed without timeout, infrastructure error, or crash)
    const workerSucceeded =
      !workerResult.timedOut &&
      workerResult.exitCode === 0 &&
      infrastructureError === null;

    if (workerSucceeded) {
      try {
        const verifierHashForExecution = await hashFile(verifierScriptPath);
        if (verifierHashForExecution !== task.verifier.scriptHash) {
          infrastructureError = "Trusted verifier changed before execution.";
          verifierResult.infrastructureError = infrastructureError;
          verifierResult.stderr = infrastructureError;
        } else {
          verifierResult = await runBoundedProcess({
            executable: task.verifier.executable,
            args: verifierResolvedArgs,
            cwd: manifestDir,
            timeoutMs: task.verifier.timeoutMs ?? 30000,
          });
          infrastructureError = verifierResult.infrastructureError;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        infrastructureError = `Verifier execution infrastructure failure: ${msg}`;
        verifierResult.infrastructureError = infrastructureError;
        verifierResult.stderr = infrastructureError;
      }
    }

    await fs.writeFile(verifierStdoutPath, verifierResult.stdout, { encoding: "utf8", flag: "wx", mode: 0o600 });
    await fs.writeFile(verifierStderrPath, verifierResult.stderr, { encoding: "utf8", flag: "wx", mode: 0o600 });
  } finally {
    // Guaranteed workspace cleanup inside finally block
    if (!keepWorkspaces) {
      try {
        await fs.remove(tempWorkspaceParent);
      } catch {
        // Best-effort cleanup
      }
    }
  }

  // 7. Post-execution tamper checks (fail-closed)
  let verifierHashAfter = "";
  let verifierTampered = false;

  try {
    verifierHashAfter = await hashFile(verifierScriptPath);
    verifierTampered =
      verifierHashAfter !== verifierHashBefore ||
      verifierHashAfter !== task.verifier.scriptHash;
  } catch {
    verifierTampered = true;
    infrastructureError ??= "Trusted verifier disappeared or became unreadable.";
  }
  if (verifierTampered) {
    infrastructureError ??= "Trusted verifier integrity check failed.";
  }

  // Check if prompt.txt was modified by worker
  let promptTampered = false;
  try {
    const promptAfter = await fs.readFile(promptFilePath, "utf8");
    if (createHash("sha256").update(promptAfter).digest("hex") !== promptHash) {
      promptTampered = true;
    }
  } catch {
    promptTampered = true;
  }
  if (promptTampered) {
    infrastructureError ??= "Prompt evidence integrity check failed.";
  }

  // 8. Outcomes
  const exitOutcomes: ExitOutcomes = {
    workerExitCode: workerResult.exitCode,
    workerSignal: workerResult.signal,
    verifierExitCode: verifierResult.exitCode,
    verifierSignal: verifierResult.signal,
    workerTimedOut: workerResult.timedOut,
    verifierTimedOut: verifierResult.timedOut,
    timedOut: workerResult.timedOut || verifierResult.timedOut,
    infrastructureError,
    verifierTampered,
    promptTampered,
    stdoutTruncated: workerResult.stdoutTruncated || verifierResult.stdoutTruncated,
    stderrTruncated: workerResult.stderrTruncated || verifierResult.stderrTruncated,
  };

  const success =
    !exitOutcomes.timedOut &&
    exitOutcomes.workerExitCode === 0 &&
    exitOutcomes.verifierExitCode === 0 &&
    !verifierTampered &&
    !promptTampered &&
    infrastructureError === null;

  const wallTimeMs = {
    workerMs: workerResult.durationMs,
    verifierMs: verifierResult.durationMs,
    totalMs: workerResult.durationMs + verifierResult.durationMs,
  };

  const evidencePaths = {
    promptFile: path.relative(outputDir, promptFilePath),
    workerStdout: path.relative(outputDir, workerStdoutPath),
    workerStderr: path.relative(outputDir, workerStderrPath),
    verifierStdout: path.relative(outputDir, verifierStdoutPath),
    verifierStderr: path.relative(outputDir, verifierStderrPath),
  };

  const completedAt = new Date().toISOString();

  const runResult: TaskRunResult = {
    schemaVersion: 1,
    taskId: task.id,
    split: task.split,
    arm,
    repetition,
    model: workerConfig.model,
    effort: workerConfig.effort,
    configHash,
    promptHash,
    fixtureHash,
    guidanceHash,
    verifierHashBefore,
    verifierHashAfter,
    exitOutcomes,
    wallTimeMs,
    evidencePaths,
    success,
    usage: null,
    cost: null,
    startedAt,
    completedAt,
  };

  await writePrivateJson(path.join(evidenceDir, "run-result.json"), runResult);

  return runResult;
}

async function stageFixtureSnapshot(
  sourceFixtureDir: string,
  snapshotDir: string,
): Promise<string> {
  const sourceHashBefore = await hashDirectory(sourceFixtureDir);
  await fs.copy(sourceFixtureDir, snapshotDir, {
    dereference: false,
    errorOnExist: true,
    overwrite: false,
  });
  const snapshotHash = await hashDirectory(snapshotDir);
  const sourceHashAfter = await hashDirectory(sourceFixtureDir);
  if (sourceHashBefore !== snapshotHash || sourceHashBefore !== sourceHashAfter) {
    throw new Error(
      `Fixture changed while staging a validated snapshot: ${sourceFixtureDir}`,
    );
  }
  return snapshotHash;
}

// ============================================================================
// Suite Runner
// ============================================================================

export async function runTaskSuite(
  options: TaskRunOptions,
): Promise<TaskSuiteSummary> {
  const startedAt = new Date().toISOString();

  // Validate Manifest Path
  const resolvedManifestPath = path.resolve(options.manifestPath);
  if (!(await fs.pathExists(resolvedManifestPath))) {
    throw new Error(
      `Task manifest file does not exist: ${resolvedManifestPath}`,
    );
  }
  const rawManifest = await fs.readJson(resolvedManifestPath);
  const manifestDir = await fs.realpath(path.dirname(resolvedManifestPath));
  const manifest = await validateManifest(rawManifest, manifestDir);

  // Validate Worker Config Path
  const resolvedWorkerPath = path.resolve(options.workerConfigPath);
  if (!(await fs.pathExists(resolvedWorkerPath))) {
    throw new Error(
      `Worker configuration file does not exist: ${resolvedWorkerPath}`,
    );
  }
  const rawWorker = await fs.readJson(resolvedWorkerPath);
  const workerConfig = validateWorkerConfig(rawWorker);


  // Strict integer repetition validation (bounded 1..100)
  const repeat =
    options.repeat !== undefined ? options.repeat : 1;
  if (!Number.isInteger(repeat) || repeat < 1 || repeat > 100) {
    throw new Error(
      `Repetition must be an integer between 1 and 100, received: ${options.repeat}`,
    );
  }

  // Filter Tasks by Split if requested
  const tasksToRun = options.split
    ? manifest.tasks.filter((t) => t.split === options.split)
    : manifest.tasks;

  if (tasksToRun.length === 0) {
    throw new Error(
      `No tasks found matching split filter: '${options.split}'. Available splits in manifest: ${Array.from(new Set(manifest.tasks.map((t) => t.split))).join(", ")}`,
    );
  }
  const requestedOutputDir = path.resolve(options.outputDir);
  const outputParent = await fs.realpath(path.dirname(requestedOutputDir));
  const resolvedOutputDir = path.join(outputParent, path.basename(requestedOutputDir));
  for (const task of manifest.tasks) {
    if (
      path.resolve(task.fixtureDir) === resolvedOutputDir ||
      isPathContained(task.fixtureDir, resolvedOutputDir)
    ) {
      throw new Error(`Output directory must not be inside fixture: ${resolvedOutputDir}`);
    }
  }
  try {
    await fs.mkdir(resolvedOutputDir, { mode: 0o700 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Unable to exclusively create new output directory: ${message}`);
  }

  const fixtureSnapshotsRoot = await fs.mkdtemp(
    path.join(
      os.tmpdir(),
      `task-eval-fixture-snapshots-${path.basename(resolvedOutputDir)}-`,
    ),
  );
  try {
    const snapshots = new Map<string, { directory: string; fixtureHash: string }>();
    for (const task of tasksToRun) {
      const directory = path.join(fixtureSnapshotsRoot, task.id);
      const fixtureHash = await stageFixtureSnapshot(task.fixtureDir, directory);
      snapshots.set(task.id, { directory, fixtureHash });
    }

    const results: TaskRunResult[] = [];
    for (const task of tasksToRun) {
      const snapshot = snapshots.get(task.id);
      if (!snapshot) {
        throw new Error(`Validated fixture snapshot missing for task '${task.id}'.`);
      }
      for (let rep = 1; rep <= repeat; rep++) {
        for (const arm of GUIDANCE_ARMS) {
          const runResult = await executeTaskRunFromFixture(
            {
              task,
              arm,
              repetition: rep,
              workerConfig,
              manifestDir,
              outputDir: resolvedOutputDir,
              keepWorkspaces: options.keepWorkspaces,
            },
            snapshot.directory,
          );
          if (runResult.fixtureHash !== snapshot.fixtureHash) {
            throw new Error(
              `Task '${task.id}' fixture snapshot changed before ${arm} repetition ${rep}; refusing an unqualified comparison.`,
            );
          }
          results.push(runResult);
        }
      }
    }

    const completedAt = new Date().toISOString();
    const createEmptyArmSummary = (): TaskArmSummary => ({
      total: 0,
      evaluated: 0,
      infrastructureErrors: 0,
      successful: 0,
      failed: 0,
      timedOut: 0,
      passRate: null,
      avgWallMs: null,
    });
    const byArm: Record<GuidanceArm, TaskArmSummary> = {
      minimal: createEmptyArmSummary(),
      current: createEmptyArmSummary(),
      candidate: createEmptyArmSummary(),
    };

    const byTask: Record<string, TaskSummary> = {};
    for (const task of tasksToRun) {
      byTask[task.id] = {
        total: 0,
        evaluated: 0,
        infrastructureErrors: 0,
        successful: 0,
        failed: 0,
        timedOut: 0,
        passRate: null,
      };
    }

    for (const result of results) {
      const armSummary = byArm[result.arm];
      const taskSummary = byTask[result.taskId];
      armSummary.total++;
      taskSummary.total++;
      if (result.exitOutcomes.timedOut) {
        armSummary.timedOut++;
        taskSummary.timedOut++;
      }
      if (result.exitOutcomes.infrastructureError !== null) {
        armSummary.infrastructureErrors++;
        taskSummary.infrastructureErrors++;
        continue;
      }

      armSummary.evaluated++;
      taskSummary.evaluated++;
      if (result.success) {
        armSummary.successful++;
        taskSummary.successful++;
      } else {
        armSummary.failed++;
        taskSummary.failed++;
      }
    }

    for (const arm of GUIDANCE_ARMS) {
      const armSummary = byArm[arm];
      armSummary.passRate =
        armSummary.evaluated > 0
          ? Math.round((armSummary.successful / armSummary.evaluated) * 1000) / 10
          : null;
      const evaluatedArmRuns = results.filter(
        (result) =>
          result.arm === arm && result.exitOutcomes.infrastructureError === null,
      );
      armSummary.avgWallMs =
        evaluatedArmRuns.length > 0
          ? Math.round(
              evaluatedArmRuns.reduce(
                (total, result) => total + result.wallTimeMs.totalMs,
                0,
              ) / evaluatedArmRuns.length,
            )
          : null;
    }

    for (const taskSummary of Object.values(byTask)) {
      taskSummary.passRate =
        taskSummary.evaluated > 0
          ? Math.round((taskSummary.successful / taskSummary.evaluated) * 1000) / 10
          : null;
    }

    const totalRuns = results.length;
    const infrastructureErrorRuns = results.filter(
      (result) => result.exitOutcomes.infrastructureError !== null,
    ).length;
    const evaluatedRuns = totalRuns - infrastructureErrorRuns;
    const successfulRuns = results.filter(
      (result) =>
        result.exitOutcomes.infrastructureError === null && result.success,
    ).length;
    const failedRuns = evaluatedRuns - successfulRuns;
    const timedOutRuns = results.filter(
      (result) => result.exitOutcomes.timedOut,
    ).length;
    const overallPassRate =
      evaluatedRuns > 0
        ? Math.round((successfulRuns / evaluatedRuns) * 1000) / 10
        : null;

    const suiteSummary: TaskSuiteSummary = {
      schemaVersion: 1,
      manifestPath: path.relative(process.cwd(), resolvedManifestPath),
      workerConfig: {
        executable: workerConfig.executable,
        model: workerConfig.model,
        effort: workerConfig.effort,
        timeoutMs: workerConfig.timeoutMs,
        configHash: hashWorkerConfig(workerConfig),
      },
      repeat,
      splitFilter: options.split ?? "all",
      startedAt,
      completedAt,
      totalRuns,
      evaluatedRuns,
      successfulRuns,
      failedRuns,
      timedOutRuns,
      infrastructureErrorRuns,
      overallPassRate,
      byArm,
      byTask,
      runs: results,
    };

    const resultsJsonPath = path.join(resolvedOutputDir, "results.json");
    await writePrivateJson(resultsJsonPath, suiteSummary);
    return suiteSummary;
  } finally {
    await fs.remove(fixtureSnapshotsRoot);
  }
}
