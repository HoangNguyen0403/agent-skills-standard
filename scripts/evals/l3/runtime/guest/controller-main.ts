/**
 * scripts/evals/l3/runtime/guest/controller-main.ts
 *
 * Executable entrypoint of the autonomous controller guest.
 *
 * Init mounts the state device at `/state` and leaves the input bundle on the
 * read-only `/dev/vdc` device. This entrypoint reads that bundle exactly, verifies
 * the invocation binding (observed manifest digest, derived attempt id, frozen
 * descriptor and seed), materializes the quota-bounded offline build context and
 * candidate inputs, verifies the packaged driver tree, starts the candidate-side
 * stub relay and auxiliary channel, then runs the autonomous attempt. Any fatal
 * error produces a receipt and a clean guest shutdown.
 *
 * One injected clock and one D3 scheduler instance are shared by every stub,
 * observation, auxiliary receipt and case driver.
 */

import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { readBundleImage, type BundleEntry } from "../bundle.js";
import {
  ERROR_CODES,
  validateId,
  validateProviderPayload,
  validateProviderResult,
  validateSummarizerPayload,
  validateSummarizerResult,
  type ErrorCode,
} from "../../contracts.js";
import type { L3Manifest } from "../../manifest.js";
import { AuxiliaryChannel } from "./auxiliary.js";
import { ControllerApp, type CaseDrivers, type ProviderStubLike, type SummarizerStubLike } from "./controller.js";
import { readBundleDevice } from "./device-bundle.js";
import { verifyStagedInvocation } from "./invocation.js";
import {
  materializeBuildContext,
  materializeCandidateInputs,
  prepareBuildWorkspace,
  verifyDriverTree,
} from "./inputs.js";
import {
  DockerGuestRuntime,
  type CommandPort,
  type GuestLimits,
  type StreamResult,
} from "./runtime.js";
import { OBSERVER_REVIEW_DOMAIN } from "./queue-observer.js";
import { STAGE_CORRESPONDENCE_DOMAIN } from "./stage-reader.js";
import { loadCustodianKeys, programDigest, type ReviewTrustAnchor } from "./trust.js";
import {
  startStubServer,
  type StubOperationContracts,
  type StubOutcome,
  type StubRpcServer,
} from "./stubs-server.js";

const execFileAsync = promisify(execFile);
const STATE_DIR = "/state";
const INPUT_DEVICE = "/dev/vdc";
const BUILD_CONTEXT = "/state/build-context";
const BUILD_QUOTA_IMAGE = "/state/build-quota.img";
const DRIVER_TREE_DIR = "/opt/l3/drivers";
const DRIVER_MODULE = path.join(DRIVER_TREE_DIR, "cases", "index.js");
const AUX_HELPER = "/opt/l3/aux_peercred";
/** Immutable facts packaged into the read-only guest image, never the bundle. */
const BUILD_FACTS_PATH = "/opt/l3/build-facts.json";
const OBSERVER_TRUST_DIR = "/opt/l3/observer-trust";
const OBSERVER_PROGRAM = "/opt/l3/runtime/guest/queue-observer.js";
const STAGE_READER_PROGRAM = "/opt/l3/runtime/guest/stage-reader.js";
const COMBINED_OUTPUT_CAP = 4 * 1024 * 1024;

/**
 * One process command port with a **single combined** stdout/stderr byte cap, so
 * a noisy build cannot double its retained output by splitting streams.
 */
const nodeCommand: CommandPort = {
  stream: streamCommand,
  run(argv, options) {
    const started = Date.now();
    return new Promise((resolve) => {
      const child = spawn(argv[0], argv.slice(1), {
        stdio: ["ignore", "pipe", "pipe"],
        shell: false,
      });
      const cap = Math.min(options.maxStdoutBytes, COMBINED_OUTPUT_CAP);
      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];
      let kept = 0;
      let stdoutBytes = 0;
      let stderrBytes = 0;
      let truncated = false;
      let timedOut = false;
      let settled = false;
      const finish = (code: number | null): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const stdoutRaw = Buffer.concat(stdoutChunks);
        const stderrRaw = Buffer.concat(stderrChunks);
        resolve({
          code,
          timedOut,
          stdout: stdoutRaw.toString("utf8"),
          stderr: stderrRaw.toString("utf8"),
          stdoutBytes,
          stderrBytes,
          truncated,
          durationMs: Date.now() - started,
          stdoutRaw,
          stderrRaw,
        });
      };
      const capture = (stream: "stdout" | "stderr", chunk: Buffer): void => {
        if (stream === "stdout") stdoutBytes += chunk.length;
        else stderrBytes += chunk.length;
        const room = cap - kept;
        if (room > 0) {
          const slice = chunk.length <= room ? chunk : chunk.subarray(0, room);
          (stream === "stdout" ? stdoutChunks : stderrChunks).push(slice);
          kept += slice.length;
        }
        if (stdoutBytes + stderrBytes > cap && !truncated) {
          truncated = true;
          child.kill("SIGKILL");
        }
      };
      child.stdout?.on("data", (chunk: Buffer) => capture("stdout", chunk));
      child.stderr?.on("data", (chunk: Buffer) => capture("stderr", chunk));
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, options.timeoutMs);
      child.on("error", () => finish(1));
      child.on("close", (code) => finish(typeof code === "number" ? code : null));
    });
  },
};

/**
 * Combined live stream with one byte bound. The child is killed the moment the
 * bound would be exceeded, and the exact bytes seen up to that point are returned
 * so the caller can retain the permitted prefix and record the overflow.
 */
export function streamCommand(
  argv: readonly string[],
  options: { timeoutMs: number; maxBytes: number },
): Promise<StreamResult> {
  const started = Date.now();
  if (!Number.isSafeInteger(options.maxBytes) || options.maxBytes < 0) {
    throw new Error("stream maxBytes must be a non-negative safe integer");
  }
  return new Promise((resolve) => {
    const child = spawn(argv[0], argv.slice(1), { stdio: ["ignore", "pipe", "pipe"], shell: false });
    const raw = Buffer.allocUnsafe(options.maxBytes);
    const stderrMask = Buffer.alloc(Math.ceil(options.maxBytes / 8));
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let observedBytes = 0;
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let kept = 0;
    let truncated = false;
    let timedOut = false;
    let settled = false;
    const finish = (code: number | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        code,
        observedBytes,
        stdoutBytes,
        stderrBytes,
        timedOut,
        truncated,
        durationMs: Date.now() - started,
        raw: raw.subarray(0, kept),
        streamMask: stderrMask.subarray(0, Math.ceil(kept / 8)),
        stdoutRaw: Buffer.concat(stdoutChunks),
        stderrRaw: Buffer.concat(stderrChunks),
      });
    };
    const capture = (stream: "stdout" | "stderr", chunk: Buffer): void => {
      observedBytes += chunk.length;
      if (stream === "stdout") stdoutBytes += chunk.length;
      else stderrBytes += chunk.length;
      const count = Math.min(Math.max(0, options.maxBytes - kept), chunk.length);
      if (count > 0) {
        chunk.copy(raw, kept, 0, count);
        (stream === "stdout" ? stdoutChunks : stderrChunks).push(chunk.subarray(0, count));
        if (stream === "stderr") {
          for (let index = kept; index < kept + count; index += 1) {
            stderrMask[index >>> 3] |= 1 << (index & 7);
          }
        }
        kept += count;
      }
      if (observedBytes > options.maxBytes && !truncated) {
        truncated = true;
        child.kill("SIGKILL");
      }
    };
    child.stdout?.on("data", (chunk: Buffer) => capture("stdout", chunk));
    child.stderr?.on("data", (chunk: Buffer) => capture("stderr", chunk));
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, options.timeoutMs);
    child.on("error", () => finish(1));
    child.on("close", (code) => finish(typeof code === "number" ? code : null));
  });
}

interface SummarizerLedgerLike {
  readonly sequence: number;
  readonly entry_id?: unknown;
  readonly attempt_id?: unknown;
  readonly connection_id?: unknown;
  readonly message_ids?: unknown;
  readonly untrusted_message_count?: unknown;
  readonly arrival_ms?: unknown;
}

export interface SummarizerAttribution {
  readonly attempt_id: string;
  readonly process_session_id: string;
  readonly relay_seq: number;
  readonly relay_connection_id: string;
  readonly exchange_id: string;
  readonly entry_id: string;
  readonly connection_id: string;
  readonly message_ids: readonly string[];
  readonly untrusted_message_count: number;
  readonly arrival_ms: number;
}

/**
 * Validates the exact ledger append for one relayed summarize call and returns
 * its attribution. Untrusted calls retain no ids and only their count; trusted
 * calls must match the payload ids exactly.
 */
export function summarizerAttributionFor(input: {
  readonly entry: SummarizerLedgerLike | undefined;
  readonly ledgerLength: number;
  readonly expectedIndex: number;
  readonly attemptId: string;
  readonly expectedConnectionId: string;
  readonly expectedMessageIds: unknown;
  readonly processSessionId: string;
  readonly relaySeq: number;
  readonly relayConnectionId: string;
  readonly exchangeId: string;
}): SummarizerAttribution {
  const entry = input.entry;
  const expectedMessageIds = input.expectedMessageIds;
  const untrustedCount =
    typeof entry?.untrusted_message_count === "number" ? entry.untrusted_message_count : 0;
  const retained = Array.isArray(entry?.message_ids) ? entry.message_ids : null;
  const idsMatch =
    retained === null || !Array.isArray(expectedMessageIds)
      ? false
      : untrustedCount > 0
        ? retained.length === 0 && untrustedCount >= 1 && untrustedCount <= expectedMessageIds.length
        : retained.length === expectedMessageIds.length &&
          retained.every((id, index) => id === expectedMessageIds[index]);
  if (
    input.ledgerLength !== input.expectedIndex + 1 ||
    entry === undefined ||
    entry.sequence !== input.expectedIndex ||
    entry.entry_id === undefined ||
    typeof entry.entry_id !== "string" ||
    entry.attempt_id !== input.attemptId ||
    entry.connection_id !== input.expectedConnectionId ||
    !idsMatch ||
    typeof entry.arrival_ms !== "number"
  ) {
    throw new Error("SummarizerStub did not append exactly the current validated arrival");
  }
  return Object.freeze({
    attempt_id: entry.attempt_id as string,
    process_session_id: input.processSessionId,
    relay_seq: input.relaySeq,
    relay_connection_id: input.relayConnectionId,
    exchange_id: input.exchangeId,
    entry_id: entry.entry_id as string,
    connection_id: entry.connection_id as string,
    message_ids: Object.freeze([...(retained as unknown[])]) as readonly string[],
    untrusted_message_count: untrustedCount,
    arrival_ms: entry.arrival_ms as number,
  });
}

interface DriverModule {
  readonly PaymentCaseDriver?: CaseDrivers["PaymentCaseDriver"];
  readonly TenantCaseDriver?: CaseDrivers["TenantCaseDriver"];
  readonly OverloadCaseDriver?: CaseDrivers["OverloadCaseDriver"];
  readonly RealMonotonicScheduler?: new () => { readonly nowMs: () => number };
  readonly ProviderStub?: new (attemptId: string, options: Record<string, unknown>) => ProviderStubLike;
  readonly SummarizerStub?: new (attemptId: string, options: Record<string, unknown>) => SummarizerStubLike;
}

function asStubOutcome(value: unknown): StubOutcome {
  if (typeof value !== "object" || value === null || !("kind" in value)) {
    return { kind: "error", error: { code: "UNAVAILABLE", message: "stub returned an untyped outcome" } };
  }
  if (value.kind === "dropped") return { kind: "dropped" };
  if (value.kind === "error" && "error" in value && typeof value.error === "object" && value.error !== null) {
    const error = value.error;
    if (
      "code" in error &&
      "message" in error &&
      typeof error.code === "string" &&
      (ERROR_CODES as readonly string[]).includes(error.code) &&
      typeof error.message === "string"
    ) {
      return { kind: "error", error: { code: error.code as ErrorCode, message: error.message } };
    }
  }
  if (value.kind === "result" && "result" in value && typeof value.result === "object" && value.result !== null) {
    return { kind: "result", result: { ...value.result } };
  }
  return { kind: "error", error: { code: "UNAVAILABLE", message: "stub returned a malformed outcome" } };
}

/**
 * Reads the independently approved builder facts packaged into the guest image.
 * A missing or malformed bootstrap fails the build preflight; there is no
 * mutable tag and no default base image.
 */
async function readBuildFacts(entries: readonly BundleEntry[]): Promise<{ builder_image_digest: string }> {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(BUILD_FACTS_PATH, "utf8"));
  } catch {
    throw new Error("the packaged guest image has no approved build facts; the builder image is unapproved");
  }
  if (typeof raw !== "object" || raw === null) throw new Error("approved build facts are not an object");
  const record = raw as Record<string, unknown>;
  if (record["schema_version"] !== 1) throw new Error("approved build facts version must be 1");
  const digest = record["builder_image_digest"];
  if (typeof digest !== "string" || !/^sha256:[0-9a-f]{64}$/.test(digest)) {
    throw new Error("approved build facts carry no canonical builder image digest");
  }
  const depsDigest = record["offline_bundle_sha256"];
  if (typeof depsDigest !== "string" || !/^[0-9a-f]{64}$/.test(depsDigest)) {
    throw new Error("approved build facts carry no canonical offline dependency digest");
  }
  const deps = entries.find((entry) => entry.name === "deps.tar");
  if (deps === undefined) throw new Error("the input bundle has no frozen offline dependency archive");
  if (createHash("sha256").update(deps.data).digest("hex") !== depsDigest) {
    throw new Error("the frozen offline dependency archive does not match the approved digest");
  }
  return { builder_image_digest: digest };
}

function limitsFromManifest(manifest: L3Manifest, builderImageDigest: string): GuestLimits {
  const stage = manifest.runtime_policy.stage_limits;
  return {
    build: {
      cpu: stage.build.cpu,
      memory_mib: stage.build.memory_mib,
      max_processes: stage.build.max_processes,
      workspace_disk_mib: stage.build.workspace_disk_mib,
      wall_time_seconds: stage.build.wall_time_seconds,
      max_output_bytes: stage.build.max_output_bytes,
      builder_image_digest: builderImageDigest,
    },
    run: {
      cpu: stage.run.cpu,
      memory_mib: stage.run.memory_mib,
      max_processes: stage.run.max_processes,
      attempt_state_disk_mib: stage.run.attempt_state_disk_mib,
      wall_time_seconds: stage.run.wall_time_seconds,
      max_output_bytes: stage.run.max_output_bytes,
      max_frame_bytes: stage.run.max_frame_bytes,
    },
  };
}

async function writeFailureReceipt(stateDir: string, reason: string): Promise<void> {
  await mkdir(stateDir, { recursive: true, mode: 0o700 });
  const body = {
    schema_version: 1,
    reason: "controller_fatal_error",
    failure: reason,
    completed_at_ms: Date.now(),
  };
  await writeFile(path.join(stateDir, "receipt.json"), JSON.stringify(body, null, 2), { mode: 0o600 });
  await writeFile(path.join(stateDir, "output.log"), `controller fatal error: ${reason}\n`, { mode: 0o600 });
}

export async function controllerMain(): Promise<void> {
  try {
    await runController();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await writeFailureReceipt(STATE_DIR, reason);
    await powerOff();
    throw error;
  }
}

async function runController(): Promise<void> {
  const bundleBytes = await readBundleDevice(INPUT_DEVICE);
  const entries: readonly BundleEntry[] = readBundleImage(bundleBytes);
  const binding = verifyStagedInvocation(entries, Date.now());
  const attempt = binding.invocation;
  const buildFacts = await readBuildFacts(entries);
  const limits = limitsFromManifest(binding.manifest, buildFacts.builder_image_digest);
  const startsAt = Date.parse(binding.manifest.attempt_plan.starts_at);
  const endsAt = Date.parse(binding.manifest.attempt_plan.ends_at);
  if (Date.now() < startsAt || Date.now() >= endsAt) {
    throw new Error("the frozen attempt window is not open");
  }

  const treeDigest = await verifyDriverTree(entries, DRIVER_TREE_DIR);

  const moduleUrl = pathToFileURL(DRIVER_MODULE).href;
  // Genuine runtime selection: the driver tree is packaged into the approved
  // image at provisioning time and is not resolvable at source-compile time.
  const driverModule = (await import(moduleUrl)) as DriverModule;
  const Scheduler = driverModule.RealMonotonicScheduler;
  if (Scheduler === undefined) throw new Error("packaged driver tree has no RealMonotonicScheduler");
  const scheduler = new Scheduler();
  const nowMs = (): number => scheduler.nowMs();

  await prepareBuildWorkspace(nodeCommand, BUILD_QUOTA_IMAGE, BUILD_CONTEXT, limits.build.workspace_disk_mib);
  await materializeBuildContext(entries, BUILD_CONTEXT);
  await materializeCandidateInputs(entries, path.join(STATE_DIR, "input"));

  const runtime = new DockerGuestRuntime({
    command: nodeCommand,
    clock: { nowMs },
    stateDir: STATE_DIR,
    limits,
  });

  const drivers: CaseDrivers = {
    PaymentCaseDriver: driverModule.PaymentCaseDriver,
    TenantCaseDriver: driverModule.TenantCaseDriver,
    OverloadCaseDriver: driverModule.OverloadCaseDriver,
  };

  const attemptId = validateId(attempt.attempt_id, "attempt_id");
  const stateVolume = `vol-${attempt.attempt_index}`;
  const volume = await runtime.prepareStateVolume(stateVolume);

  let provider: ProviderStubLike | undefined;
  let summarizer: SummarizerStubLike | undefined;
  const summarizerAttribution: {
    readonly attempt_id: string;
    readonly process_session_id: string;
    readonly relay_seq: number;
    readonly relay_connection_id: string;
    readonly exchange_id: string;
    readonly entry_id: string;
    readonly connection_id: string;
    readonly message_ids: readonly string[];
    readonly untrusted_message_count: number;
    readonly arrival_ms: number;
  }[] = [];

  const relayServers: StubRpcServer[] = [];
  let relaysClosed = false;
  const closeRelays = async (): Promise<void> => {
    if (relaysClosed) return;
    relaysClosed = true;
    for (const server of relayServers) await server.close();
    if (auxChannel !== undefined) await auxChannel.close();
  };
  if (attempt.case_id === "payment") {
    if (driverModule.ProviderStub === undefined) throw new Error("packaged driver tree has no ProviderStub");
    provider = new driverModule.ProviderStub(attemptId, { clock: nowMs });
    const stub = provider;
    const providerContracts: StubOperationContracts = {
      debit: {
        validate_payload: (payload) => ({ ...validateProviderPayload("debit", payload) }),
        validate_result: (result) => ({ ...validateProviderResult("debit", result) }),
      },
      lookup: {
        validate_payload: (payload) => ({ ...validateProviderPayload("lookup", payload) }),
        validate_result: (result) => ({ ...validateProviderResult("lookup", result) }),
      },
      settlement: {
        validate_payload: (payload) => ({ ...validateProviderPayload("settlement", payload) }),
        validate_result: (result) => ({ ...validateProviderResult("settlement", result) }),
      },
    };
    relayServers.push(
      await startStubServer({
        socketPath: path.join(volume.aux_dir, "provider.sock"),
        sessionId: () => runtime.processSessionId(),
        relayId: "provider",
        contracts: providerContracts,
        handler: (operation, payload, effect) => {
          // The effect token is consumed synchronously with the stub call, so a
          // request cancelled by timeout can never commit a provider ledger entry.
          return effect.commit(() => {
            if (operation === "debit") return asStubOutcome(stub.handleDebit(payload));
            if (operation === "lookup") return asStubOutcome(stub.handleLookup(payload));
            if (operation === "settlement") return asStubOutcome(stub.handleSettlement(payload));
            return {
              kind: "error",
              error: { code: "INVALID_REQUEST", message: `unknown provider operation: ${operation}` },
            };
          });
        },
      }),
    );
  }
  if (attempt.case_id === "overload") {
    if (driverModule.SummarizerStub === undefined) throw new Error("packaged driver tree has no SummarizerStub");
    summarizer = new driverModule.SummarizerStub(attemptId, { nowMs, scheduler });
    const stub = summarizer;
    const summarizerContracts: StubOperationContracts = {
      summarize: {
        validate_payload: (payload) => ({ ...validateSummarizerPayload("summarize", payload) }),
        validate_result: (result) => ({ ...validateSummarizerResult("summarize", result) }),
      },
    };
    relayServers.push(
      await startStubServer({
        socketPath: path.join(volume.aux_dir, "summarizer.sock"),
        sessionId: () => runtime.processSessionId(),
        relayId: "summarizer",
        contracts: summarizerContracts,
        handler: async (operation, payload, effect) => {
          if (operation !== "summarize") {
            return {
              kind: "error",
              error: { code: "INVALID_REQUEST", message: `unknown summarizer operation: ${operation}` },
            };
          }
          // The trusted ledger records this call synchronously at arrival. The
          // relay signal cancels only the pending completion; it never refunds
          // arrival capacity or removes the arrival record.
          if (effect.session_id !== runtime.processSessionId()) {
            return {
              kind: "error",
              error: { code: "UNAVAILABLE", message: "summarizer request belongs to a stale process session" },
            };
          }
          const ledgerReader = (stub as { getLedger?: () => readonly Record<string, unknown>[] }).getLedger;
          if (typeof ledgerReader !== "function") {
            throw new Error("packaged SummarizerStub has no arrival ledger");
          }
          const ledgerBefore = ledgerReader.call(stub);
          const expectedIndex = ledgerBefore.length;
          const pending = stub.handleSummarize(payload, { signal: effect.signal });
          const ledgerAfter = ledgerReader.call(stub);
          if (ledgerAfter.length === expectedIndex) {
            // The stub legitimately refused before recording (capacity or
            // unset workload origin). Forward its own typed outcome; do not
            // invent an attribution for an arrival that was never recorded.
            return asStubOutcome(await pending);
          }
          const entry = ledgerAfter[expectedIndex];
          summarizerAttribution.push(
            Object.freeze(
              summarizerAttributionFor({
                entry: entry as unknown as SummarizerLedgerLike | undefined,
                ledgerLength: ledgerAfter.length,
                expectedIndex,
                attemptId,
                expectedConnectionId: payload.connection_id as string,
                expectedMessageIds: payload.message_ids,
                processSessionId: effect.session_id,
                relaySeq: effect.seq,
                relayConnectionId: effect.connection_id,
                exchangeId: effect.exchange_id,
              }),
            ),
          );
          return asStubOutcome(await pending);
        },
      }),
    );
  }

  let auxChannel: AuxiliaryChannel | undefined;
  if (attempt.case_id === "overload") {
    const channel = new AuxiliaryChannel({
      socketPath: path.join(volume.aux_dir, "aux.sock"),
      attempt_id: attemptId,
      processSessionId: () => runtime.processSessionId(),
      resolvePeer: () => runtime.containerIdentity(),
      peerHelperBinary: AUX_HELPER,
      nowMs,
    });
    await channel.listen();
    auxChannel = channel;
  }

  const workflowMs =
    attempt.phase === "build"
      ? limits.build.wall_time_seconds * 1000
      : limits.build.wall_time_seconds * 1000 + limits.run.wall_time_seconds * 1000;
  const deadlineAtMs = nowMs() + workflowMs;

  const custodianKeys = await loadCustodianKeys(OBSERVER_TRUST_DIR);
  const observerProgram = await programDigest(OBSERVER_PROGRAM);
  const stageReaderProgram = await programDigest(STAGE_READER_PROGRAM);
  const trustAnchor = (domain: string): ReviewTrustAnchor => ({
    domain,
    run_id: binding.invocation.run_id,
    attempt_id: attempt.attempt_id,
    custodian_keys: custodianKeys,
    now_epoch_ms: () => Date.now(),
  });

  const app = new ControllerApp({
    runtime,
    nowMs,
    observerTrust:
      observerProgram === null
        ? undefined
        : { anchor: trustAnchor(OBSERVER_REVIEW_DOMAIN), program_sha256: observerProgram },
    stageTrust:
      stageReaderProgram === null
        ? undefined
        : { anchor: trustAnchor(STAGE_CORRESPONDENCE_DOMAIN), program_sha256: stageReaderProgram },
    stateDir: STATE_DIR,
    deadlineAtMs,
    attempt,
    limits,
    bundle: entries,
    buildContext: {
      workspace_ref: BUILD_CONTEXT,
      offline_bundle_ref: path.join(BUILD_CONTEXT, "deps"),
    },
    drivers,
    scheduler,
    providerStub: provider,
    summarizerStub: summarizer,
    auxChannel,
    settleStubEffects: closeRelays,
    collectStubObservations: () => {
      const observations: unknown[] = [];
      for (const server of relayServers) {
        observations.push({ socket: server.socketPath, ...server.stats() });
      }
      if (provider !== undefined) {
        const ledger = (provider as { getLedger?: () => unknown }).getLedger;
        const entries = typeof ledger === "function" ? ledger.call(provider) : [];
        if (Array.isArray(entries)) {
          for (const entry of entries) observations.push({ stub: "provider", kind: "ledger_entry", entry });
        }
      }
      if (summarizer !== undefined) {
        const stub = summarizer as {
          getLedger?: () => readonly unknown[];
          getCancellations?: () => readonly unknown[];
        };
        for (const entry of stub.getLedger?.() ?? []) {
          observations.push({ stub: "summarizer", kind: "ledger_entry", entry });
        }
        for (const cancellation of stub.getCancellations?.() ?? []) {
          observations.push({ stub: "summarizer", kind: "cancellation", cancellation });
        }
        for (const attribution of summarizerAttribution) {
          observations.push({ stub: "summarizer", kind: "relay_attribution", attribution });
        }
      }
      return observations;
    },
    emitStatus: (phase) => {
      void appendFile("/dev/hvc0", `${JSON.stringify({ version: 1, event: "phase", phase })}\n`).catch(
        () => undefined,
      );
    },
  });

  try {
    await app.runAutonomous();
  } finally {
    await closeRelays().catch(() => undefined);
  }

  process.stderr.write(`controller tree digest: ${treeDigest}\n`);
}

async function powerOff(): Promise<void> {
  try {
    await execFileAsync("/sbin/poweroff", [], { timeout: 5_000 });
  } catch {
    // The host tears the VM down regardless.
  }
}

const fatal = (error: unknown): void => {
  const reason = error instanceof Error ? error.stack ?? error.message : String(error);
  void writeFailureReceipt(STATE_DIR, reason)
    .then(powerOff)
    .finally(() => process.exit(1));
};

process.on("uncaughtException", fatal);
process.on("unhandledRejection", fatal);

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void controllerMain().then(powerOff, fatal);
}
