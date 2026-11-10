/**
 * scripts/evals/l3/index.ts
 *
 * Standalone L3 Evaluator CLI for Skill System Effectiveness.
 * Authoritative contracts: docs/srs/srs-skill-system-effectiveness.md (Revision 4, SRS-001..006).
 *
 * Subcommands:
 *   - validate --manifest <path> [--allow-trusted-staging]:
 *       Validates manifest structure and filesystem integrity without runtime spawn.
 *       Fails closed if descriptor-anchored isolation is refused by D1, unless
 *       operator explicitly passes --allow-trusted-staging.
 *   - build --manifest <path> [--grant <path>] [options]:
 *       Validates manifest and checks independent host authority grant.
 *       Engages D2 RuntimeLifecycleAdapter preflight only; stages the build
 *       directory (runs/<run_id>/build/), records build-receipt.json
 *       (e.g. preflight_failed), and exits non-zero on failure. It never
 *       creates an attempt directory, so `build` then `run` cannot collide.
 *   - run --manifest <path> [--grant <path>] [options]:
 *       Validates manifest, checks independent host authority grant, stages an
 *       exclusive attempt directory (runs/<run_id>/<attempt_id>/), engages
 *       runtime adapter attempt lifecycle, records terminal receipt on failure,
 *       and exits non-zero.
 *
 * Exits non-zero without a valid subcommand. Never executes candidate code from validate.
 */

import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  validateManifestStructure,
  validateManifestFilesystem,
  type L3Manifest,
} from "./manifest.js";
import { computeSha256, EvidenceManager, type BuildState } from "./evidence.js";
import {
  RuntimeLifecycleAdapter,
  PreflightFailure,
  deriveAttemptId,
  buildFrozenSequence,
  type PreparedImages,
  type HostCapabilityVerifier,
  type PreparedImagesApprovalVerifier,
  type AttemptDescriptor,
} from "./runtime/index.js";
import { ownFieldSnapshot, assertNoExtraKeys, requireField, validateId } from "./contracts.js";

export interface CliOutput {
  readonly success: boolean;
  readonly command: string;
  readonly manifest_path?: string;
  readonly run_id?: string;
  readonly attempt_id?: string;
  readonly terminal_state?: string;
  readonly data?: Record<string, unknown>;
  readonly error?: string;
}

export function printUsage(stream: NodeJS.WriteStream = process.stderr): void {
  stream.write(
    `Usage: evals:l3 <subcommand> --manifest <path> [options]

Subcommands:
  validate   Strict frozen manifest validation without VM execution or candidate spawn.
  build      Run build preflight only; stages runs/<run_id>/build/build-receipt.json.
  run        Execute bounded case driver attempts and commit atomic receipts.

Options:
  --manifest <path>          Path to frozen L3 manifest.json (required)
  --grant <path>             Path to independent host authority grant file (required for build/run)
  --allow-trusted-staging    Explicitly allow trusted-staging-boundary when descriptor-anchored isolation is unavailable
  --runs-dir <path>          Directory for receipts (default: ./runs)
  --work-dir <path>          Working directory for runtime scratch (default: ./scratch)
  --runner-path <path>       Path to Apple VZ runner binary (default: /prepared/l3vz)
  --help, -h                 Show this help message
`
  );
}

export interface ParsedArgs {
  readonly subcommand: "validate" | "build" | "run" | "help" | null;
  readonly manifestPath: string | null;
  readonly grantPath: string | null;
  readonly allowTrustedStaging: boolean;
  readonly runsDir: string;
  readonly workDir: string;
  readonly runnerPath: string;
  readonly unknownFlags: readonly string[];
}

export function parseCliArgs(argv: readonly string[]): ParsedArgs {
  const args = [...argv];
  let subcommand: "validate" | "build" | "run" | "help" | null = null;
  let manifestPath: string | null = null;
  let grantPath: string | null = null;
  let allowTrustedStaging = false;
  let runsDir = "./runs";
  let workDir = "./scratch";
  let runnerPath = "/prepared/l3vz";
  const unknownFlags: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "validate" || arg === "build" || arg === "run") {
      if (!subcommand) {
        subcommand = arg;
      } else {
        unknownFlags.push(arg);
      }
    } else if (arg === "--help" || arg === "-h" || arg === "help") {
      subcommand = "help";
    } else if (arg === "--manifest") {
      if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        manifestPath = args[++i];
      } else {
        unknownFlags.push(arg);
      }
    } else if (arg === "--grant") {
      if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        grantPath = args[++i];
      } else {
        unknownFlags.push(arg);
      }
    } else if (arg === "--allow-trusted-staging") {
      allowTrustedStaging = true;
    } else if (arg === "--runs-dir") {
      if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        runsDir = args[++i];
      } else {
        unknownFlags.push(arg);
      }
    } else if (arg === "--work-dir") {
      if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        workDir = args[++i];
      } else {
        unknownFlags.push(arg);
      }
    } else if (arg === "--runner-path") {
      if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        runnerPath = args[++i];
      } else {
        unknownFlags.push(arg);
      }
    } else {
      unknownFlags.push(arg);
    }
  }

  return {
    subcommand,
    manifestPath,
    grantPath,
    allowTrustedStaging,
    runsDir,
    workDir,
    runnerPath,
    unknownFlags,
  };
}

/**
 * Loads raw manifest file securely, refusing symlinks and path traversal escapes.
 */
export async function loadManifestFile(manifestPath: string): Promise<{
  readonly manifest: L3Manifest;
  readonly rawText: string;
  readonly sha256: string;
  readonly resolvedPath: string;
}> {
  const resolved = path.resolve(manifestPath);

  // Check file stat: refuse symlinks
  const fileStat = await lstat(resolved);
  if (fileStat.isSymbolicLink()) {
    throw new Error(`Refusing symlink manifest: ${resolved}`);
  }
  if (!fileStat.isFile()) {
    throw new Error(`Manifest target is not a regular file: ${resolved}`);
  }

  const rawText = await readFile(resolved, "utf8");
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch (err: unknown) {
    throw new Error(`Malformed JSON in manifest file: ${(err as Error).message}`);
  }

  const manifest = validateManifestStructure(parsedJson);
  const sha256 = computeSha256(rawText);

  return { manifest, rawText, sha256, resolvedPath: resolved };
}

export interface IndependentHostGrant {
  readonly grant_id: string;
  readonly authority: string;
  readonly manifest_sha256: string;
  readonly run_id: string;
  readonly issued_at: string;
  readonly expires_at: string;
  readonly capability_token?: unknown;
  readonly images_approval_token?: unknown;
  readonly prepared_images?: PreparedImages;
}

const REQUIRED_GRANT_KEYS = [
  "grant_id",
  "authority",
  "manifest_sha256",
  "run_id",
  "issued_at",
  "expires_at",
] as const;

const ALL_GRANT_KEYS = [
  ...REQUIRED_GRANT_KEYS,
  "capability_token",
  "images_approval_token",
  "prepared_images",
] as const;

/**
 * Loads and validates independent host grant from outside the manifest (B2).
 * Fails closed if missing, expired, or mismatching manifest_sha256/run_id.
 */
export async function loadIndependentHostGrant(
  grantPath: string | null,
  manifest: L3Manifest,
  manifestSha256: string,
  nowMs: number = Date.now()
): Promise<IndependentHostGrant> {
  if (!grantPath) {
    throw new PreflightFailure(
      "Missing required independent host grant (--grant <path>). Self-granting from manifest fields is strictly forbidden."
    );
  }

  const resolved = path.resolve(grantPath);
  const fileStat = await lstat(resolved);
  if (fileStat.isSymbolicLink()) {
    throw new PreflightFailure(`Refusing symlink host grant file: ${resolved}`);
  }

  const content = await readFile(resolved, "utf8");
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch (err: unknown) {
    throw new PreflightFailure(`Malformed host grant JSON: ${(err as Error).message}`);
  }

  const snapshot = ownFieldSnapshot(raw, "host grant");
  assertNoExtraKeys(snapshot, ALL_GRANT_KEYS, "host grant");
  for (const key of REQUIRED_GRANT_KEYS) {
    requireField(snapshot, key, "host grant");
  }
  const grantId = validateId(snapshot.grant_id, "grant_id");
  const authority = String(snapshot.authority ?? "");
  const grantManifestSha = String(snapshot.manifest_sha256 ?? "");
  const grantRunId = validateId(snapshot.run_id, "run_id");
  const expiresAt = String(snapshot.expires_at ?? "");
  if (grantManifestSha.toLowerCase() !== manifestSha256.toLowerCase()) {
    throw new PreflightFailure(
      `Host grant manifest_sha256 mismatch: grant binds ${grantManifestSha}, manifest is ${manifestSha256}`
    );
  }
  if (grantRunId !== manifest.run_id) {
    throw new PreflightFailure(
      `Host grant run_id mismatch: grant binds ${grantRunId}, manifest is ${manifest.run_id}`
    );
  }

  const expiryMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiryMs)) {
    throw new PreflightFailure(`Malformed host grant expires_at timestamp: ${expiresAt}`);
  }
  if (nowMs >= expiryMs) {
    throw new PreflightFailure(
      `Independent host grant expired at ${expiresAt} (current: ${new Date(nowMs).toISOString()})`
    );
  }

  return {
    grant_id: grantId,
    authority,
    manifest_sha256: grantManifestSha,
    run_id: grantRunId,
    issued_at: String(snapshot.issued_at ?? ""),
    expires_at: expiresAt,
    capability_token: snapshot.capability_token,
    images_approval_token: snapshot.images_approval_token,
    prepared_images: snapshot.prepared_images as PreparedImages | undefined,
  };
}

/**
 * Programmatic dependencies injected for testing or host adaptation.
 */
export interface CliIoContext {
  readonly stdout: (msg: string) => void;
  readonly stderr: (msg: string) => void;
  readonly now?: () => number;
  readonly runtimeAdapterFactory?: (options: {
    manifest: L3Manifest;
    manifestSha256: string;
    workDir: string;
    runnerPath: string;
    clock: { nowMs: () => number };
    grant: IndependentHostGrant;
  }) => {
    preflight: (descriptor: AttemptDescriptor, token: unknown, approvalToken: unknown) => Promise<unknown>;
    close?: () => Promise<void>;
  };
}

/**
 * Minimal adapter surface the CLI drives.
 */
interface RuntimeAdapterLike {
  preflight: (descriptor: AttemptDescriptor, token: unknown, approvalToken: unknown) => Promise<unknown>;
  close?: () => Promise<void>;
}

function createRuntimeAdapter(
  io: CliIoContext,
  manifest: L3Manifest,
  manifestSha256: string,
  parsed: ParsedArgs,
  grant: IndependentHostGrant,
  nowMs: number
): RuntimeAdapterLike {
  if (io.runtimeAdapterFactory) {
    return io.runtimeAdapterFactory({
      manifest,
      manifestSha256,
      workDir: path.resolve(parsed.workDir),
      runnerPath: path.resolve(parsed.runnerPath),
      clock: { nowMs: () => nowMs },
      grant,
    });
  }
  // Real D2 RuntimeLifecycleAdapter
  return new RuntimeLifecycleAdapter({
    manifest,
    manifestSha256,
    workDir: path.resolve(parsed.workDir),
    runnerPath: path.resolve(parsed.runnerPath),
    statePath: path.join(path.resolve(parsed.workDir), "session.json"),
    images: grant.prepared_images as unknown as PreparedImages,
    io: {
      run: async () => {
        throw new PreflightFailure("D5 live hypervisor execution is not active");
      },
      openSerialCapture: async () => {
        throw new PreflightFailure("D5 live hypervisor execution is not active");
      },
    },
    verifier: {
      verify: () => ({ valid: false, reason: "Host capability token absent or not live-signed" }),
    },
    imagesApprovalVerifier: {
      verify: () => ({ valid: false, reason: "Prepared images approval token not live-signed" }),
    },
    clock: { nowMs: () => nowMs },
  });
}

/**
 * Main programmatic CLI dispatcher.
 */
export async function runCli(
  argv: readonly string[],
  io: CliIoContext = {
    stdout: (msg) => process.stdout.write(msg + "\n"),
    stderr: (msg) => process.stderr.write(msg + "\n"),
    now: () => Date.now(),
  }
): Promise<number> {
  const parsed = parseCliArgs(argv);

  if (parsed.subcommand === "help" || !parsed.subcommand) {
    printUsage();
    return 1;
  }

  if (parsed.unknownFlags.length > 0) {
    io.stderr(
      JSON.stringify({
        success: false,
        command: parsed.subcommand,
        error: `Unknown argument(s): ${parsed.unknownFlags.join(", ")}`,
      })
    );
    return 1;
  }

  if (!parsed.manifestPath) {
    io.stderr(
      JSON.stringify({
        success: false,
        command: parsed.subcommand,
        error: "Missing required argument: --manifest <path>",
      })
    );
    return 1;
  }

  const nowMs = io.now ? io.now() : Date.now();

  try {
    const { manifest, sha256, resolvedPath } = await loadManifestFile(parsed.manifestPath);
    const manifestDir = path.dirname(resolvedPath);

    // 1. Subcommand: validate
    if (parsed.subcommand === "validate") {
      let fsVerification;
      if (parsed.allowTrustedStaging) {
        fsVerification = validateManifestFilesystem(manifest, {
          stage_root: manifestDir,
          isolation: {
            kind: "trusted-staging-boundary",
            controller_assertion: "immutable-non-attacker-writable",
          },
        });
      } else {
        // Strict fail-closed: do not silently swallow probe failure
        fsVerification = validateManifestFilesystem(manifest, {
          stage_root: manifestDir,
          isolation: { kind: "descriptor-anchored" },
        });
      }

      const output: CliOutput = {
        success: true,
        command: "validate",
        manifest_path: resolvedPath,
        run_id: manifest.run_id,
        data: {
          protocol: manifest.protocol,
          schema_version: manifest.schema_version,
          manifest_sha256: sha256,
          cases: manifest.case_ids,
          verified_artifacts: fsVerification.verified_refs.length,
          filesystem_isolation: fsVerification.isolation_kind,
          allowed_trusted_staging: parsed.allowTrustedStaging,
        },
      };
      io.stdout(JSON.stringify(output, null, 2));
      return 0;
    }

    // 2. Subcommands: build & run
    const grant = await loadIndependentHostGrant(parsed.grantPath, manifest, sha256, nowMs);

    const evidenceManager = new EvidenceManager(parsed.runsDir);
    const sequence = buildFrozenSequence(manifest);
    const firstDescriptor: AttemptDescriptor = sequence[0] ?? {
      attempt_index: 0,
      case_id: "payment",
      arm_id: "A0",
      repetition: 0,
    };
    const startedAt = new Date(nowMs).toISOString();

    // 2a. Subcommand: build — build preflight only, staged under runs/<run_id>/build/
    if (parsed.subcommand === "build") {
      const buildDir = await evidenceManager.prepareBuildDirectory(manifest.run_id);
      try {
        const adapter = createRuntimeAdapter(io, manifest, sha256, parsed, grant, nowMs);
        // Drive preflight with tokens from independent host grant
        await adapter.preflight(firstDescriptor, grant.capability_token, grant.images_approval_token);
        await adapter.close?.();
      } catch (buildErr: unknown) {
        const failureReason = (buildErr as Error).message;
        const buildState: BuildState =
          buildErr instanceof PreflightFailure || /preflight/i.test(failureReason)
            ? "preflight_failed"
            : "infrastructure_error";

        // Commit the build receipt; no attempt directory or terminal receipt is created.
        await evidenceManager.publishBuildReceipt(manifest.run_id, {
          manifest_sha256: sha256,
          grant_id: grant.grant_id,
          state: buildState,
          started_at: startedAt,
          completed_at: new Date(nowMs).toISOString(),
          duration_ms: 0,
          reason: failureReason,
          failure_details: (buildErr as Error).stack ?? failureReason,
        });

        const output: CliOutput = {
          success: false,
          command: "build",
          manifest_path: resolvedPath,
          run_id: manifest.run_id,
          terminal_state: buildState,
          error: failureReason,
          data: {
            grant_id: grant.grant_id,
            build_directory: buildDir,
            attempt_index: firstDescriptor.attempt_index,
            case_id: firstDescriptor.case_id,
            arm_id: firstDescriptor.arm_id,
          },
        };

        io.stderr(JSON.stringify(output, null, 2));
        return 1;
      }

      await evidenceManager.publishBuildReceipt(manifest.run_id, {
        manifest_sha256: sha256,
        grant_id: grant.grant_id,
        state: "succeeded",
        started_at: startedAt,
        completed_at: new Date(nowMs).toISOString(),
        duration_ms: 0,
        reason: "Build preflight accepted.",
        failure_details: null,
      });

      const output: CliOutput = {
        success: true,
        command: "build",
        manifest_path: resolvedPath,
        run_id: manifest.run_id,
        data: {
          grant_id: grant.grant_id,
          build_directory: buildDir,
          attempt_index: firstDescriptor.attempt_index,
          case_id: firstDescriptor.case_id,
          arm_id: firstDescriptor.arm_id,
        },
      };

      io.stdout(JSON.stringify(output, null, 2));
      return 0;
    }

    // 2b. Subcommand: run — attempt staging under runs/<run_id>/<attempt_id>/
    const attemptId = deriveAttemptId(sha256, manifest.run_id, firstDescriptor.attempt_index);

    // Exclusive attempt staging and interrupted marker creation
    await evidenceManager.prepareAttemptDirectory({
      run_id: manifest.run_id,
      attempt_id: attemptId,
      case_id: firstDescriptor.case_id,
      arm_id: firstDescriptor.arm_id,
      repetition: firstDescriptor.repetition,
      attempt_index: firstDescriptor.attempt_index,
    });

    try {
      const adapter = createRuntimeAdapter(io, manifest, sha256, parsed, grant, nowMs);
      // Drive preflight with tokens from independent host grant
      await adapter.preflight(
        firstDescriptor,
        grant.capability_token,
        grant.images_approval_token
      );

      // If preflight somehow succeeded without D5, exit non-zero since D5 activation is required
      throw new Error("Live execution requires separate D5 activation");
    } catch (lifecycleErr: unknown) {
      const completedAt = new Date(nowMs).toISOString();
      const failureReason = (lifecycleErr as Error).message;
      const isPreflight = lifecycleErr instanceof PreflightFailure || /preflight/i.test(failureReason);
      const terminalState = isPreflight ? "preflight_failed" : "infrastructure_error";

      // Commit atomic terminal receipt recording failure details and input digests
      await evidenceManager.publishTerminalReceipt(manifest.run_id, attemptId, {
        case_id: firstDescriptor.case_id,
        arm_id: firstDescriptor.arm_id,
        repetition: firstDescriptor.repetition,
        attempt_index: firstDescriptor.attempt_index,
        protocol: "artifact-v1",
        terminal_state: terminalState,
        started_at: startedAt,
        completed_at: completedAt,
        duration_ms: 0,
        input_digests: {
          manifest_sha256: sha256,
          artifacts: [],
        },
        output_artifacts: [],
        verdict: null,
        reason: failureReason,
        failure_details: (lifecycleErr as Error).stack ?? failureReason,
      });

      const output: CliOutput = {
        success: false,
        command: "run",
        manifest_path: resolvedPath,
        run_id: manifest.run_id,
        attempt_id: attemptId,
        terminal_state: terminalState,
        error: failureReason,
        data: {
          grant_id: grant.grant_id,
          attempt_index: firstDescriptor.attempt_index,
          case_id: firstDescriptor.case_id,
          arm_id: firstDescriptor.arm_id,
        },
      };

      io.stderr(JSON.stringify(output, null, 2));
      return 1;
    }
  } catch (err: unknown) {
    const errorMsg = (err as Error).message;
    io.stderr(
      JSON.stringify({
        success: false,
        command: parsed.subcommand,
        error: errorMsg,
      })
    );
    return 1;
  }
}

// Direct execution entrypoint guard
const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  (process.argv[1].endsWith("scripts/evals/l3/index.ts") ||
    process.argv[1].endsWith("scripts/evals/l3/index.js"));

if (isDirectRun) {
  runCli(process.argv.slice(2)).then((exitCode) => {
    process.exit(exitCode);
  });
}
