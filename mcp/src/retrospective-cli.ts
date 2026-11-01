#!/usr/bin/env node
/**
 * `ags-retrospective` — the local, human-invoked retrospective CLI.
 *
 * Boundary rules enforced here:
 * - stdout carries only a minimal machine receipt or a human-facing path list;
 *   it never carries report text, titles, excerpts or diagnostics.
 * - `--consent`/`--ack-storage-risk` are human attestations typed in a terminal.
 *   They are not authentication: an adapter must capture a real user action.
 * - `paths` is for a person opening files locally; it must never be called
 *   automatically from a hosted tool return.
 * - Failures print a stable code only — never the manifest path, a filesystem
 *   message, a stack trace or file content.
 */
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  RetrospectiveError,
  StoreError,
  createManifestEvidenceSource,
  deleteSession,
  loadLocalManifest,
  nodeKeySchema,
  prepareLocal,
  resolveArtifact,
  type ArtifactReceipt,
  type LocalManifest,
  type NodeKey,
  type ResolvedArtifact,
} from "./retrospective";

const EXIT_OK = 0;
const EXIT_REFUSED = 1;
const EXIT_USAGE = 2;

const MAX_ARGV = 24;
const MAX_ARG_CHARS = 4_096;
const SAFE_CODE = /^[A-Z][A-Z0-9_]{0,63}$/;

const DEFAULT_ROOT = path.join(os.homedir(), "ags", "diagnostics");

const USAGE = [
  "ags-retrospective — local session retrospective (no model calls, no outbound requests).",
  "",
  "Usage:",
  "  ags-retrospective prepare --manifest <local-manifest.json> --consent local-only --ack-storage-risk [--root <absolute>]",
  "  ags-retrospective status  --root <absolute> --artifact <opaque-id>",
  "  ags-retrospective paths   --root <absolute> --artifact <opaque-id>",
  "  ags-retrospective delete  --root <absolute> --session <id> --host <id> --confirm",
  "",
  "This tool is for a human at a terminal. Consent flags are attestations, not",
  "authentication: an agent must never supply them on your behalf. `paths` is",
  "human-facing and must not be invoked automatically from a hosted tool result;",
  "nothing opens automatically.",
  "",
  "Exit codes: 0 complete or explicitly partial publication, 1 failure or refusal,",
  "2 usage error.",
].join("\n");

type Command = "prepare" | "status" | "paths" | "delete";

const COMMANDS: readonly Command[] = ["prepare", "status", "paths", "delete"];

const OPTIONS = {
  manifest: { type: "string" },
  consent: { type: "string" },
  mode: { type: "string" },
  root: { type: "string" },
  "ack-storage-risk": { type: "boolean" },
  artifact: { type: "string" },
  session: { type: "string" },
  host: { type: "string" },
  confirm: { type: "boolean" },
  help: { type: "boolean", short: "h" },
} as const;

type ValueKey = keyof typeof OPTIONS;
type Values = { [K in ValueKey]?: string | boolean };

/** A flag is accepted only by the command that documents it. */
const ALLOWED: Record<Command, readonly ValueKey[]> = {
  prepare: ["manifest", "consent", "mode", "root", "ack-storage-risk", "help"],
  status: ["root", "artifact", "help"],
  paths: ["root", "artifact", "help"],
  delete: ["root", "session", "host", "confirm", "help"],
};

class UsageError extends Error {}

class Refusal extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "Refusal";
  }
}

type Invocation = { command: Command | null; values: Values };

export type CliOutcome = { code: number; stdout: string; stderr: string };

function parseInvocation(argv: readonly string[]): Invocation {
  if (argv.length > MAX_ARGV) throw new UsageError("Too many arguments.");
  for (const arg of argv) {
    if (arg.length > MAX_ARG_CHARS)
      throw new UsageError("An argument is too long.");
    if (arg.includes("\0")) throw new UsageError("An argument is not valid.");
  }
  let parsed: { values: unknown; positionals: string[] };
  try {
    parsed = parseArgs({
      args: [...argv],
      options: OPTIONS,
      allowPositionals: true,
      strict: true,
    });
  } catch {
    // The parser's own message may quote caller-supplied text, so it is dropped.
    throw new UsageError("Invalid arguments.");
  }
  const values = parsed.values as Values;
  if (values.help === true) return { command: null, values: {} };
  const [command, ...rest] = parsed.positionals;
  if (command === undefined) throw new UsageError("A command is required.");
  if (rest.length > 0) throw new UsageError("Unexpected extra arguments.");
  if (!COMMANDS.includes(command as Command))
    throw new UsageError("Unknown command.");
  const allowed = ALLOWED[command as Command];
  for (const key of Object.keys(values) as ValueKey[]) {
    if (key === "help") continue;
    if (!allowed.includes(key))
      throw new UsageError(`Option --${key} is not valid for ${command}.`);
  }
  return { command: command as Command, values };
}

function requiredString(
  values: Values,
  key: ValueKey,
  message: string,
): string {
  const value = values[key];
  if (typeof value !== "string" || value.length === 0)
    throw new UsageError(message);
  return value;
}

/**
 * `--root` defaults to the documented private location. A relative path is a
 * usage error; an unsafe existing root is a refusal from the store.
 */
function absoluteRoot(values: Values, required: boolean): string {
  const raw = values.root;
  if (raw === undefined) {
    if (required) throw new UsageError("--root <absolute> is required.");
    return DEFAULT_ROOT;
  }
  if (typeof raw !== "string" || raw.length === 0)
    throw new UsageError("--root requires a value.");
  if (!path.isAbsolute(raw))
    throw new UsageError("--root must be an absolute path.");
  return path.normalize(raw);
}

async function readManifest(manifestPath: string): Promise<LocalManifest> {
  try {
    return await loadLocalManifest(manifestPath);
  } catch {
    // Never surface the manifest path, the parser message or file content.
    throw new Refusal("MANIFEST_INVALID");
  }
}

async function runPrepare(values: Values): Promise<ArtifactReceipt> {
  const manifestPath = requiredString(
    values,
    "manifest",
    "--manifest <local-manifest.json> is required.",
  );
  const root = absoluteRoot(values, false);
  if (values.consent === undefined) throw new Refusal("CONSENT_REQUIRED");
  if (values.consent !== "local-only")
    throw new Refusal("CONSENT_MODE_REFUSED");
  const mode = values.mode;
  if (mode !== undefined && mode !== "local-only")
    throw new Refusal("MODE_UNAVAILABLE");
  if (values["ack-storage-risk"] !== true)
    throw new Refusal("STORAGE_RISK_NOT_ACKNOWLEDGED");

  const controller = new AbortController();
  const onSignal = (): void => controller.abort(new Error("ABORTED"));
  const signals: readonly NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  for (const signal of signals) process.once(signal, onSignal);
  try {
    const manifest = await readManifest(manifestPath);
    return await prepareLocal(
      {
        main: manifest.main,
        checkpointId: manifest.checkpointId,
        cutoff: manifest.cutoff,
        root,
        consent: "local-only",
        storageRiskAcknowledged: true,
      },
      createManifestEvidenceSource(manifest),
      controller.signal,
    );
  } catch (error) {
    if (controller.signal.aborted) throw new Refusal("ABORTED");
    throw error;
  } finally {
    for (const signal of signals) process.removeListener(signal, onSignal);
  }
}

async function runStatus(values: Values): Promise<{
  schemaVersion: 1;
  artifactId: string;
  kind: string;
  status: string;
}> {
  const root = absoluteRoot(values, true);
  const artifactId = requiredString(
    values,
    "artifact",
    "--artifact <opaque-id> is required.",
  );
  const resolved = await resolveArtifact(root, artifactId);
  return {
    schemaVersion: 1,
    artifactId: resolved.artifactId,
    kind: resolved.kind,
    status: resolved.status,
  };
}

/** Artifact IDs are `runId.kind`; the run prefix comes from the resolved kind. */
function runIdFor(resolved: ResolvedArtifact): string {
  const suffix = `.${resolved.kind}`;
  if (!resolved.artifactId.endsWith(suffix))
    throw new Refusal("INVALID_ARTIFACT_ID");
  const runId = resolved.artifactId.slice(0, -suffix.length);
  if (runId.length === 0) throw new Refusal("INVALID_ARTIFACT_ID");
  return runId;
}

async function resolveSibling(
  root: string,
  artifactId: string,
): Promise<ResolvedArtifact | null> {
  try {
    return await resolveArtifact(root, artifactId);
  } catch (error) {
    if (
      error instanceof StoreError &&
      (error.code === "ARTIFACT_NOT_FOUND" || error.code === "ARTIFACT_MISSING")
    )
      return null;
    throw error;
  }
}

async function runPaths(values: Values): Promise<{
  report: string;
  proposals: string | null;
  session: string | null;
}> {
  const root = absoluteRoot(values, true);
  const artifactId = requiredString(
    values,
    "artifact",
    "--artifact <opaque-id> is required.",
  );
  const base = await resolveArtifact(root, artifactId);
  const runId = runIdFor(base);
  const found: {
    report: string | null;
    proposals: string | null;
    session: string | null;
  } = {
    report: null,
    proposals: null,
    session: null,
  };
  for (const kind of ["report", "proposals", "session"] as const) {
    // Sibling IDs are derived from the resolved run, then each one is resolved
    // through the store again: a path never comes from a caller-supplied string.
    const sibling = await resolveSibling(root, `${runId}.${kind}`);
    if (sibling === null) continue;
    if (
      sibling.sessionToken !== base.sessionToken ||
      sibling.generationId !== base.generationId
    )
      continue;
    if (!path.isAbsolute(sibling.absolutePath))
      throw new Refusal("UNSAFE_PATH");
    found[kind] = sibling.absolutePath;
  }
  if (found.report === null) throw new Refusal("ARTIFACT_NOT_FOUND");
  const report = found.report;
  return { report, proposals: found.proposals, session: found.session };
}

function parseMain(hostId: string, sessionId: string): NodeKey {
  const parsed = nodeKeySchema.safeParse({ hostId, sessionId });
  if (!parsed.success) throw new Refusal("INVALID_NODE_KEY");
  return parsed.data;
}

async function runDelete(
  values: Values,
): Promise<{ schemaVersion: 1; deleted: boolean; removedArtifacts: number }> {
  const root = absoluteRoot(values, true);
  const sessionId = requiredString(
    values,
    "session",
    "--session <id> is required.",
  );
  const hostId = requiredString(values, "host", "--host <id> is required.");
  if (values.confirm !== true) throw new Refusal("CONFIRMATION_REQUIRED");
  const result = await deleteSession(root, parseMain(hostId, sessionId));
  return {
    schemaVersion: 1,
    deleted: result.deleted,
    removedArtifacts: result.removedArtifacts,
  };
}

async function dispatch(invocation: Invocation): Promise<unknown> {
  switch (invocation.command) {
    case "prepare":
      return runPrepare(invocation.values);
    case "status":
      return runStatus(invocation.values);
    case "paths":
      return runPaths(invocation.values);
    case "delete":
      return runDelete(invocation.values);
    default:
      throw new UsageError("A command is required.");
  }
}

function refusalCode(error: unknown): string {
  const code =
    error instanceof Refusal ||
    error instanceof StoreError ||
    error instanceof RetrospectiveError
      ? error.code
      : null;
  return code !== null && SAFE_CODE.test(code) ? code : "FAILED";
}

function usageOutcome(message?: string): CliOutcome {
  const prefix = message === undefined ? "" : `${message}\n\n`;
  return { code: EXIT_USAGE, stdout: "", stderr: `${prefix}${USAGE}\n` };
}

/**
 * Pure-ish entry: returns the intended streams and exit code instead of
 * writing them, so a parent process can assert exact output.
 */
export async function runRetrospectiveCli(
  argv: readonly string[] = process.argv.slice(2),
): Promise<CliOutcome> {
  let invocation: Invocation;
  try {
    invocation = parseInvocation(argv);
  } catch (error) {
    return usageOutcome(
      error instanceof UsageError ? error.message : "Invalid arguments.",
    );
  }
  if (invocation.command === null)
    return { code: EXIT_OK, stdout: `${USAGE}\n`, stderr: "" };
  try {
    const payload = await dispatch(invocation);
    return {
      code: EXIT_OK,
      stdout: `${JSON.stringify(payload)}\n`,
      stderr: "",
    };
  } catch (error) {
    if (error instanceof UsageError) return usageOutcome(error.message);
    return {
      code: EXIT_REFUSED,
      stdout: "",
      stderr: `${JSON.stringify({
        schemaVersion: 1,
        error: { code: refusalCode(error) },
      })}\n`,
    };
  }
}

async function main(): Promise<void> {
  const outcome = await runRetrospectiveCli();
  if (outcome.stdout !== "") process.stdout.write(outcome.stdout);
  if (outcome.stderr !== "") process.stderr.write(outcome.stderr);
  process.exitCode = outcome.code;
}

if (require.main === module) void main();
