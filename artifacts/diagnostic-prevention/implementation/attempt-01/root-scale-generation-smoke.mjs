#!/usr/bin/env node
/**
 * Root-scale qualification smoke for the batched Git identity change (R1).
 *
 * Parent-run only. Never touches the live worktree's Git, config or outputs:
 *
 *   1. archives the pinned BASE commit into a fresh owned temporary repository;
 *   2. overlays the qualified current runtime (CLI production sources, generation
 *      scripts, producer scripts, package/compiler config) and links the existing
 *      dependency trees instead of installing;
 *   3. isolates fixture Git before any mutating command (sanitized environment,
 *      fixture-local config, hooks disabled, routing verified), produces the
 *      baseline with the three real producer scripts, stages only the intended
 *      non-dependency paths, and commits a fixture-only BASE;
 *   4. records baseline declared bytes + prior ownership classes, keeps exactly
 *      one deliberately unrelated authority entry, then overlays the current
 *      canonical `skills/` tree and the two changed workflows;
 *   5. invokes the copied REAL public entrypoint from the fixture CWD with
 *      `--adopt-base <fixture BASE>` followed by `--check`;
 *   6. verifies independent real-producer re-derivation, exact changed/verified
 *      sets, byte deltas against the baseline, no ownership acquisition for
 *      unchanged unknown outputs, preserved unrelated authority, metadata scope,
 *      Git/config preservation and native Git Trace2 query evidence.
 *
 * Every fixture child is spawned in its own owned session/process group; the
 * deadline and the post-exit grace kill the whole group, and an unresolved group
 * prevents both qualification and fixture deletion.
 *
 * Not done here: importing the isolated-stage module, faking a runner, trusting
 * the staged/active lock as authority, copying a live lock, padding the fixture,
 * mutating the real index, or forcing ignored paths into the fixture commit.
 *
 * Usage:
 *   node artifacts/diagnostic-prevention/implementation/attempt-01/root-scale-generation-smoke.mjs \
 *     --out artifacts/diagnostic-prevention/implementation/attempt-01/root-scale-smoke-run-01 \
 *     [--keep-fixture] [--help]
 *
 * Exit codes: 0 qualified, 1 failed/mismatched, 2 usage.
 */

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";

const WORKSPACE =
  "/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/diagnostic-prevention";
const BASE = "52ac482a5b948d9d26df4c3a2617afec74d1cf54";
const A_REL = "artifacts/diagnostic-prevention/implementation/attempt-01";
const APPLY_DEADLINE_MS = 1800 * 1000;
const CHECK_DEADLINE_MS = 600 * 1000;
const PRODUCER_DEADLINE_MS = 900 * 1000;
const POST_EXIT_GRACE_MS = 5000;
const REAP_TIMEOUT_MS = 10000;
const OUTPUT_CAPTURE_BYTES = 8 * 1024 * 1024;
const DECLARED_BAND = { minimum: 1800, maximum: 2200 };
const CHANGED_BAND = { minimum: 80, maximum: 110 };
const PRODUCER_SCRIPTS = [
  "scripts/calculate-tokens.ts",
  "scripts/generate-indices.ts",
  "scripts/generate-capabilities-doc.ts",
];
const RUNTIME_TREES = ["cli/src", "scripts/generation"];
const RUNTIME_FILES = [
  "scripts/generate-indices.ts",
  "scripts/calculate-tokens.ts",
  "scripts/generate-capabilities-doc.ts",
  "package.json",
  "cli/package.json",
  "tsconfig.json",
  "cli/tsconfig.json",
];
const CHANGED_WORKFLOWS = ["implement-feature", "session-report"];
const UNRELATED_AUTHORITY_REL = ".agents/fixture-unrelated-authority.txt";
const DEPENDENCY_LINK_PREFIXES = ["node_modules", "cli/node_modules"];
const REQUIRED_TRACKED_PATHS = [
  "AGENTS.md",
  ".skillsrc",
  "skills/index.json",
  "skills/metadata.json",
  "docs/agent-capabilities.md",
];
const ROUTING_ENV_VARIABLES = [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_COMMON_DIR",
  "GIT_NAMESPACE",
  "GIT_PREFIX",
  "GIT_CEILING_DIRECTORIES",
  "GIT_DISCOVERY_ACROSS_FILESYSTEM",
  "GIT_TRACE",
  "GIT_TRACE2",
  "GIT_TRACE2_EVENT",
  "GIT_TRACE2_PERF",
  "GIT_TRACE_PACKET",
  "GIT_TRACE_SETUP",
];
const TRACE_GLOBAL_FLAGS_WITH_VALUE = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--exec-path",
  "--config-env",
]);

/** Process groups this invocation still has to reap; shared across stages. */
const OWNERSHIP = { unresolved: [] };
const USAGE = `Usage: node ${A_REL}/root-scale-generation-smoke.mjs --out <fresh-evidence-dir> [--keep-fixture] [--prerequisites-only]

Builds a fresh full-source fixture from the pinned BASE ${BASE},
overlays the current qualified runtime and canonical inputs, and runs the real
public entrypoint (--adopt-base, then --check).

--prerequisites-only stops after fixture routing/config isolation, schema-valid
unrelated-authority injection, and the real public baseline --check. Its result
is PREREQUISITES_VERIFIED, never QUALIFIED.

Git is isolated per fixture: inherited routing/config/trace variables are
stripped, fixture-local config disables hooks, and physical routing is verified.

--out must resolve beneath ${A_REL}/ and must not already exist.
Supported flags: --out <dir>, --keep-fixture, --prerequisites-only, --help.
Exit codes: 0 qualified or prerequisites verified, 1 failed/mismatched, 2 usage.
`;

class SmokeFailure extends Error {
  constructor(code, detail = null) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "SmokeFailure";
    this.code = code;
    this.detail = detail;
  }
}

function fail(code, detail = null) {
  throw new SmokeFailure(code, detail);
}
const PREREQUISITES_VERIFIED = Symbol("PREREQUISITES_VERIFIED");

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function sha256File(filePath) {
  return sha256Bytes(await fs.readFile(filePath));
}

function isPathWithin(root, target) {
  const relative = path.relative(root, target);
  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function assertOwnedGitDirectory(
  physicalFixtureRoot,
  physicalGitDir,
  physicalDotGit,
) {
  if (
    !isPathWithin(physicalFixtureRoot, physicalGitDir) ||
    physicalGitDir !== physicalDotGit
  ) {
    fail("FIXTURE_GIT_DIR_MISMATCH", physicalGitDir);
  }
}

async function runIsolationSelfChecks(tempRoot) {
  const selfCheckRoot = path.join(tempRoot, "routing-self-check");
  const fixtureRoot = path.join(selfCheckRoot, "internal-repository");
  const externalRoot = path.join(selfCheckRoot, "external-repository");
  const aliasRoot = path.join(selfCheckRoot, "internal-alias");
  const internalGit = path.join(fixtureRoot, ".git");
  const externalGit = path.join(externalRoot, ".git");
  await fs.mkdir(internalGit, { recursive: true });
  await fs.mkdir(externalGit, { recursive: true });
  await fs.symlink(fixtureRoot, aliasRoot, "junction");

  const physicalFixtureRoot = await fs.realpath(fixtureRoot);
  const physicalAliasRoot = await fs.realpath(aliasRoot);
  const physicalInternalGit = await fs.realpath(internalGit);
  const physicalExternalGit = await fs.realpath(externalGit);
  assertOwnedGitDirectory(
    physicalFixtureRoot,
    physicalInternalGit,
    physicalInternalGit,
  );
  assertOwnedGitDirectory(
    physicalAliasRoot,
    physicalInternalGit,
    physicalInternalGit,
  );

  let refusedExternal = false;
  try {
    assertOwnedGitDirectory(
      physicalFixtureRoot,
      physicalExternalGit,
      physicalInternalGit,
    );
  } catch (error) {
    refusedExternal =
      error instanceof SmokeFailure &&
      error.code === "FIXTURE_GIT_DIR_MISMATCH";
  }
  if (!refusedExternal) fail("EXTERNAL_GITDIR_SELF_CHECK_FAILED");

  const injected = buildSanitizedEnv(null, {
    PATH: process.env.PATH,
    GIT_CONFIG_PARAMETERS: "'core.hooksPath=/external/hooks'",
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "core.hooksPath",
    GIT_CONFIG_VALUE_0: "/external/hooks",
    GIT_CONFIG_GLOBAL: "/external/config",
  });
  if (
    Object.keys(injected.env).some((name) =>
      name.startsWith("GIT_CONFIG_") &&
      !["GIT_CONFIG_NOSYSTEM", "GIT_CONFIG_GLOBAL"].includes(name)
    ) ||
    injected.env.GIT_CONFIG_GLOBAL !== "/dev/null" ||
    !injected.stripped.includes("GIT_CONFIG_PARAMETERS")
  ) {
    fail("GIT_CONFIG_OVERRIDE_SELF_CHECK_FAILED");
  }
  return {
    physicalFixtureRoot,
    physicalInternalGit,
    physicalAliasRoot,
    physicalExternalGit,
    externalGitDirectory: "refused",
    commandConfigOverride: "stripped without executing a hook",
  };
}

async function pathExists(target) {
  try {
    await fs.lstat(target);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
function parseArgs(argv) {
  const parsed = {
    out: null,
    keepFixture: false,
    prerequisitesOnly: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      parsed.help = true;
      continue;
    }
    if (arg === "--keep-fixture") {
      if (parsed.keepFixture) fail("USAGE_DUPLICATE_FLAG");
      parsed.keepFixture = true;
      continue;
    }
    if (arg === "--prerequisites-only") {
      if (parsed.prerequisitesOnly) fail("USAGE_DUPLICATE_FLAG");
      parsed.prerequisitesOnly = true;
      continue;
    }
    if (arg === "--out") {
      if (parsed.out !== null) fail("USAGE_DUPLICATE_FLAG");
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) {
        fail("USAGE_MISSING_OUT_VALUE");
      }
      parsed.out = value;
      index += 1;
      continue;
    }
    fail("USAGE_UNSUPPORTED_FLAG");
  }
  if (!parsed.help && parsed.out === null) fail("USAGE_MISSING_OUT");
  return parsed;
}

async function prepareEvidenceDir(outArg) {
  const artifactsAbs = path.join(WORKSPACE, A_REL);
  const resolved = path.resolve(WORKSPACE, outArg);
  const relative = path.relative(artifactsAbs, resolved);
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    fail("OUTSIDE_ATTEMPT_ARTIFACTS", outArg);
  }
  const parentStat = await fs.lstat(path.dirname(resolved)).catch(() => null);
  if (!parentStat || !parentStat.isDirectory() || parentStat.isSymbolicLink()) {
    fail("OUTPUT_PARENT_INVALID", outArg);
  }
  try {
    await fs.mkdir(resolved, { mode: 0o700 });
  } catch (error) {
    if (error.code === "EEXIST") fail("OUTPUT_ALREADY_EXISTS", outArg);
    throw error;
  }
  return resolved;
}

function buildSanitizedEnv(extra, inheritedEnv = process.env) {
  const env = { ...inheritedEnv };
  const stripped = [];
  for (const name of ROUTING_ENV_VARIABLES) {
    if (Object.prototype.hasOwnProperty.call(env, name)) {
      delete env[name];
      stripped.push(name);
    }
  }
  for (const name of Object.keys(env)) {
    if (name.startsWith("GIT_CONFIG_")) {
      delete env[name];
      stripped.push(name);
    }
  }
  env.GIT_CONFIG_NOSYSTEM = "1";
  env.GIT_CONFIG_GLOBAL = "/dev/null";
  if (extra) Object.assign(env, extra);
  return { env, stripped: [...new Set(stripped)].sort() };
}

function groupIsAlive(groupId) {
  if (!groupId) return false;
  try {
    process.kill(-groupId, 0);
    return true;
  } catch (error) {
    return error.code !== "ESRCH";
  }
}

function killOwnedGroup(groupId) {
  if (!groupId) return null;
  try {
    process.kill(-groupId, "SIGKILL");
    return null;
  } catch (error) {
    return error.code === "ESRCH" ? null : String(error.code ?? "UNKNOWN");
  }
}

async function reapOwnedGroup(groupId) {
  if (!groupId) return { reaped: true, error: null };
  let error = killOwnedGroup(groupId);
  const stopAt = Date.now() + REAP_TIMEOUT_MS;
  while (Date.now() < stopAt) {
    if (!groupIsAlive(groupId)) return { reaped: true, error };
    await delay(50);
  }
  error = killOwnedGroup(groupId) ?? error;
  return { reaped: !groupIsAlive(groupId), error };
}

/**
 * Runs a command in its own session/process group so the deadline and the
 * post-exit grace own descendants too, not just the direct child.
 */
function runChild(command, args, options) {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const stdinMode = options.stdin === undefined ? "ignore" : "pipe";
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      shell: false,
      detached: true,
      stdio: [stdinMode, "pipe", "pipe"],
    });
    if (options.stdin !== undefined && child.stdin) {
      child.stdin.write(options.stdin);
      child.stdin.end();
    }
    const groupId = typeof child.pid === "number" ? child.pid : null;
    const stdout = [];
    const stderr = [];
    let capturedBytes = 0;
    let truncated = false;
    const collect = (sink) => (chunk) => {
      if (capturedBytes >= OUTPUT_CAPTURE_BYTES) {
        truncated = true;
        return;
      }
      sink.push(chunk);
      capturedBytes += chunk.length;
    };
    child.stdout?.on("data", collect(stdout));
    child.stderr?.on("data", collect(stderr));

    let spawnError = null;
    let timedOut = false;
    let terminationError = null;
    child.on("error", (error) => {
      spawnError = String(error.code ?? error.message ?? "UNKNOWN");
    });
    const terminate = () => {
      const failure = killOwnedGroup(groupId);
      if (failure && !terminationError) terminationError = failure;
    };
    const deadline = setTimeout(() => {
      timedOut = true;
      terminate();
    }, options.deadlineMs);
    let grace = null;
    child.on("exit", () => {
      grace = setTimeout(terminate, POST_EXIT_GRACE_MS);
    });
    child.on("close", (code, signal) => {
      clearTimeout(deadline);
      clearTimeout(grace);
      reapOwnedGroup(groupId).then((ownershipReaped) => {
        const groupReaped = ownershipReaped.reaped;
        if (!groupReaped) {
          OWNERSHIP.unresolved.push({
            command: path.basename(command),
            groupId,
            args: args.slice(0, 4),
          });
        }
        resolve({
          code: typeof code === "number" ? code : null,
          signal: signal ?? null,
          spawnError,
          timedOut,
          truncated,
          durationMs: Date.now() - startedAt,
          stdout: Buffer.concat(stdout).toString("utf8"),
          stderr: Buffer.concat(stderr).toString("utf8"),
          groupId,
          groupReaped,
          terminationError:
            ownershipReaped.error ?? terminationError ?? null,
        });
      });
    });
  });
}

async function runChecked(command, args, options) {
  const result = await runChild(command, args, options);
  if (result.timedOut) {
    fail(
      options.timeoutCode ?? "COMMAND_TIMEOUT",
      describeCommand(command, args),
    );
  }
  if (result.spawnError) {
    fail(
      "COMMAND_SPAWN_FAILED",
      `${describeCommand(command, args)}: ${result.spawnError}`,
    );
  }
  if (result.code !== 0) {
    fail(
      options.code ?? "COMMAND_FAILED",
      `${describeCommand(command, args)} exit ${result.code}: ${
        result.stderr.trim().slice(0, 800) || "no stderr"
      }`,
    );
  }
  if (!result.groupReaped) {
    fail("PROCESS_GROUP_UNRESOLVED", describeCommand(command, args));
  }
  return result;
}

function describeCommand(command, args) {
  return `${path.basename(command)} ${args.slice(0, 6).join(" ")}`;
}

async function git(fixtureRoot, args, options = {}) {
  return runChecked("git", ["-C", fixtureRoot, ...args], {
    cwd: fixtureRoot,
    env: options.env ?? options.baseEnv ?? process.env,
    deadlineMs: options.deadlineMs ?? 120000,
    code: options.code ?? "GIT_COMMAND_FAILED",
    timeoutCode: "GIT_COMMAND_TIMEOUT",
  });
}

async function copyIfPresent(relativePath, destinationRoot) {
  const sourcePath = path.join(WORKSPACE, relativePath);
  if (!(await pathExists(sourcePath))) return false;
  const destinationPath = path.join(destinationRoot, relativePath);
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.cp(sourcePath, destinationPath, { recursive: true });
  return true;
}

async function overlayRuntime(fixtureRoot) {
  for (const tree of RUNTIME_TREES) {
    await copyIfPresent(tree, fixtureRoot);
  }
  for (const file of RUNTIME_FILES) {
    await copyIfPresent(file, fixtureRoot);
  }
  for (const tree of RUNTIME_TREES) {
    const root = path.join(fixtureRoot, tree);
    if (!(await pathExists(root))) continue;
    await removeTestArtifacts(root);
  }
}

async function removeTestArtifacts(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") {
        await fs.rm(fullPath, { recursive: true, force: true });
        continue;
      }
      await removeTestArtifacts(fullPath);
      continue;
    }
    if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".spec.ts")) {
      await fs.rm(fullPath, { force: true });
    }
  }
}

async function linkDependencyTrees(fixtureRoot) {
  const links = [
    ["node_modules", "node_modules"],
    ["cli/node_modules", "cli/node_modules"],
  ];
  const linked = [];
  for (const [relativeTarget, relativeLink] of links) {
    const source = path.join(WORKSPACE, relativeTarget);
    if (!(await pathExists(source))) continue;
    const link = path.join(fixtureRoot, relativeLink);
    if (await pathExists(link)) continue;
    await fs.mkdir(path.dirname(link), { recursive: true });
    await fs.symlink(source, link, "junction");
    linked.push(relativeLink);
  }
  return linked;
}

/** Initializes fixture-local Git and proves it cannot route outside the fixture. */
async function initializeFixtureGit(fixtureRoot, hooksDir, baseEnv) {
  await git(fixtureRoot, ["init", "--quiet"], {
    baseEnv,
    code: "GIT_INIT_FAILED",
  });
  await git(fixtureRoot, ["config", "--local", "user.name", "Fixture"], {
    baseEnv,
  });
  await git(
    fixtureRoot,
    ["config", "--local", "user.email", "fixture@example.invalid"],
    { baseEnv },
  );
  await git(fixtureRoot, ["config", "--local", "commit.gpgsign", "false"], {
    baseEnv,
  });
  await git(fixtureRoot, ["config", "--local", "core.hooksPath", hooksDir], {
    baseEnv,
  });
  const toplevel = (await git(fixtureRoot, ["rev-parse", "--show-toplevel"], {
    baseEnv,
  })).stdout.trim();
  const gitDir = (await git(fixtureRoot, ["rev-parse", "--absolute-git-dir"], {
    baseEnv,
  })).stdout.trim();
  const effectiveHooksPath = (await git(
    fixtureRoot,
    ["config", "--path", "--get", "core.hooksPath"],
    { baseEnv },
  )).stdout.trim();
  const physicalFixtureRoot = await fs.realpath(fixtureRoot);
  const physicalToplevel = await fs.realpath(toplevel);
  const physicalGitDir = await fs.realpath(gitDir);
  const physicalDotGit = await fs.realpath(path.join(fixtureRoot, ".git"));
  const physicalHooksPath = await fs.realpath(effectiveHooksPath);

  if (physicalToplevel !== physicalFixtureRoot) {
    fail("FIXTURE_GIT_TOPLEVEL_MISMATCH", toplevel);
  }
  assertOwnedGitDirectory(
    physicalFixtureRoot,
    physicalGitDir,
    physicalDotGit,
  );
  if (physicalHooksPath !== (await fs.realpath(hooksDir))) {
    fail("FIXTURE_HOOKS_NOT_ISOLATED", effectiveHooksPath);
  }
  const hookEntries = await fs.readdir(physicalHooksPath);
  if (hookEntries.length !== 0) {
    fail("FIXTURE_HOOKS_DIRECTORY_NOT_EMPTY", hookEntries.join(","));
  }
  return {
    toplevel,
    gitDir,
    hooksPath: effectiveHooksPath,
    physicalFixtureRoot,
    physicalGitDir,
    physicalDotGit,
    effectiveHooksPath,
  };
}

async function runBaselineProducers(fixtureRoot, traceFile, outDir) {
  const { env } = buildSanitizedEnv({
    CI: "true",
    GIT_TRACE2_EVENT: traceFile,
  });
  const stages = [];
  for (const script of PRODUCER_SCRIPTS) {
    const result = await runChild(
      process.execPath,
      ["--import", "tsx", path.join(fixtureRoot, script)],
      { cwd: fixtureRoot, env, deadlineMs: PRODUCER_DEADLINE_MS },
    );
    const label = path.basename(script, ".ts");
    await writeExclusive(
      path.join(outDir, `baseline-${label}.stdout.txt`),
      result.stdout,
    );
    await writeExclusive(
      path.join(outDir, `baseline-${label}.stderr.txt`),
      result.stderr,
    );
    stages.push({
      stage: `baseline:${label}`,
      exitCode: result.code,
      signal: result.signal,
      timedOut: result.timedOut,
      durationMs: result.durationMs,
      groupReaped: result.groupReaped,
    });
    if (result.timedOut) {
      fail("BASELINE_PRODUCER_TIMEOUT", script);
    }
    if (result.code !== 0) {
      fail(
        "BASELINE_PRODUCER_FAILED",
        `${script} exit ${result.code}: ${result.stderr.trim().slice(0, 800)}`,
      );
    }
    if (!result.groupReaped) fail("PROCESS_GROUP_UNRESOLVED", script);
  }
  return stages;
}

/** Lists top-level candidates Git itself reports as ignored, without force-adding. */
async function checkIgnoredTopLevel(fixtureRoot, candidates, baseEnv) {
  const result = await runChild(
    "git",
    ["-C", fixtureRoot, "check-ignore", "--stdin", "-z"],
    {
      cwd: fixtureRoot,
      env: baseEnv,
      deadlineMs: 60000,
      stdin: `${candidates.join("\0")}\0`,
    },
  );
  if (!result.groupReaped) fail("PROCESS_GROUP_UNRESOLVED", "git check-ignore");
  if (result.timedOut) fail("GIT_CHECK_IGNORE_TIMEOUT");
  if (result.spawnError) {
    fail("GIT_CHECK_IGNORE_SPAWN_FAILED", result.spawnError);
  }
  if (result.code !== 0 && result.code !== 1) {
    fail(
      "GIT_CHECK_IGNORE_FAILED",
      result.stderr.trim().slice(0, 400) || `exit ${result.code}`,
    );
  }
  return new Set(result.stdout.split("\0").filter(Boolean));
}

/**
 * Stages only the fixture's intended non-dependency top-level paths. Ignored
 * entries are filtered through Git itself instead of being named as positive
 * pathspecs (which Git rejects), and dependency links are removed from the index
 * afterwards.
 */
async function commitFixtureBase(fixtureRoot, baseEnv) {
  const topLevel = await fs.readdir(fixtureRoot, { withFileTypes: true });
  const candidates = topLevel
    .map((entry) => entry.name)
    .filter(
      (name) =>
        name !== ".git" &&
        name !== "node_modules" &&
        name !== "artifacts",
    )
    .sort();
  const ignored = await checkIgnoredTopLevel(fixtureRoot, candidates, baseEnv);
  const stageable = candidates.filter((name) => !ignored.has(name));
  if (stageable.length === 0) fail("FIXTURE_NOTHING_STAGEABLE");
  await git(fixtureRoot, ["add", "--all", "--", ...stageable], { baseEnv });
  for (const prefix of DEPENDENCY_LINK_PREFIXES) {
    if (!(await pathExists(path.join(fixtureRoot, prefix)))) continue;
    await git(
      fixtureRoot,
      ["rm", "--cached", "-r", "--ignore-unmatch", "--", prefix],
      { baseEnv },
    );
  }
  await git(fixtureRoot, ["commit", "--quiet", "-m", "fixture baseline"], {
    baseEnv,
  });
  const head = (await git(fixtureRoot, ["rev-parse", "HEAD"], { baseEnv }))
    .stdout.trim();
  const tracked = (await git(fixtureRoot, ["ls-files", "-z"], { baseEnv }))
    .stdout.split("\0")
    .filter(Boolean);

  const dependencyTracked = tracked.filter((trackedPath) =>
    DEPENDENCY_LINK_PREFIXES.some(
      (prefix) =>
        trackedPath === prefix || trackedPath.startsWith(`${prefix}/`),
    ),
  );
  if (dependencyTracked.length > 0) {
    fail(
      "FIXTURE_TRACKED_DEPENDENCIES",
      dependencyTracked.slice(0, 5).join(","),
    );
  }
  const evidenceTracked = tracked.filter(
    (trackedPath) =>
      trackedPath === "artifacts" || trackedPath.startsWith("artifacts/"),
  );
  if (evidenceTracked.length > 0) {
    fail("FIXTURE_TRACKED_EVIDENCE", evidenceTracked.slice(0, 5).join(","));
  }
  const missing = REQUIRED_TRACKED_PATHS.filter(
    (requiredPath) => !tracked.includes(requiredPath),
  );
  if (missing.length > 0) {
    fail("FIXTURE_TRACKED_REQUIRED_MISSING", missing.join(","));
  }
  const hasHostMirror = tracked.some((trackedPath) =>
    trackedPath.startsWith(".github/skills/"),
  );
  if (!hasHostMirror) fail("FIXTURE_TRACKED_HOST_MIRROR_MISSING");

  return { fixtureBase: head, trackedCount: tracked.length };
}

async function overlayCanonicalInputs(fixtureRoot) {
  const skillsPath = path.join(fixtureRoot, "skills");
  await fs.rm(skillsPath, { recursive: true, force: true });
  await fs.cp(path.join(WORKSPACE, "skills"), skillsPath, { recursive: true });
  const workflows = [];
  for (const name of CHANGED_WORKFLOWS) {
    const relativeWorkflow = `.agents/workflows/${name}.md`;
    const copied = await copyIfPresent(relativeWorkflow, fixtureRoot);
    workflows.push({ workflow: relativeWorkflow, present: copied });
  }
  return workflows;
}

function parseReceiptPath(stdout) {
  const matches = [...stdout.matchAll(/Receipt:\s*(\S+)/g)];
  return matches.length > 0 ? matches[matches.length - 1][1] : null;
}

async function runEntrypoint(fixtureRoot, args, traceFile, deadlineMs) {
  const { env } = buildSanitizedEnv({
    CI: "true",
    GIT_TRACE2_EVENT: traceFile,
  });
  const entrypoint = path.join(fixtureRoot, "scripts/generation/index.ts");
  const result = await runChild(
    process.execPath,
    ["--import", "tsx", entrypoint, ...args],
    { cwd: fixtureRoot, env, deadlineMs },
  );
  return { ...result, receiptPath: parseReceiptPath(result.stdout) };
}

async function writeEntrypointResultEvidence(
  outDir,
  stage,
  fixtureRoot,
  args,
  result,
) {
  const stdoutFile = `${stage}.stdout.txt`;
  const stderrFile = `${stage}.stderr.txt`;
  const resultFile = `${stage}.command-result.json`;
  await writeExclusive(path.join(outDir, stdoutFile), result.stdout);
  await writeExclusive(path.join(outDir, stderrFile), result.stderr);
  await writeExclusive(
    path.join(outDir, resultFile),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        stage,
        command: process.execPath,
        argv: [
          process.execPath,
          "--import",
          "tsx",
          path.join(fixtureRoot, "scripts/generation/index.ts"),
          ...args,
        ],
        cwd: fixtureRoot,
        exitCode: result.code,
        signal: result.signal,
        spawnError: result.spawnError,
        timedOut: result.timedOut,
        terminationError: result.terminationError,
        truncated: result.truncated,
        durationMs: result.durationMs,
        processGroup: {
          id: result.groupId,
          reaped: result.groupReaped,
        },
        logs: { stdout: stdoutFile, stderr: stderrFile },
      },
      null,
      2,
    )}\n`,
  );
  return resultFile;
}

async function captureGitState(fixtureRoot, baseEnv) {
  const head = (await git(fixtureRoot, ["rev-parse", "HEAD"], { baseEnv }))
    .stdout.trim();
  const index = await git(fixtureRoot, ["ls-files", "--stage", "-z"], {
    baseEnv,
  });
  return { head, indexSha256: sha256Bytes(index.stdout) };
}

function classifyGitInvocation(argv) {
  const rest = Array.isArray(argv) ? argv.slice(1) : [];
  let index = 0;
  while (index < rest.length) {
    const token = rest[index];
    if (!token.startsWith("-")) break;
    index += TRACE_GLOBAL_FLAGS_WITH_VALUE.has(token) ? 2 : 1;
  }
  return { name: rest[index] ?? "unknown", args: rest.slice(index + 1) };
}

/**
 * Parses native Git Trace2 EVENT records: `start` events carry argv, `cmd_name`
 * events carry the command identity. Batched identity listings are distinguished
 * from per-path proof queries by their arguments.
 */
async function trace2Summary(traceFile, options) {
  let text;
  try {
    text = await fs.readFile(traceFile, "utf8");
  } catch (error) {
    if (options.required) {
      fail(
        "TRACE2_MISSING",
        `${path.basename(traceFile)}:${error.code ?? "UNKNOWN"}`,
      );
    }
    return {
      file: path.basename(traceFile),
      unavailable: String(error.code ?? "UNKNOWN"),
    };
  }
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  const events = [];
  let invalidLines = 0;
  for (const line of lines) {
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      invalidLines += 1;
      continue;
    }
    if (!event || typeof event.event !== "string") {
      invalidLines += 1;
      continue;
    }
    events.push(event);
  }
  if (options.required && invalidLines > 0) {
    fail(
      "TRACE2_INVALID_LINES",
      `${path.basename(traceFile)}:${invalidLines}/${lines.length}`,
    );
  }

  const starts = events.filter((event) => event.event === "start");
  const sessionIds = new Set();
  const byName = {};
  let lsFilesBatched = 0;
  let lsFilesPathspec = 0;
  let lsTreeRecursive = 0;
  let lsTreePathspec = 0;
  const sampleArgv = [];
  const commandSequence = [];
  for (const event of starts) {
    if (typeof event.sid === "string") sessionIds.add(event.sid);
    const invocation = classifyGitInvocation(event.argv);
    byName[invocation.name] = (byName[invocation.name] ?? 0) + 1;
    if (commandSequence.length < 40) {
      commandSequence.push(invocation.name);
    }
    if (invocation.name === "ls-files") {
      if (invocation.args.includes("--")) lsFilesPathspec += 1;
      else lsFilesBatched += 1;
    } else if (invocation.name === "ls-tree") {
      if (invocation.args.includes("-r")) lsTreeRecursive += 1;
      else lsTreePathspec += 1;
    }
    if (sampleArgv.length < 3 && Array.isArray(event.argv)) {
      sampleArgv.push(event.argv.slice(0, 8).join(" ").slice(0, 200));
    }
  }
  const batchedListings = lsFilesBatched + lsTreeRecursive;
  const proofQueries = lsFilesPathspec + lsTreePathspec;
  return {
    file: path.basename(traceFile),
    lines: lines.length,
    invalidLines,
    commandStarts: starts.length,
    byName,
    lsFilesBatched,
    lsFilesPathspec,
    lsTreeRecursive,
    lsTreePathspec,
    batchedListings,
    proofQueries,
    uniqueSessions: sessionIds.size,
    sampleArgv,
    commandSequence,
    interpretation:
      `${starts.length} git commands; ${batchedListings} batched identity ` +
      `listings (capture/guards); ${proofQueries} per-path proof queries`,
  };
}

function orderedValue(value) {
  if (Array.isArray(value)) return value.map(orderedValue);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, nested]) => [key, orderedValue(nested)]),
  );
}

function tokenMetricsDigest(metadata) {
  const projection = {};
  for (const category of Object.keys(metadata.categories ?? {}).sort()) {
    const details = metadata.categories[category];
    projection[category] = Object.prototype.hasOwnProperty.call(
      details,
      "token_metrics",
    )
      ? { present: true, value: orderedValue(details.token_metrics) }
      : { present: false };
  }
  return sha256Bytes(JSON.stringify(projection));
}

function withoutTokenMetrics(metadata) {
  const projection = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (key === "categories") continue;
    projection[key] = value;
  }
  projection.categories = {};
  for (const [category, details] of Object.entries(metadata.categories ?? {})) {
    const rest = {};
    for (const [key, value] of Object.entries(details)) {
      if (key === "token_metrics") continue;
      rest[key] = value;
    }
    projection.categories[category] = rest;
  }
  return orderedValue(projection);
}

function normalizedPathSet(value, label, excluded = []) {
  if (!Array.isArray(value)) fail("RECEIPT_SHAPE", `${label}:not-array`);
  const seen = new Set();
  const paths = [];
  for (const entry of value) {
    if (typeof entry !== "string" || entry.length === 0) {
      fail("RECEIPT_SHAPE", `${label}:non-string`);
    }
    if (excluded.includes(entry)) continue;
    if (seen.has(entry)) fail("RECEIPT_DUPLICATE_PATH", entry);
    seen.add(entry);
    paths.push(entry);
  }
  return paths.sort();
}

function sameStringArray(left, right) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function lockEntry(lock, relPath) {
  const cliEntry = lock?.entries?.[relPath];
  const generationEntry = lock?.generation?.entries?.[relPath];
  if (cliEntry && generationEntry) return { kind: "conflict" };
  if (cliEntry) return { kind: "cli", entry: cliEntry };
  if (generationEntry) return { kind: "generation", entry: generationEntry };
  return { kind: "none" };
}

async function writeExclusive(filePath, content) {
  await fs.writeFile(filePath, content, { flag: "wx", mode: 0o600 });
}

async function readDeclaredDigests(fixtureRoot, declaredPaths) {
  const digests = {};
  for (const relPath of declaredPaths) {
    try {
      digests[relPath] = await sha256File(path.join(fixtureRoot, relPath));
    } catch (error) {
      if (error.code === "ENOENT") {
        digests[relPath] = null;
        continue;
      }
      throw error;
    }
  }
  return digests;
}

async function verifyChangedOutputs(
  fixtureRoot,
  changedPaths,
  verifiedPaths,
  lock,
  baselineLock,
  baselineDigests,
  outDir,
) {
  const mismatches = [];
  const classes = { cli: 0, generation: 0, none: 0, conflict: 0 };
  for (const relPath of changedPaths) {
    const classification = lockEntry(lock, relPath);
    classes[classification.kind] += 1;
    const absolutePath = path.join(fixtureRoot, relPath);
    if (!(await pathExists(absolutePath))) {
      mismatches.push({ path: relPath, reason: "missing" });
      continue;
    }
    const actual = await sha256File(absolutePath);
    if (actual === baselineDigests[relPath]) {
      mismatches.push({ path: relPath, reason: "unchanged-vs-baseline" });
    }
    if (classification.kind !== "cli" && classification.kind !== "generation") {
      mismatches.push({ path: relPath, reason: classification.kind });
      continue;
    }
    const prior = lockEntry(baselineLock, relPath);
    if (relPath === "skills/metadata.json") {
      if (classification.kind !== "generation") {
        mismatches.push({ path: relPath, reason: "metadata-not-generation" });
      }
      continue;
    }
    if (prior.kind === "cli") {
      if (classification.kind !== "cli") {
        mismatches.push({ path: relPath, reason: "class-changed" });
        continue;
      }
      for (const field of ["owner", "source", "agent"]) {
        if (
          prior.entry?.[field] !== undefined &&
          classification.entry?.[field] !== prior.entry?.[field]
        ) {
          mismatches.push({ path: relPath, reason: `identity-${field}` });
        }
      }
    } else if (prior.kind === "generation") {
      if (classification.kind !== "generation") {
        mismatches.push({ path: relPath, reason: "class-changed" });
      }
    } else if (classification.kind !== "generation") {
      mismatches.push({ path: relPath, reason: "unexpected-acquisition" });
    }
    if (
      classification.kind === "generation" &&
      (typeof classification.entry?.source !== "string" ||
        classification.entry.source.length === 0)
    ) {
      mismatches.push({ path: relPath, reason: "generation-source" });
    }
  }
  if (verifiedPaths.length !== changedPaths.length) {
    mismatches.push({ path: "<set>", reason: "verified-not-equal-changed" });
  }
  if (mismatches.length > 0) {
    await writeExclusive(
      path.join(outDir, "changed-byte-mismatches.json"),
      `${JSON.stringify(mismatches, null, 2)}\n`,
    );
  }
  return { changed: changedPaths.length, classes, mismatches };
}

async function verifyUnchangedUnknown(
  fixtureRoot,
  declaredPaths,
  changedPaths,
  lock,
  baselineDigests,
) {
  const changed = new Set(changedPaths);
  const violations = [];
  let checked = 0;
  for (const relPath of declaredPaths) {
    if (changed.has(relPath)) continue;
    checked += 1;
    const absolutePath = path.join(fixtureRoot, relPath);
    const exists = await pathExists(absolutePath);
    const actual = exists ? await sha256File(absolutePath) : null;
    if (actual !== baselineDigests[relPath]) {
      violations.push({ path: relPath, reason: "bytes-changed" });
    }
    if (lockEntry(lock, relPath).kind !== "none") {
      violations.push({ path: relPath, reason: "ownership-acquired" });
    }
  }
  return { checked, violations };
}

async function runSmoke(args) {
  const outDir = await prepareEvidenceDir(args.out);
  const startedAt = new Date().toISOString();
  OWNERSHIP.unresolved.length = 0;
  const state = {
    schemaVersion: 1,
    kind: "ROOT_SCALE_GIT_IDENTITY_SMOKE",
    status: "STARTED",
    startedAt,
    evidenceDir: path.relative(WORKSPACE, outDir).split(path.sep).join("/"),
    workspace: WORKSPACE,
    base: BASE,
    outputBand: { declared: DECLARED_BAND, changed: CHANGED_BAND },
    deadlines: {
      applyMs: APPLY_DEADLINE_MS,
      checkMs: CHECK_DEADLINE_MS,
      producerMs: PRODUCER_DEADLINE_MS,
      postExitGraceMs: POST_EXIT_GRACE_MS,
      reapMs: REAP_TIMEOUT_MS,
    },
    stages: [],
    fixture: null,
    counts: null,
    verification: null,
    error: null,
    limits: [
      "Passing-after evidence only: the pre-change batched implementation was replaced, so no historical failing-before run is claimed.",
      "No live-root mutation, adoption or reapply; the fixture is an owned temporary copy.",
      "Trace2 counts come from native GIT_TRACE2_EVENT; they are diagnostic instrumentation, not a production hook.",
      "Independent byte expectation is the real check-mode producer re-derivation plus baseline byte comparison, not the active lock.",
    ],
  };
  let tempRoot = null;
  let failure = null;
  let fixtureRetained = false;

  const recordStage = (stage, durationMs, extra = {}) => {
    state.stages.push({ stage, durationMs, ...extra });
  };
  const base = buildSanitizedEnv();
  state.gitIsolation = { strippedVariables: base.stripped };

  try {
    const tempStarted = Date.now();
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ags-root-scale-"));
    recordStage("temp-root", Date.now() - tempStarted);
    state.gitIsolation.selfChecks = await runIsolationSelfChecks(tempRoot);

    const archivePath = path.join(tempRoot, "base.tar");
    const archiveStarted = Date.now();
    await runChecked(
      "git",
      ["-C", WORKSPACE, "archive", "--format=tar", "-o", archivePath, BASE],
      {
        cwd: WORKSPACE,
        env: base.env,
        deadlineMs: 300000,
        code: "BASE_ARCHIVE_FAILED",
        timeoutCode: "BASE_ARCHIVE_TIMEOUT",
      },
    );
    const fixtureRoot = path.join(tempRoot, "fixture");
    await fs.mkdir(fixtureRoot, { recursive: true });
    await runChecked("tar", ["-xf", archivePath, "-C", fixtureRoot], {
      cwd: tempRoot,
      env: base.env,
      deadlineMs: 300000,
      code: "BASE_EXTRACT_FAILED",
      timeoutCode: "BASE_EXTRACT_TIMEOUT",
    });
    recordStage("archive-base", Date.now() - archiveStarted, {
      bytes: (await fs.stat(archivePath)).size,
    });

    const overlayStarted = Date.now();
    await overlayRuntime(fixtureRoot);
    recordStage("overlay-runtime", Date.now() - overlayStarted);

    const linkStarted = Date.now();
    const linked = await linkDependencyTrees(fixtureRoot);
    recordStage("link-dependencies", Date.now() - linkStarted, { linked });

    const hooksDir = path.join(tempRoot, "empty-hooks");
    await fs.mkdir(hooksDir, { recursive: true });
    const isolationStarted = Date.now();
    const gitIsolation = await initializeFixtureGit(
      fixtureRoot,
      hooksDir,
      base.env,
    );
    recordStage("isolate-fixture-git", Date.now() - isolationStarted, {
      gitIsolation,
    });

    await fs.mkdir(
      path.dirname(path.join(fixtureRoot, UNRELATED_AUTHORITY_REL)),
      { recursive: true },
    );
    await fs.writeFile(
      path.join(fixtureRoot, UNRELATED_AUTHORITY_REL),
      "fixture unrelated authority\n",
    );

    const baselineTrace = path.join(outDir, "trace2-baseline.jsonl");
    const baselineStarted = Date.now();
    const baselineStages = await runBaselineProducers(
      fixtureRoot,
      baselineTrace,
      outDir,
    );
    state.stages.push(...baselineStages);
    recordStage("baseline-producers", Date.now() - baselineStarted);

    const commitStarted = Date.now();
    const committed = await commitFixtureBase(fixtureRoot, base.env);
    recordStage("commit-fixture-base", Date.now() - commitStarted, committed);

    const baselineLockPath = path.join(fixtureRoot, ".skills-lock.json");
    if (!(await pathExists(baselineLockPath))) {
      fail("BASELINE_LOCK_MISSING");
    }
    const baselineLockBytes = await fs.readFile(baselineLockPath);
    await writeExclusive(
      path.join(outDir, "baseline-lock.json"),
      baselineLockBytes,
    );
    const baselineLock = JSON.parse(baselineLockBytes.toString("utf8"));

    const unrelatedDigest = await sha256File(
      path.join(fixtureRoot, UNRELATED_AUTHORITY_REL),
    );
    const validUnrelatedTemplate = Object.values(baselineLock.entries).find(
      (entry) =>
        ["skill", "workflow", "specialist", "bridge", "index"].includes(
          entry?.owner,
        ) &&
        typeof entry.source === "string" &&
        typeof entry.agent === "string" &&
        /^[0-9a-f]{64}$/i.test(entry.sha256 ?? ""),
    );
    if (!validUnrelatedTemplate) {
      fail("BASELINE_CLI_AUTHORITY_MISSING");
    }
    const unrelatedEntry = {
      owner: validUnrelatedTemplate.owner,
      source: validUnrelatedTemplate.source,
      agent: validUnrelatedTemplate.agent,
      sha256: unrelatedDigest,
    };
    const unrelatedFileDigest = unrelatedDigest;
    const injectedLock = {
      ...baselineLock,
      entries: { [UNRELATED_AUTHORITY_REL]: unrelatedEntry },
    };
    delete injectedLock.generation;
    const injectedBytes = `${JSON.stringify(injectedLock, null, 2)}\n`;
    await fs.writeFile(baselineLockPath, injectedBytes);
    await writeExclusive(
      path.join(outDir, "injected-unrelated-lock.json"),
      injectedBytes,
    );

    const baselineCheckTrace = path.join(outDir, "trace2-baseline-check.jsonl");
    const baselineCheckStarted = Date.now();
    const baselineCheck = await runEntrypoint(
      fixtureRoot,
      ["--check"],
      baselineCheckTrace,
      CHECK_DEADLINE_MS,
    );
    await writeEntrypointResultEvidence(
      outDir,
      "baseline-check",
      fixtureRoot,
      ["--check"],
      baselineCheck,
    );
    recordStage("baseline-check", Date.now() - baselineCheckStarted, {
      exitCode: baselineCheck.code,
      timedOut: baselineCheck.timedOut,
    });
    if (!baselineCheck.groupReaped) {
      fail("PROCESS_GROUP_UNRESOLVED", "baseline-check");
    }
    if (baselineCheck.timedOut) fail("BASELINE_CHECK_TIMEOUT");
    if (baselineCheck.code !== 0) {
      fail("BASELINE_CHECK_FAILED", baselineCheck.stderr.trim().slice(0, 1200));
    }
    if (!baselineCheck.receiptPath) fail("BASELINE_CHECK_RECEIPT_MISSING");
    const baselineCheckReceipt = JSON.parse(
      await fs.readFile(baselineCheck.receiptPath, "utf8"),
    );
    await writeExclusive(
      path.join(outDir, "baseline-check-receipt.json"),
      `${JSON.stringify(baselineCheckReceipt, null, 2)}\n`,
    );
    if (baselineCheckReceipt.status !== "PASS") {
      fail("BASELINE_CHECK_STATUS", String(baselineCheckReceipt.status));
    }
    const declaredPaths = normalizedPathSet(
      baselineCheckReceipt.declaredFiles,
      "baseline.declaredFiles",
    );
    const baselineDigests = await readDeclaredDigests(
      fixtureRoot,
      declaredPaths,
    );
    await writeExclusive(
      path.join(outDir, "baseline-declared-digests.json"),
      `${JSON.stringify(baselineDigests, null, 2)}\n`,
    );
    if (args.prerequisitesOnly) {
      state.prerequisites = {
        status: "PREREQUISITES_VERIFIED",
        physicalGitIdentity: gitIsolation,
        effectiveHooksPath: gitIsolation.effectiveHooksPath,
        unrelatedAuthority: {
          path: UNRELATED_AUTHORITY_REL,
          owner: unrelatedEntry.owner,
          source: unrelatedEntry.source,
          agent: unrelatedEntry.agent,
          sha256: unrelatedEntry.sha256,
          fileSha256: unrelatedFileDigest,
        },
        baselineCheck: {
          status: baselineCheckReceipt.status,
          declaredFiles: declaredPaths.length,
        },
      };
      throw PREREQUISITES_VERIFIED;
    }

    const canonicalStarted = Date.now();
    const workflows = await overlayCanonicalInputs(fixtureRoot);
    const canonicalMetadataBytes = await fs.readFile(
      path.join(fixtureRoot, "skills", "metadata.json"),
    );
    await writeExclusive(
      path.join(outDir, "canonical-metadata.json"),
      canonicalMetadataBytes,
    );
    recordStage("overlay-canonical", Date.now() - canonicalStarted, {
      workflows,
    });

    const configBefore = await sha256File(path.join(fixtureRoot, ".skillsrc"));
    const gitBefore = await captureGitState(fixtureRoot, base.env);

    const applyTrace = path.join(outDir, "trace2-apply.jsonl");
    const applyStarted = Date.now();
    const apply = await runEntrypoint(
      fixtureRoot,
      ["--adopt-base", committed.fixtureBase],
      applyTrace,
      APPLY_DEADLINE_MS,
    );
    recordStage("apply", Date.now() - applyStarted, {
      exitCode: apply.code,
      signal: apply.signal,
      timedOut: apply.timedOut,
    });
    await writeEntrypointResultEvidence(
      outDir,
      "apply",
      fixtureRoot,
      ["--adopt-base", committed.fixtureBase],
      apply,
    );
    if (!apply.groupReaped) {
      fail("PROCESS_GROUP_UNRESOLVED", "apply");
    }
    if (apply.timedOut) fail("APPLY_DEADLINE_EXCEEDED");
    if (apply.code !== 0) {
      fail("APPLY_FAILED", apply.stderr.trim().slice(0, 1200));
    }

    const checkTrace = path.join(outDir, "trace2-check.jsonl");
    const checkStarted = Date.now();
    const check = await runEntrypoint(
      fixtureRoot,
      ["--check"],
      checkTrace,
      CHECK_DEADLINE_MS,
    );
    recordStage("check", Date.now() - checkStarted, {
      exitCode: check.code,
      signal: check.signal,
      timedOut: check.timedOut,
    });
    await writeEntrypointResultEvidence(
      outDir,
      "check",
      fixtureRoot,
      ["--check"],
      check,
    );
    if (!check.groupReaped) {
      fail("PROCESS_GROUP_UNRESOLVED", "check");
    }
    if (check.timedOut) fail("CHECK_DEADLINE_EXCEEDED");
    if (check.code !== 0) {
      fail("CHECK_FAILED", check.stderr.trim().slice(0, 1200));
    }

    const applyReceipt = apply.receiptPath
      ? JSON.parse(await fs.readFile(apply.receiptPath, "utf8"))
      : null;
    const checkReceipt = check.receiptPath
      ? JSON.parse(await fs.readFile(check.receiptPath, "utf8"))
      : null;
    if (!applyReceipt) fail("APPLY_RECEIPT_MISSING");
    if (!checkReceipt) fail("CHECK_RECEIPT_MISSING");
    await writeExclusive(
      path.join(outDir, "apply-receipt.json"),
      `${JSON.stringify(applyReceipt, null, 2)}\n`,
    );
    await writeExclusive(
      path.join(outDir, "check-receipt.json"),
      `${JSON.stringify(checkReceipt, null, 2)}\n`,
    );
    if (applyReceipt.status !== "APPLIED") {
      fail("APPLY_RECEIPT_STATUS", String(applyReceipt.status));
    }
    if (checkReceipt.status !== "PASS") {
      fail("CHECK_RECEIPT_STATUS", String(checkReceipt.status));
    }
    if (
      !sameStringArray(
        declaredPaths,
        normalizedPathSet(checkReceipt.declaredFiles, "check.declaredFiles"),
      )
    ) {
      fail("DECLARED_SET_DRIFT");
    }

    const lockPath = path.join(fixtureRoot, ".skills-lock.json");
    if (!(await pathExists(lockPath))) fail("OWNERSHIP_MANIFEST_MISSING");
    const lock = JSON.parse(await fs.readFile(lockPath, "utf8"));

    const changedPaths = normalizedPathSet(
      applyReceipt.copiedBackFiles,
      "apply.copiedBackFiles",
      [".skills-lock.json"],
    );
    const verifiedPaths = normalizedPathSet(
      applyReceipt.verifiedFiles,
      "apply.verifiedFiles",
      [".skills-lock.json"],
    );
    if (changedPaths.length === 0) fail("NO_CHANGED_OUTPUTS");
    if (!sameStringArray(changedPaths, verifiedPaths)) {
      fail("CHANGED_VERIFIED_SET_MISMATCH");
    }
    for (const relPath of changedPaths) {
      if (!declaredPaths.includes(relPath)) {
        fail("CHANGED_NOT_DECLARED", relPath);
      }
    }
    state.counts = {
      declared: declaredPaths.length,
      changed: changedPaths.length,
      verified: verifiedPaths.length,
    };

    const verification = {
      changedBytes: await verifyChangedOutputs(
        fixtureRoot,
        changedPaths,
        verifiedPaths,
        lock,
        baselineLock,
        baselineDigests,
        outDir,
      ),
      unchangedUnknown: await verifyUnchangedUnknown(
        fixtureRoot,
        declaredPaths,
        changedPaths,
        lock,
        baselineDigests,
      ),
    };
    verification.declaredInBand =
      declaredPaths.length >= DECLARED_BAND.minimum &&
      declaredPaths.length <= DECLARED_BAND.maximum;
    verification.changedInBand =
      changedPaths.length >= CHANGED_BAND.minimum &&
      changedPaths.length <= CHANGED_BAND.maximum;

    const preservedUnrelated = lockEntry(lock, UNRELATED_AUTHORITY_REL);
    const preservedUnrelatedFileDigest = await sha256File(
      path.join(fixtureRoot, UNRELATED_AUTHORITY_REL),
    );
    verification.unrelatedAuthority = {
      rowPreserved:
        preservedUnrelated.kind === "cli" &&
        preservedUnrelated.entry?.owner === unrelatedEntry.owner &&
        preservedUnrelated.entry?.source === unrelatedEntry.source &&
        preservedUnrelated.entry?.agent === unrelatedEntry.agent &&
        preservedUnrelated.entry?.sha256 === unrelatedEntry.sha256,
      filePreserved: preservedUnrelatedFileDigest === unrelatedFileDigest,
      expectedFileSha256: unrelatedFileDigest,
      actualFileSha256: preservedUnrelatedFileDigest,
      kind: preservedUnrelated.kind,
    };
    verification.unrelatedAuthority.preserved =
      verification.unrelatedAuthority.rowPreserved &&
      verification.unrelatedAuthority.filePreserved;

    const finalMetadata = JSON.parse(
      await fs.readFile(
        path.join(fixtureRoot, "skills", "metadata.json"),
        "utf8",
      ),
    );
    const canonicalMetadata = JSON.parse(
      canonicalMetadataBytes.toString("utf8"),
    );
    verification.metadataNonMetricPreserved =
      JSON.stringify(withoutTokenMetrics(canonicalMetadata)) ===
      JSON.stringify(withoutTokenMetrics(finalMetadata));
    const metadataScope =
      lock?.generation?.entries?.["skills/metadata.json"]?.scope;
    verification.metadataScope = {
      kind: metadataScope?.kind ?? null,
      matches:
        metadataScope?.kind === "category-token-metrics" &&
        metadataScope?.sha256 === tokenMetricsDigest(finalMetadata),
    };

    const gitAfter = await captureGitState(fixtureRoot, base.env);
    const configAfter = await sha256File(path.join(fixtureRoot, ".skillsrc"));
    verification.git = {
      headUnchanged:
        gitBefore.head === gitAfter.head &&
        gitAfter.head === committed.fixtureBase,
      indexUnchanged: gitBefore.indexSha256 === gitAfter.indexSha256,
    };
    verification.configUnchanged = configBefore === configAfter;

    const baselineTraceSummary = await trace2Summary(baselineTrace, {
      required: false,
    });
    const baselineCheckTraceSummary = await trace2Summary(
      baselineCheckTrace,
      { required: true },
    );
    const applyTraceSummary = await trace2Summary(applyTrace, {
      required: true,
    });
    const checkTraceSummary = await trace2Summary(checkTrace, {
      required: true,
    });
    if (baselineTraceSummary.commandStarts === 0) {
      baselineTraceSummary.interpretation +=
        " (no git subprocess observed in baseline producers)";
    }
    if (applyTraceSummary.commandStarts === 0) {
      fail("TRACE2_NO_COMMANDS", "apply");
    }
    if (applyTraceSummary.lsFilesBatched === 0) {
      fail("TRACE2_NO_BATCHED_INDEX_LISTING");
    }
    if (applyTraceSummary.lsTreeRecursive === 0) {
      fail("TRACE2_NO_BATCHED_TREE_LISTING");
    }
    const gitCommandCeiling =
      declaredPaths.length + 6 * changedPaths.length + 200;
    if (applyTraceSummary.commandStarts > gitCommandCeiling) {
      fail(
        "GIT_COMMAND_CEILING_EXCEEDED",
        `${applyTraceSummary.commandStarts}>${gitCommandCeiling}`,
      );
    }
    verification.measurement = {
      baseline: baselineTraceSummary,
      baselineCheck: baselineCheckTraceSummary,
      apply: applyTraceSummary,
      check: checkTraceSummary,
      oldPerGuardQueryLowerBound:
        2 * declaredPaths.length * changedPaths.length,
      gitCommandCeiling,
      ceilingSatisfied: applyTraceSummary.commandStarts <= gitCommandCeiling,
    };
    verification.independence = {
      byteExpectation:
        "check-mode real-producer re-derivation plus baseline byte comparison",
      ownershipExpectation:
        "baseline producer classes/identity captured before apply; active lock compared, never copied",
    };
    verification.sourceIdentity = {
      base: BASE,
      isolatedStage: await sha256File(
        path.join(WORKSPACE, "scripts/generation/isolated-stage.ts"),
      ),
      isolatedStageTest: await sha256File(
        path.join(WORKSPACE, "scripts/generation/isolated-stage.test.ts"),
      ),
      smokeHelper: await sha256File(
        path.join(WORKSPACE, A_REL, "root-scale-generation-smoke.mjs"),
      ),
    };
    state.verification = verification;

    const qualified =
      verification.changedBytes.mismatches.length === 0 &&
      verification.unchangedUnknown.violations.length === 0 &&
      verification.unrelatedAuthority.preserved &&
      verification.metadataNonMetricPreserved &&
      verification.metadataScope.matches &&
      verification.git.headUnchanged &&
      verification.git.indexUnchanged &&
      verification.configUnchanged &&
      verification.declaredInBand &&
      verification.changedInBand &&
      verification.measurement.ceilingSatisfied;

    if (!qualified) {
      const reasons = [];
      if (verification.changedBytes.mismatches.length > 0) {
        reasons.push("changed-bytes");
      }
      if (verification.unchangedUnknown.violations.length > 0) {
        reasons.push("unchanged-unknown");
      }
      if (!verification.unrelatedAuthority.preserved) {
        reasons.push("unrelated-authority");
      }
      if (!verification.metadataNonMetricPreserved) {
        reasons.push("metadata-nonmetric");
      }
      if (!verification.metadataScope.matches) reasons.push("metadata-scope");
      if (!verification.git.headUnchanged) reasons.push("git-head");
      if (!verification.git.indexUnchanged) reasons.push("git-index");
      if (!verification.configUnchanged) reasons.push("config");
      if (!verification.declaredInBand) reasons.push("declared-topology-band");
      if (!verification.changedInBand) reasons.push("changed-topology-band");
      if (!verification.measurement.ceilingSatisfied) {
        reasons.push("git-command-ceiling");
      }
      fail("QUALIFICATION_MISMATCH", reasons.join(","));
    }
    state.status = "QUALIFIED";
  } catch (error) {
    if (error === PREREQUISITES_VERIFIED) {
      state.status = "PREREQUISITES_VERIFIED";
    } else {
      failure = error;
      state.error = {
        code: error instanceof SmokeFailure ? error.code : "UNEXPECTED_ERROR",
        detail:
          error instanceof SmokeFailure
            ? error.detail
            : String(error?.message ?? error ?? "unknown"),
      };
      state.status = "FAILED";
    }
  }

  state.processGroups = OWNERSHIP.unresolved.slice();
  if (OWNERSHIP.unresolved.length > 0) {
    state.retainFixture = true;
    fixtureRetained = true;
  }

  if (tempRoot) {
    if (failure) {
      const fixtureRoot = path.join(tempRoot, "fixture");
      const logSource = path.join(fixtureRoot, "artifacts", "generation-logs");
      if (await pathExists(logSource)) {
        try {
          await fs.cp(logSource, path.join(outDir, "fixture-generation-logs"), {
            recursive: true,
          });
        } catch (copyError) {
          state.fixtureLogCopyError = String(copyError.code ?? "UNKNOWN");
        }
      }
    }
    const mustRetain =
      fixtureRetained || (failure && Boolean(args.keepFixture));
    if (mustRetain) {
      state.fixtureRetained = tempRoot;
    } else {
      try {
        await fs.rm(tempRoot, { recursive: true, force: true });
      } catch (cleanupError) {
        state.fixtureRetained = tempRoot;
        state.fixtureCleanupError = String(cleanupError.code ?? "UNKNOWN");
      }
    }
  }

  if (state.fixtureCleanupError) {
    state.status = "FAILED";
    state.error = {
      code: "FIXTURE_CLEANUP_FAILED",
      detail: state.fixtureCleanupError,
    };
  }
  if (OWNERSHIP.unresolved.length > 0) {
    state.status = "FAILED";
  }

  state.finishedAt = new Date().toISOString();
  await writeExclusive(
    path.join(outDir, "summary.json"),
    `${JSON.stringify(state, null, 2)}\n`,
  );
  return state;
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`refused: ${error.code ?? "USAGE"}\n${USAGE}`);
    return 2;
  }
  if (args.help) {
    process.stdout.write(USAGE);
    return 0;
  }
  if ((await fs.realpath(process.cwd())) !== (await fs.realpath(WORKSPACE))) {
    process.stderr.write(
      `${JSON.stringify({ status: "REFUSED", code: "WORKSPACE_MISMATCH" })}\n`,
    );
    return 1;
  }
  try {
    const state = await runSmoke(args);
    process.stdout.write(
      `${JSON.stringify({
        status: state.status,
        evidence: state.evidenceDir,
        counts: state.counts,
        error: state.error,
      })}\n`,
    );
    return ["QUALIFIED", "PREREQUISITES_VERIFIED"].includes(state.status)
      ? 0
      : 1;
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({
        status: "FAILED",
        code: error?.code ?? "UNEXPECTED_ERROR",
        detail: String(error?.detail ?? error?.message ?? "unknown"),
      })}\n`,
    );
    return 1;
  }
}

process.exitCode = await main();
