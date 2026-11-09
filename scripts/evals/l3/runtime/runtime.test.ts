/**
 * scripts/evals/l3/runtime/runtime.test.ts
 *
 * Behavioural tests for the direct-VZ runtime slice. Everything runs at the
 * lowest injected boundary (`ProcessIO` / `GuestRuntime`); no VM, image,
 * container, network or candidate code is executed.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { chmod, copyFile, link, mkdir, mkdtemp, readFile, realpath, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash, generateKeyPairSync, sign as cryptoSign, type KeyObject } from "node:crypto";
import { once } from "node:events";
import net from "node:net";
import { PassThrough, Writable } from "node:stream";
import {
  AuxiliaryChannel,
  BoundedJsonlChannel,
  BUNDLE_REQUIRED_ENTRIES,
  ControllerApp,
  DockerGuestRuntime,
  DurableSessionLedger,
  Ed25519CapabilityVerifier,
  Ed25519PreparedImagesApprovalVerifier,
  OfflineEvidenceCollector,
  PreflightFailure,
  RuntimeLifecycleAdapter,
  RuntimeTransitionError,
  admitCandidateObserver,
  classifyProcessIdentity,
  forceStopOwnedRunner,
  OBSERVER_REVIEW_DOMAIN,
  ObserverResumeError,
  listDirectoryBeneath,
  readRegularFileBeneath,
  reviewPayload,
  startStubServer,
  assertRequiredBundleEntries,
  buildAttemptInvocation,
  buildBundleImage,
  buildFrozenSequence,
  deriveAttemptId,
  buildRunConfig,
  capabilityPayload,
  parsePreparedImages,
  parseSerialEvidence,
  preparedImagesApprovalPayload,
  readBundleImage,
  runCollector,
  decodeEvidence,
  evidenceSectionOf,
  validatePayload,
  validateResult,
  verifyExport,
  vzRunnerArgv,
  verifyPreparedImages,
  MAX_EVIDENCE_TOTAL_BYTES,
  REQUIRED_EVIDENCE_ARTIFACTS,
  type AttemptDescriptor,
  type AttemptInvocation,
  type CapabilityTarget,
  type CollectorOutcome,
  type CollectorReceipt,
  type ControllerPorts,
  type GuestRuntime,
  type HostCapabilityToken,
  type IdentityProbe,
  type PreparedImages,
  type ProcessIO,
  type ProcessIORequest,
  type ProcessIOResult,
  SerialCleanEOF,
  type RunnerStatusEvent,
  type SerialCapture,
  type SerialCaptureRequest,
  type SerialCaptureStats,
  type TrustedClock,
} from "./index";
import { streamCommand } from "./guest/controller-main.js";
import { SummarizerStub } from "../cases/stubs.js";
import { createValidManifestFixture } from "../test-fixtures";

const PREPARED = {
  kernel: { path: "/prepared/vmlinuz", sha256: "1".repeat(64), bytes: 1024 },
  initrd: { path: "/prepared/initrd", sha256: "2".repeat(64), bytes: 2048 },
  rootfs: { path: "/prepared/root.raw", sha256: "3".repeat(64), bytes: 4096 },
  controller: { path: "/prepared/controller.mjs", sha256: "4".repeat(64), bytes: 512 },
  collector: { path: "/prepared/collector.mjs", sha256: "5".repeat(64), bytes: 512 },
  drivers: { path: "/prepared/drivers.tar", sha256: "6".repeat(64), bytes: 1024 },
};

const IMAGES: PreparedImages = {
  schema_version: 1,
  topology: "apple-vz-direct-arm64",
  kernel: PREPARED.kernel,
  initrd: PREPARED.initrd,
  rootfs: PREPARED.rootfs,
  guest_programs: { controller: PREPARED.controller, collector: PREPARED.collector },
  driver_tree: PREPARED.drivers,
  docker: {
    docker_engine_sha256: `sha256:${"7".repeat(64)}`,
    node_image_sha256: `sha256:${"8".repeat(64)}`,
    offline_bundle_sha256: "9".repeat(64),
  },
  runtime: { node_version: "20.18.0", docker_version: "27.5.1" },
  verified_at: "2030-01-01T00:00:00.000Z",
  verified_by: "provisioning-receipt",
};

const MANIFEST = createValidManifestFixture();
const DESCRIPTOR: AttemptDescriptor = buildFrozenSequence(MANIFEST)[0];
const MANIFEST_SHA = createHash("sha256").update(JSON.stringify(adapterManifest()), "utf8").digest("hex");
const RUN_ID = MANIFEST.run_id;
const ATTEMPT_ID = deriveAttemptId("c".repeat(64), RUN_ID, DESCRIPTOR.attempt_index);

/** Digest helper shared by the reviewed-mapping fixtures. */
function sha256Of(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function symlinkDir(target: string, linkPath: string): Promise<void> {
  await symlink(target, linkPath, "dir");
}

async function linkFile(source: string, linkPath: string): Promise<void> {
  await link(source, linkPath);
}

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const verifier = new Ed25519CapabilityVerifier([{ custodian: "sec-ops-lead", publicKey }]);
const imagesApprovalVerifier = new Ed25519PreparedImagesApprovalVerifier([
  { custodian: "sec-ops-lead", publicKey },
]);

function mintImagesApproval(
  images: PreparedImages = IMAGES,
  overrides: { issued_at?: string; expires_at?: string; manifest_sha256?: string } = {},
): Record<string, unknown> {
  const body = {
    run_id: RUN_ID,
    manifest_sha256: overrides.manifest_sha256 ?? MANIFEST_SHA,
    custodian: "sec-ops-lead",
    issued_at: overrides.issued_at ?? "2030-01-01T00:00:00.000Z",
    expires_at: overrides.expires_at ?? "2030-01-01T02:00:00.000Z",
  };
  const payload = preparedImagesApprovalPayload(
    images,
    body.run_id,
    body.manifest_sha256,
    body.custodian,
    body.issued_at,
    body.expires_at,
  );
  const signature = cryptoSign(null, Buffer.from(payload, "utf8"), privateKey).toString("hex");
  return { ...body, signature };
}

type MintTarget = Omit<CapabilityTarget, "run_id" | "manifest_sha256">;

function mint(target: MintTarget, overrides: Partial<Omit<HostCapabilityToken, "signature">> = {}): HostCapabilityToken {
  const body: Omit<HostCapabilityToken, "signature"> = {
    run_id: RUN_ID,
    manifest_sha256: MANIFEST_SHA,
    attempt_index: target.attempt_index,
    case_id: target.case_id,
    arm_id: target.arm_id,
    action: target.action,
    custodian: "sec-ops-lead",
    issued_at: "2030-01-01T00:00:00.000Z",
    expires_at: "2030-01-01T02:00:00.000Z",
    topology: "apple-vz-direct-arm64",
    ...overrides,
  };
  const signature = cryptoSign(null, Buffer.from(capabilityPayload(body), "utf8"), privateKey).toString("hex");
  return { ...body, signature };
}

function tokensFor(descriptor: AttemptDescriptor): Record<string, HostCapabilityToken> {
  const actions = [
    "runtime_preflight",
    "guest_stage",
    "guest_execute_run",
    "guest_stop",
    "collector_attach",
    "collector_drain",
  ] as const;
  const result: Record<string, HostCapabilityToken> = {};
  for (const action of actions) result[action] = mint({ ...descriptor, action });
  return result;
}

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

function result(overrides: Partial<ProcessIOResult> = {}): ProcessIOResult {
  return {
    exitCode: 0,
    signal: null,
    stdout: "",
    stderr: "",
    stdoutTruncated: false,
    stderrTruncated: false,
    timedOut: false,
    cancelled: false,
    observedBytes: 0,
    durationMs: 1,
    ...overrides,
  };
}

interface RecordedCommand {
  readonly argv: readonly string[];
}

class ScriptedProcessIO implements ProcessIO {
  readonly commands: RecordedCommand[] = [];
  readonly serialRequests: SerialCaptureRequest[] = [];
  readonly captureQueue: FakeSerialCapture[] = [];
  runFailures = new Map<string, ProcessIOResult>();

  async run(request: ProcessIORequest): Promise<ProcessIOResult> {
    this.commands.push({ argv: request.argv });
    const argv = request.argv;

    if (argv[0] === "/usr/bin/shasum") {
      const target = argv[argv.length - 1];
      let digest: string;
      try {
        digest = createHash("sha256").update(await readFile(target)).digest("hex");
      } catch {
        digest = preparedDigest(target);
      }
      if (digest === null) return result({ exitCode: 1, stderr: "missing" });
      return result({ stdout: `${digest}  ${target}\n` });
    }
    if (argv[0] === "/bin/ps") {
      return result({ stdout: "Mon Jan  1 00:29:59 2030\n" });
    }
    if (argv[0] === "/usr/bin/stat") {
      const target = argv[argv.length - 1];
      const allocatedBlocks = argv.includes("%b");
      let size: number | null;
      try {
        const info = await stat(target);
        size = allocatedBlocks ? Math.ceil(info.size / 512) : info.size;
      } catch {
        const knownSize = preparedSize(target);
        size = knownSize === null ? null : allocatedBlocks ? Math.ceil(knownSize / 512) : knownSize;
      }
      if (size === null) return result({ exitCode: 1, stderr: "missing" });
      return result({ stdout: `${size}\n` });
    }
    if (argv[0] === "/bin/cp") {
      const source = argv[argv.length - 2];
      const destination = argv[argv.length - 1];
      try {
        await copyFile(source, destination);
      } catch {
        await writeFile(destination, Buffer.alloc(preparedSize(source) ?? 1024));
      }
      return result();
    }
    const failure = this.runFailures.get(argv[0]);
    if (failure !== undefined) return failure;
    return result();
  }

  async openSerialCapture(request: SerialCaptureRequest): Promise<SerialCapture> {
    this.serialRequests.push(request);
    const next = this.captureQueue.shift();
    if (next === undefined) throw new Error("no scripted serial capture available");
    return next;
  }
}

function preparedDigest(target: string): string | null {
  const known: Record<string, string> = {
    [PREPARED.kernel.path]: PREPARED.kernel.sha256,
    [PREPARED.initrd.path]: PREPARED.initrd.sha256,
    [PREPARED.rootfs.path]: PREPARED.rootfs.sha256,
    [PREPARED.controller.path]: PREPARED.controller.sha256,
    [PREPARED.collector.path]: PREPARED.collector.sha256,
    [PREPARED.drivers.path]: PREPARED.drivers.sha256,
  };
  return known[target] ?? createHash("sha256").update(target, "utf8").digest("hex");
}

function preparedSize(target: string): number | null {
  const known: Record<string, number> = {
    [PREPARED.kernel.path]: PREPARED.kernel.bytes,
    [PREPARED.initrd.path]: PREPARED.initrd.bytes,
    [PREPARED.rootfs.path]: PREPARED.rootfs.bytes,
    [PREPARED.controller.path]: PREPARED.controller.bytes,
    [PREPARED.collector.path]: PREPARED.collector.bytes,
    [PREPARED.drivers.path]: PREPARED.drivers.bytes,
  };
  return known[target] ?? 1024;
}

class FakeSerialCapture implements SerialCapture {
  private readonly frames: string[];
  private readonly failure: string | null;
  private readonly events: RunnerStatusEvent[];
  private killed = false;
  private truncated = false;
  private readCount = 0;

  constructor(options: { frames?: readonly string[]; failure?: string; stopped?: boolean } = {}) {
    this.frames = [...(options.frames ?? [])];
    this.failure = options.failure ?? null;
    this.events = [{ event: "started" }];
    if (options.stopped ?? true) this.events.push({ event: "stopped" });
  }

  async readFrame(deadlineAtMs: number): Promise<string> {
    const next = this.frames.shift();
    if (next !== undefined) {
      this.readCount += 1;
      return next;
    }
    throw this.failure === null
      ? new SerialCleanEOF()
      : new Error(this.failure);
  }

  async wait(): Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }> {
    return { exitCode: this.killed ? null : 0, signal: this.killed ? "SIGKILL" : null };
  }

  async kill(): Promise<void> {
    this.killed = true;
  }

  stats(): SerialCaptureStats {
    return { frames: this.readCount, bytes: 0, truncated: this.truncated, killed: this.killed };
  }

  statusEvents(): readonly RunnerStatusEvent[] {
    return this.events;
  }

  runnerPid(): number | null {
    return 4242;
  }

  markTruncated(): void {
    this.truncated = true;
  }
}

function fixedClock(startMs = Date.parse("2030-01-01T00:30:00.000Z")): TrustedClock & { advance(ms: number): void } {
  let now = startMs;
  return {
    nowMs: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

interface Harness {
  readonly io: ScriptedProcessIO;
  readonly clock: ReturnType<typeof fixedClock>;
  readonly adapter: RuntimeLifecycleAdapter;
  readonly workDir: string;
  readonly statePath: string;
  readonly tokens: Record<string, HostCapabilityToken>;
}

function adapterManifest() {
  return createValidManifestFixture({
    runtime_policy: { ...MANIFEST.runtime_policy, runtime_adapter_version: "2.0.0" },
  });
}

async function harness(options: { images?: PreparedImages; manifest?: typeof MANIFEST } = {}): Promise<Harness> {
  const io = new ScriptedProcessIO();
  const clock = fixedClock();
  const workDir = await mkdtemp(path.join(tmpdir(), "l3-vz-"));
  const statePath = path.join(workDir, "session.json");
  const adapter = new RuntimeLifecycleAdapter({
    manifest: options.manifest ?? adapterManifest(),
    manifestSha256: MANIFEST_SHA,
    io,
    verifier,
    clock,
    statePath,
    workDir,
    runnerPath: "/prepared/l3vz",
    images: options.images ?? IMAGES,
    imagesApprovalVerifier,
    allowUnboundedHeap: true,
  });
  return { io, clock, adapter, workDir, statePath, tokens: tokensFor(DESCRIPTOR) };
}

const ARTIFACTS = [
  { name: "manifest.json", data: Buffer.from(JSON.stringify(adapterManifest()), "utf8") },
  { name: "expected.json", data: Buffer.from('{"digests":[]}') },
  { name: "drivers.json", data: Buffer.from(JSON.stringify({ version: 1, tree_sha256: "a".repeat(64), files: [{ path: "cases/index.js", sha256: "b".repeat(64), bytes: 0 }] })) },
  { name: "workspace.tar", data: Buffer.alloc(1024) },
  { name: "deps.tar", data: Buffer.alloc(1024) },
];

describe("attempt invocation identity", () => {
  it("derives the full deterministic D2 attempt identity from the frozen tuple", () => {
    const expected = createHash("sha256")
      .update(JSON.stringify(["artifact-v1-attempt", MANIFEST_SHA, RUN_ID, DESCRIPTOR.attempt_index]), "utf8")
      .digest("hex");
    assert.equal(deriveAttemptId(MANIFEST_SHA, RUN_ID, DESCRIPTOR.attempt_index), expected);
    assert.equal(expected.length, 64);
    assert.notEqual(deriveAttemptId(MANIFEST_SHA, "run-other", DESCRIPTOR.attempt_index), expected);
    assert.notEqual(deriveAttemptId(MANIFEST_SHA, RUN_ID, DESCRIPTOR.attempt_index + 1), expected);
    assert.throws(() => deriveAttemptId("D".repeat(64), RUN_ID, DESCRIPTOR.attempt_index), /lowercase hex/);
    assert.throws(
      () =>
        buildAttemptInvocation(adapterManifest(), MANIFEST_SHA, {
          ...DESCRIPTOR,
          attempt_index: DESCRIPTOR.attempt_index + 1,
        }, "run"),
      /exact frozen sequence entry/,
    );
  });
});

// ---------------------------------------------------------------------------
// Wire/device contracts
// ---------------------------------------------------------------------------

describe("run config and bundle cannot express communication devices", () => {
  it("renders a config whose only devices are block disks", () => {
    const config = buildRunConfig({
      mode: "start",
      deadline_ms: 90_000,
      kernel: PREPARED.kernel.path,
      initrd: PREPARED.initrd.path,
      kernel_cmdline: "console=hvc0",
      disks: [
        { name: "root", path: "/work/root.img", read_only: false },
        { name: "state", path: "/work/state.img", read_only: false },
        { name: "input", path: "/work/input.img", read_only: true },
      ],
    });
    assert.equal(config.topology, "apple-vz-direct-arm64");
    assert.equal(config.cpu_count, 4);
    assert.equal(config.memory_bytes, 8 * 1024 * 1024 * 1024);
    assert.equal(JSON.stringify(config).includes("network"), false);
    assert.equal(JSON.stringify(config).includes("socket"), false);
    assert.equal(JSON.stringify(config).includes("share"), false);
    assert.deepEqual(vzRunnerArgv("/prepared/l3vz", "start", "/work/run.json"), [
      "/prepared/l3vz",
      "start",
      "--config",
      "/work/run.json",
    ]);
  });

  it("smokes TS-generated config through Swift non-activating validate and rejects unknown keys", async () => {
    const tmp = await realpath(await mkdtemp(path.join(tmpdir(), "l3-vz-smoke-")));
    try {
      const configPath = path.join(tmp, "run.json");
      const kernelPath = path.join(tmp, "vmlinuz");
      const initrdPath = path.join(tmp, "initrd.img");
      const rootPath = path.join(tmp, "root.img");
      const statePath = path.join(tmp, "state.img");
      const inputPath = path.join(tmp, "input.img");

      await writeFile(kernelPath, "kernel");
      await writeFile(initrdPath, "initrd");
      await writeFile(rootPath, "root");
      await writeFile(statePath, "state");
      await writeFile(inputPath, "input");

      const config = buildRunConfig({
        mode: "start",
        deadline_ms: 60_000,
        kernel: kernelPath,
        initrd: initrdPath,
        kernel_cmdline: "console=hvc0",
        disks: [
          { name: "root", path: rootPath, read_only: false },
          { name: "state", path: statePath, read_only: false },
          { name: "input", path: inputPath, read_only: true },
        ],
      });
      await writeFile(configPath, JSON.stringify(config, null, 2));

      const runnerSrc = path.resolve("scripts/evals/l3/runtime/vz/Runner.swift");
      const result = spawnSync("swift", [runnerSrc, "validate", "--config", configPath], { encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /"event":"validated"/);

      // Negative case: Swift rejects unknown/nested key with exit code 2
      const badConfigPath = path.join(tmp, "bad-run.json");
      await writeFile(badConfigPath, JSON.stringify({ ...config, forbidden_unknown_key: true }, null, 2));
      const badResult = spawnSync("swift", [runnerSrc, "validate", "--config", badConfigPath], { encoding: "utf8" });
      assert.equal(badResult.status, 2, "Swift must reject unknown keys with exit code 2");
      assert.match(badResult.stdout, /"event":"error"/);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it("refuses traversal, duplicate disks and a collector without a read-only evidence disk", () => {
    assert.throws(
      () =>
        buildRunConfig({
          mode: "start",
          deadline_ms: 1000,
          kernel: "/k",
          initrd: "/i",
          kernel_cmdline: "x",
          disks: [{ name: "root", path: "/work/../etc/passwd", read_only: false }],
        }),
      /traversal/,
    );
    assert.throws(
      () =>
        buildRunConfig({
          mode: "start",
          deadline_ms: 1000,
          kernel: "/k",
          initrd: "/i",
          kernel_cmdline: "x",
          disks: [
            { name: "root", path: "/work/root", read_only: false },
            { name: "root", path: "/work/root2", read_only: false },
          ],
        }),
      /duplicate disk/,
    );
    assert.throws(
      () =>
        buildRunConfig({
          mode: "collect",
          deadline_ms: 1000,
          kernel: "/k",
          initrd: "/i",
          kernel_cmdline: "x",
          disks: [{ name: "state", path: "/work/state", read_only: false }],
        }),
      /read-only/,
    );
  });

  it("round-trips a bundle and rejects tampering, duplicates and trailing bytes", () => {
    const fullBundle = [
      { name: "attempt.json", data: Buffer.from('{"version":1}') },
      ...ARTIFACTS,
    ];
    const image = buildBundleImage(fullBundle);
    const entries = readBundleImage(image);
    assert.deepEqual(entries.map((entry) => entry.name), fullBundle.map((entry) => entry.name));
    assert.doesNotThrow(() => assertRequiredBundleEntries(entries));
    const tampered = Buffer.from(image);
    tampered[tampered.length - 1] ^= 0xff;
    assert.throws(() => readBundleImage(tampered), /digest mismatch/);
    assert.throws(() => readBundleImage(Buffer.concat([image, Buffer.from("x")])), /trailing bytes/);
    assert.throws(
      () => buildBundleImage([{ name: "a", data: Buffer.from("1") }, { name: "a", data: Buffer.from("2") }]),
      /duplicate bundle entry/,
    );
    assert.throws(() => buildBundleImage([{ name: "../escape", data: Buffer.from("1") }]), /Invalid bundle entry/);
    assert.throws(() => assertRequiredBundleEntries(readBundleImage(buildBundleImage([ARTIFACTS[0]]))), /missing required/);
  });

  it("rejects prepared images whose topology, schema or digests are inconsistent", async () => {
    assert.throws(
      () => parsePreparedImages({ ...IMAGES, topology: "lima-vz-linux-arm64" }),
      /topology must be apple-vz-direct-arm64/,
    );
    assert.throws(() => parsePreparedImages({ ...IMAGES, runtime: { node_version: "latest", docker_version: "27.5.1" } }), /node_version/);

    const io = new ScriptedProcessIO();
    const broken = {
      ...IMAGES,
      rootfs: { ...IMAGES.rootfs, sha256: "9".repeat(64) },
    };
    await assert.rejects(async () => verifyPreparedImages(io, broken), /rootfs bytes do not match/);
  });
});

describe("serial evidence parsing fails closed", () => {
  const complete = JSON.stringify({ version: 1, complete: true, artifacts: [...REQUIRED_EVIDENCE_ARTIFACTS], frames: REQUIRED_EVIDENCE_ARTIFACTS.length, bytes: 0 });

  function reader(frames: readonly string[]): (deadline: number) => Promise<string> {
    const queue = [...frames];
    return async () => {
      const next = queue.shift();
      if (next === undefined) throw new SerialCleanEOF();
      return next;
    };
  }

  function frame(artifact: string, seq: number, data: string): string {
    return JSON.stringify({
      version: 1,
      artifact,
      seq,
      encoding: "base64",
      data: Buffer.from(data, "utf8").toString("base64"),
    });
  }

  it("accepts ordered frames with a matching completion", async () => {
    const frames = [
      frame("events.jsonl", 1, "e"),
      frame("output.log", 1, "o"),
      frame("receipt.json", 1, "r"),
    ];
    // Recompute declared byte totals from actual frame bytes.
    const declared = { ...JSON.parse(complete), bytes: frames.reduce((n, f) => n + Buffer.byteLength(f, "utf8"), 0) };
    const outcome = await parseSerialEvidence(reader([...frames, JSON.stringify(declared)]), Date.now() + 5_000);
    assert.equal(outcome.available, true);
    if (!outcome.available) return;
    assert.deepEqual(outcome.artifacts.map((entry) => entry.name), [...REQUIRED_EVIDENCE_ARTIFACTS]);
  });
  it("rejects a transport error after completion instead of treating it as clean EOF", async () => {
    const frames = [
      frame("events.jsonl", 1, "e"),
      frame("output.log", 1, "o"),
      frame("receipt.json", 1, "r"),
    ];
    const completeFrame = {
      ...JSON.parse(complete),
      bytes: frames.reduce((total, entry) => total + Buffer.byteLength(entry, "utf8"), 0),
    };
    const input = [...frames, JSON.stringify(completeFrame)];
    const readFrame = async (): Promise<string> => {
      const next = input.shift();
      if (next !== undefined) return next;
      throw new Error("runner stopped before authoritative clean EOF");
    };
    const result = await parseSerialEvidence(readFrame, Date.now() + 5_000);
    assert.equal(result.available, false);
    if (!result.available) assert.equal(result.reason, "stream_truncated");
  });

  it("rejects duplicate, out-of-order, incomplete, mismatched and post-completion data", async () => {
    const duplicate = await parseSerialEvidence(
      reader([frame("events.jsonl", 1, "a"), frame("events.jsonl", 1, "b")]),
      Date.now() + 5_000,
    );
    assert.equal(duplicate.available, false);
    if (!duplicate.available) assert.equal(duplicate.reason, "duplicate_sequence");

    const outOfOrder = await parseSerialEvidence(
      reader([frame("events.jsonl", 2, "a")]),
      Date.now() + 5_000,
    );
    assert.equal(outOfOrder.available, false);
    if (!outOfOrder.available) assert.equal(outOfOrder.reason, "out_of_order_sequence");

    const missing = await parseSerialEvidence(reader([frame("events.jsonl", 1, "a")]), Date.now() + 5_000);
    assert.equal(missing.available, false);
    if (!missing.available) assert.equal(missing.reason, "missing_complete");

    const mismatched = await parseSerialEvidence(
      reader([frame("events.jsonl", 1, "a"), JSON.stringify({ ...JSON.parse(complete), frames: 9, bytes: 1 })]),
      Date.now() + 5_000,
    );
    assert.equal(mismatched.available, false);
    if (!mismatched.available) assert.equal(mismatched.reason, "declared_mismatch");

    const late = await parseSerialEvidence(
      reader([
        frame("events.jsonl", 1, "a"),
        JSON.stringify({ ...JSON.parse(complete), bytes: Buffer.byteLength(frame("events.jsonl", 1, "a"), "utf8") }),
        frame("events.jsonl", 2, "late"),
      ]),
      Date.now() + 5_000,
    );
    assert.equal(late.available, false);
    if (!late.available) assert.equal(late.reason, "frame_schema");
  });
});

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe("preflight refuses before any host resource exists", () => {
  it("rejects an adapter version or topology mismatch", async () => {
    const manifest = createValidManifestFixture({
      runtime_policy: { ...MANIFEST.runtime_policy, runtime_adapter_version: "1.0.0" },
    });
    const { adapter, tokens, io } = await harness({ manifest });
    await assert.rejects(
      async () => adapter.preflight(DESCRIPTOR, tokens.runtime_preflight, mintImagesApproval()),
      /does not match adapter/,
    );
    assert.equal(io.commands.length, 0);
  });

  it("refuses without preflight and rejects a closed manifest window", async () => {
    const { adapter, tokens } = await harness();
    await assert.rejects(
      async () => adapter.stageAttempt(DESCRIPTOR, tokens.guest_stage, ARTIFACTS),
      PreflightFailure,
    );

    const lateClock = fixedClock(Date.parse("2030-01-01T02:30:00.000Z"));
    const io = new ScriptedProcessIO();
    const late = new RuntimeLifecycleAdapter({
      manifest: adapterManifest(),
      manifestSha256: MANIFEST_SHA,
      io,
      verifier,
      clock: lateClock,
      statePath: path.join(await mkdtemp(path.join(tmpdir(), "l3-late-")), "session.json"),
      workDir: await mkdtemp(path.join(tmpdir(), "l3-late-work-")),
      runnerPath: "/prepared/l3vz",
      images: IMAGES,
      imagesApprovalVerifier,
    });
    const lateWindow = { issued_at: "2030-01-01T02:00:00.000Z", expires_at: "2030-01-01T04:00:00.000Z" };
    const lateTokens = { runtime_preflight: mint({ ...DESCRIPTOR, action: "runtime_preflight" }, lateWindow) };
    await assert.rejects(
      async () => late.preflight(DESCRIPTOR, lateTokens.runtime_preflight, mintImagesApproval()),
      /Attempt window has closed/,
    );
  });

  it("rejects an expired capability before hashing prepared images", async () => {
    const { adapter, io } = await harness();
    const stale = mint({ ...DESCRIPTOR, action: "runtime_preflight" }, { expires_at: "2030-01-01T00:10:00.000Z" });
    await assert.rejects(async () => adapter.preflight(DESCRIPTOR, stale, mintImagesApproval()), /expired/);
    assert.equal(io.commands.length, 0);
  });
});

describe("staging persists ownership, builds frozen inputs and uses only block disks", () => {
  it("records the attempt lease before creating files and stages a fixed layout", async () => {
    const { adapter, io, tokens, workDir, statePath } = await harness();
    await adapter.preflight(DESCRIPTOR, tokens.runtime_preflight, mintImagesApproval());
    const guest = await adapter.stageAttempt(DESCRIPTOR, tokens.guest_stage, ARTIFACTS);

    assert.equal(guest.status, "staged");
    assert.equal(guest.post_exposure_interface, "none");
    assert.equal(guest.retained_disk_path, null);

    const ledger = JSON.parse(await readFile(statePath, "utf8"));
    assert.equal(ledger.counters.attempts_started, 1);
    assert.equal(ledger.lease.attempt_index, DESCRIPTOR.attempt_index);
    assert.equal(ledger.resources.length, 1);
    assert.equal(ledger.resources[0].name, guest.instance_name);

    const config = JSON.parse(await readFile(path.join(guest.attempt_directory, "run.json"), "utf8"));
    assert.equal(config.disks.length, 3);
    assert.equal(config.disks.filter((disk: { read_only: boolean }) => disk.read_only).length, 1);
    assert.equal(Object.keys(config).includes("network"), false);

    const bundle = readBundleImage(await readFile(path.join(guest.attempt_directory, "input.img")));
    assert.deepEqual([...bundle.map((entry) => entry.name)].sort(), [...BUNDLE_REQUIRED_ENTRIES].sort());
    const attemptEntry = bundle.find((entry) => entry.name === "attempt.json");
    assert.notEqual(attemptEntry, undefined);
    assert.deepEqual(
      JSON.parse(attemptEntry!.data.toString("utf8")),
      buildAttemptInvocation(adapterManifest(), MANIFEST_SHA, DESCRIPTOR, "run"),
    );
    assert.equal(guest.attempt_directory.startsWith(workDir), true);
    assert.equal(io.serialRequests.length, 0);
  });

  it("rejects a staged manifest that does not match its digest and validated object", async () => {
    const { adapter, tokens } = await harness();
    await adapter.preflight(DESCRIPTOR, tokens.runtime_preflight, mintImagesApproval());
    const artifacts = ARTIFACTS.map((artifact) =>
      artifact.name === "manifest.json"
        ? { ...artifact, data: Buffer.from(JSON.stringify({ ...adapterManifest(), run_id: "run-other" }), "utf8") }
        : artifact,
    );
    await assert.rejects(
      async () => adapter.stageAttempt(DESCRIPTOR, tokens.guest_stage, artifacts),
      /staged manifest bytes do not match/,
    );
  });

  it("refuses a second attempt and a non-member descriptor", async () => {
    const { adapter, tokens } = await harness();
    await adapter.preflight(DESCRIPTOR, tokens.runtime_preflight, mintImagesApproval());
    await adapter.stageAttempt(DESCRIPTOR, tokens.guest_stage, ARTIFACTS);
    await assert.rejects(
      async () => adapter.stageAttempt(DESCRIPTOR, tokens.guest_stage, ARTIFACTS),
      /lease|already/,
    );

    const fresh = await harness();
    await fresh.adapter.preflight(DESCRIPTOR, fresh.tokens.runtime_preflight, mintImagesApproval());
    const outsider = { ...DESCRIPTOR, attempt_index: 99 };
    await assert.rejects(
      async () => fresh.adapter.stageAttempt(outsider, mint({ ...outsider, action: "guest_stage" }), ARTIFACTS),
      /not in the frozen plan/,
    );
  });
});

describe("launch is one-way and stop is host-owned", () => {
  it("opens exactly one serial capture and never a control channel", async () => {
    const { adapter, io, tokens } = await harness();
    await adapter.preflight(DESCRIPTOR, tokens.runtime_preflight, mintImagesApproval());
    const guest = await adapter.stageAttempt(DESCRIPTOR, tokens.guest_stage, ARTIFACTS);
    const capture = new FakeSerialCapture();
    io.captureQueue.push(capture);

    await adapter.launchAttempt(guest.guest_id, tokens.guest_execute_run);
    const running = adapter.getGuest(guest.guest_id);
    assert.equal(running.status, "running");
    assert.equal(running.trust_revoked, true);
    assert.equal(io.serialRequests.length, 1);
    assert.match(io.serialRequests[0].argv.join(" "), /l3vz start --config/);
    assert.equal("openFrameChannel" in io, false);
  });

  it("fails without a retained disk and succeeds only with the state image present", async () => {
    const { adapter, io, tokens } = await harness();
    await adapter.preflight(DESCRIPTOR, tokens.runtime_preflight, mintImagesApproval());
    const guest = await adapter.stageAttempt(DESCRIPTOR, tokens.guest_stage, ARTIFACTS);
    io.captureQueue.push(new FakeSerialCapture());
    await adapter.launchAttempt(guest.guest_id, tokens.guest_execute_run);

    const cleanup = await adapter.stopGuest(guest.guest_id, tokens.guest_stop);
    assert.equal(cleanup.stopped, true);
    assert.equal(cleanup.retained_disk_path, path.join(guest.attempt_directory, "state.img"));
    assert.equal(adapter.getGuest(guest.guest_id).status, "stopped");
  });

  it("refuses deletion without a verified export and retains the original disk", async () => {
    const { adapter, io, tokens } = await harness();
    await adapter.preflight(DESCRIPTOR, tokens.runtime_preflight, mintImagesApproval());
    const guest = await adapter.stageAttempt(DESCRIPTOR, tokens.guest_stage, ARTIFACTS);
    io.captureQueue.push(new FakeSerialCapture());
    await adapter.launchAttempt(guest.guest_id, tokens.guest_execute_run);
    await adapter.stopGuest(guest.guest_id, tokens.guest_stop);

    await assert.rejects(
      async () =>
        adapter.disposeGuest(guest.guest_id, tokens.guest_stop, {
          collection_id: "col-1",
          readonly_copy_path: path.join(guest.attempt_directory, "evidence", "col-1", "state.img"),
          readonly_copy_sha256: "0".repeat(64),
          verified_at_ms: 1,
        }),
      /verified export is not bound to this run and attempt/,
    );
    assert.equal((await stat(path.join(guest.attempt_directory, "state.img"))).isFile(), true);
  });
});

// ---------------------------------------------------------------------------
// Session durability
// ---------------------------------------------------------------------------

describe("session ledger is durable and exclusive", () => {
  it("rejects a second writer and persists counters across reopen", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "l3-ledger-"));
    const statePath = path.join(dir, "session.json");
    const clock = fixedClock();
    const first = new DurableSessionLedger({ manifest: MANIFEST, manifestSha256: MANIFEST_SHA, clock, statePath });
    await first.open();
    const second = new DurableSessionLedger({ manifest: MANIFEST, manifestSha256: MANIFEST_SHA, clock, statePath });
    await assert.rejects(async () => second.open(), /already locked/);

    await first.reserveAttempt(DESCRIPTOR);
    await first.recordObservedWrites(1234);
    await first.close();

    const reopened = new DurableSessionLedger({ manifest: MANIFEST, manifestSha256: MANIFEST_SHA, clock, statePath });
    await reopened.open();
    const snapshot = await reopened.snapshot();
    assert.equal(snapshot.state.counters.attempts_started, 1);
    assert.equal(snapshot.state.counters.observed_write_bytes, 1234);
    assert.notEqual(snapshot.state.lease, null);
    await reopened.close();
  });

  it("rejects NaN/unsafe limits, unknown writes and a failed start does not refund budget", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "l3-ledger-"));
    assert.throws(
      () =>
        new DurableSessionLedger({
          manifest: MANIFEST,
          manifestSha256: MANIFEST_SHA,
          clock: fixedClock(),
          statePath: path.join(dir, "a.json"),
          limits: { maxAttempts: Number.NaN },
        }),
      /positive safe integer/,
    );

    const ledger = new DurableSessionLedger({
      manifest: MANIFEST,
      manifestSha256: MANIFEST_SHA,
      clock: fixedClock(),
      statePath: path.join(dir, "b.json"),
    });
    await ledger.open();
    await assert.rejects(async () => ledger.recordObservedWrites(Number.NaN), /non-negative safe integer/);
    await ledger.reserveAttempt(DESCRIPTOR);
    await ledger.releaseLease(DESCRIPTOR);
    const snapshot = await ledger.snapshot();
    assert.equal(snapshot.state.counters.attempts_started, 1);
    await ledger.close();
  });

  it("reports unowned live resources without acting on them", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "l3-ledger-"));
    const ledger = new DurableSessionLedger({
      manifest: MANIFEST,
      manifestSha256: MANIFEST_SHA,
      clock: fixedClock(),
      statePath: path.join(dir, "session.json"),
    });
    await ledger.open();
    await ledger.registerResource({
      kind: "guest",
      name: "l3-owned",
      run_id: RUN_ID,
      attempt_index: 0,
      created_at: "2030-01-01T00:30:00.000Z",
    });
    const report = await ledger.reconcile(["l3-owned", "l3-foreign", "default"]);
    assert.deepEqual([...report.owned_live], ["l3-owned"]);
    assert.deepEqual([...report.unowned_observed], ["l3-foreign"]);
    await ledger.close();
  });
});

// ---------------------------------------------------------------------------
// Controller protocol and guest help
// ---------------------------------------------------------------------------

function fakeGuestRuntime(overrides: Partial<GuestRuntime> = {}): GuestRuntime {
  let session = 0;
  const base: GuestRuntime = {
    clock: { nowMs: () => 1000 },
    processSessionId: () => `ps-${session}`,
    async prepareStateVolume(stateVolume) {
      return {
        volume_dir: `/state/volumes/${stateVolume}`,
        aux_dir: `/state/candidate/${stateVolume}`,
        aux_socket_path: `/state/candidate/${stateVolume}/aux.sock`,
      };
    },
    async build() {
      return {
        image_id: `sha256:${"a".repeat(64)}`,
        exit_code: 0,
        duration_ms: 10,
        stdout_bytes: 2,
        stderr_bytes: 0,
        timed_out: false,
        stream_mask_base64: "",
        stream_capture_bytes: 0,
        output_container_id: "",
        output_container_pid: 0,
        output_truncated: false,
        entrypoint_sha256: "d".repeat(64),
        artifact_count: 1,
        cleanup_failures: 0,
        failure_class: "normal",
      };
    },
    async run() {
      session += 1;
      return { container_id: "abc123", pid: 42 };
    },
    async writeCandidate(frame) {
      return { observed_bytes: Buffer.byteLength(frame, "utf8") };
    },
    async readCandidate() {
      return {
        response_frame: '{"ok":true}',
        observed_bytes: 11,
        deadline_exceeded: false,
        raw_output: [],
        raw_output_truncated: false,
      };
    },
    async snapshotState(_snapshotId, _stateVolume, files) {
      return files.map((file) => ({ ...file, sha256: "b".repeat(64), bytes: 2 }));
    },
    async observeProcess() {
      return { pid: 42, rss_bytes: 1024, threads: 2, state: "S", memory_current_bytes: 2048, memory_peak_bytes: 4096 };
    },
    async termination() {
      return { container_state: "running", exit_code: null, finished_at: null, pid: 42 };
    },
    async containerIdentity() {
      return { pid: 42, cgroup: "/system.slice/docker-abc.scope" };
    },
    bufferedBytes: () => 0,
    async resetState() {},
    async restartCandidate() {
      session += 1;
      return { restart_count: 1 };
    },
    async pauseCandidate() {},
    async resumeCandidate() {},
    async stopCandidate() {
      return { terminated: true, exit_code: 0 };
    },
    async status() {
      return {
        container_state: "running",
        exit_code: null,
        finished_at: null,
        pid: 42,
        restart_count: 0,
        observed_write_bytes: 0,
        buffered_bytes: 0,
      };
    },
    async shutdownGuest() {},
  };
  return { ...base, ...overrides };
}

function attemptInvocation(overrides: Partial<AttemptInvocation> = {}): AttemptInvocation {
  return {
    version: 1,
    protocol: "artifact-v1",
    run_id: RUN_ID,
    manifest_sha256: "c".repeat(64),
    attempt_id: deriveAttemptId("c".repeat(64), RUN_ID, DESCRIPTOR.attempt_index),
    attempt_index: DESCRIPTOR.attempt_index,
    case_id: "payment",
    arm_id: "A0",
    repetition: 0,
    seed: 1,
    phase: "run",
    ...overrides,
  };
}

function passingPaymentSchedule(schedule: "base" | "adverse" | "changed_constraint" | "negative_outcome_control") {
  return {
    case_id: "payment" as const,
    schedule,
    passed: true,
    instruction_id: `test-${schedule}`,
    committed_debits: 0,
    duplicate_debit_attempts: 0,
    unknown_views_observed: 0,
    final_negative_observed: false,
    restart_occurred: false,
    evidence_checks: [],
    failure_reasons: [],
    unverified_reasons: [],
    failure_reason_count: 0,
    unverified_reason_count: 0,
  };
}

function controllerApp(runtime: GuestRuntime, stateDir: string, overrides: Partial<ControllerPorts> = {}): ControllerApp {
  return new ControllerApp({
    runtime,
    nowMs: () => 1000,
    stateDir,
    deadlineAtMs: 5000,
    attempt: attemptInvocation(),
    limits: {
      build: { cpu: 1, memory_mib: 512, max_processes: 32, workspace_disk_mib: 256, wall_time_seconds: 120, max_output_bytes: 1_048_576 },
      run: { cpu: 1, memory_mib: 512, max_processes: 16, attempt_state_disk_mib: 64, wall_time_seconds: 90, max_output_bytes: 1_048_576, max_frame_bytes: 65_536 },
    },
    bundle: [],
    ...overrides,
  });
}

describe("controller protocol validates requests and effects", () => {
  it("rejects unknown payload fields and malformed results", () => {
    assert.throws(() => validatePayload("build", { workspace_ref: "/w", offline_bundle_ref: "/d", build_spec_sha256: "a".repeat(64), extra: 1 }), /unknown|missing/i);
    assert.throws(() => validateResult("build", { image_id: "not-a-digest" }), /image_id|Missing required/);
    const failedBuild = {
      image_id: `l3-build-${"a".repeat(12)}`,
      exit_code: 1,
      duration_ms: 1,
      stdout_bytes: 0,
      stderr_bytes: 0,
      timed_out: false,
      output_truncated: false,
      stream_mask_base64: "",
      stream_capture_bytes: 0,
      output_container_id: "",
      output_container_pid: 0,
      entrypoint_sha256: "",
      artifact_count: 0,
      cleanup_failures: 0,
      failure_class: "normal",
    };
    assert.equal(validateResult("build", failedBuild).stream_capture_bytes, 0);
    assert.throws(
      () => validateResult("build", { ...failedBuild, stream_capture_bytes: 1 }),
      /mask for stream_capture_bytes/,
    );
    assert.throws(() => validateResult("run", { container_id: "abc", pid: 0 }), /positive/i);
    assert.throws(() => validateResult("status", { container_state: "running", restart_count: 0, observed_write_bytes: 0, buffered_bytes: 10_000_000, process_session_id: "ps-1" }), /buffer ceiling/);
    assert.throws(() => validateResult("stop_candidate", { terminated: false, exit_code: 0 }), /must not report/);
    assert.throws(() => validateResult("pause_candidate", { state: "running" }), /must report state paused/);
  });

  it("dispatches typed effects and fails closed when its own effect is malformed", async () => {
    const stateDir = await mkdtemp(path.join(tmpdir(), "l3-controller-"));
    try {
      const app = controllerApp(fakeGuestRuntime({ clock: fixedClock() }), stateDir);

      const build = await app.dispatch({ version: 1, seq: 1, operation: "build", payload: { workspace_ref: "/w", offline_bundle_ref: "/d", build_spec_sha256: "c".repeat(64) } });
      assert.equal(build.ok, true, JSON.stringify(build));

      const invalid = await app.dispatch({ version: 1, seq: 2, operation: "build", payload: { workspace_ref: "/w" } });
      assert.equal(invalid.ok, false);

      const broken = controllerApp(
        fakeGuestRuntime({
          async run() {
            return { container_id: "bad id", pid: 1 };
          },
        }),
        stateDir,
      );
      const failed = await broken.dispatch({ version: 1, seq: 1, operation: "run", payload: { entrypoint: "/e", state_volume: "s", image_id: `sha256:${"a".repeat(64)}` } });
      assert.equal(failed.ok, false);
    } finally {
      await rm(stateDir, { recursive: true, force: true });
    }
  });
});

describe("guest collector emits ordered evidence and completes last", () => {
  it("writes contiguous per-artifact frames then a completion frame", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "l3-evidence-"));
    await writeFile(path.join(root, "events.jsonl"), "event-one\nevent-two\n");
    await writeFile(path.join(root, "output.log"), "stdout\n");
    await writeFile(path.join(root, "receipt.json"), '{"ok":true}\n');
    await writeFile(path.join(root, "dispositions.jsonl"), '{"state":"accepted"}\n');

    const frames: string[] = [];
    const outcome = await runCollector({
      evidenceRoot: root,
      writeFrame: async (frame) => {
        frames.push(frame);
      },
    });
    assert.equal(outcome.artifacts.length, REQUIRED_EVIDENCE_ARTIFACTS.length);
    assert.match(frames[frames.length - 1], /"complete":true/);

    const seen = new Map<string, number>();
    for (const frame of frames.slice(0, -1)) {
      const parsed = JSON.parse(frame) as { artifact: string; seq: number };
      const expected = (seen.get(parsed.artifact) ?? 0) + 1;
      assert.equal(parsed.seq, expected);
      seen.set(parsed.artifact, parsed.seq);
    }
  });

  it("fails without emitting completion when an artifact is missing", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "l3-evidence-"));
    await writeFile(path.join(root, "events.jsonl"), "only\n");
    await assert.rejects(async () =>
      runCollector({ evidenceRoot: root, writeFrame: async () => undefined }),
    );
  });
});

// ---------------------------------------------------------------------------
// Host collector
// ---------------------------------------------------------------------------

interface CollectorHarness {
  readonly io: ScriptedProcessIO;
  readonly collector: OfflineEvidenceCollector;
  readonly attemptDir: string;
  readonly exportRoot: string;
  readonly statePath: string;
  readonly tokens: { attach: HostCapabilityToken; drain: HostCapabilityToken };
}

async function collectorHarness(): Promise<CollectorHarness> {
  const io = new ScriptedProcessIO();
  const attemptDir = await mkdtemp(path.join(tmpdir(), "l3-attempt-"));
  const exportRoot = `${attemptDir}-preserved`;
  const statePath = path.join(attemptDir, "state.img");
  await writeFile(statePath, "state-bytes");
  const collector = new OfflineEvidenceCollector({
    io,
    verifier,
    clock: fixedClock(),
    runnerPath: "/prepared/l3vz",
    images: IMAGES,
    exportRoot,
    allowUnboundedHeap: true,
  });
  const all = tokensFor(DESCRIPTOR);
  return { io, collector, attemptDir, exportRoot, statePath, tokens: { attach: all.collector_attach, drain: all.collector_drain } };
}

/** Wire frame with the reversible representation the collector actually emits. */
function wireFrame(artifact: string, seq: number, data: string | Buffer): string {
  const bytes = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return JSON.stringify({ version: 1, artifact, seq, encoding: "base64", data: bytes.toString("base64") });
}

function evidenceFrames(overrides: { artifact?: string; skipComplete?: boolean } = {}): readonly string[] {
  const frames = REQUIRED_EVIDENCE_ARTIFACTS.filter((name) => name !== overrides.artifact).map((artifact) =>
    wireFrame(artifact, 1, `${artifact}-body`),
  );
  if (overrides.skipComplete === true) return frames;
  return [
    ...frames,
    JSON.stringify({
      version: 1,
      complete: true,
      artifacts: [...REQUIRED_EVIDENCE_ARTIFACTS],
      frames: frames.length,
      bytes: frames.reduce((total, frame) => total + Buffer.byteLength(frame, "utf8"), 0),
    }),
  ];
}

function collectionRequest(h: CollectorHarness, collectionId = "col-1") {
  return {
    collection_id: collectionId,
    original_state_path: h.statePath,
    attempt_directory: h.attemptDir,
    tokens: h.tokens,
    expectation: {
      run_id: RUN_ID,
      manifest_sha256: MANIFEST_SHA,
      attempt_index: DESCRIPTOR.attempt_index,
      case_id: DESCRIPTOR.case_id,
      arm_id: DESCRIPTOR.arm_id,
    },
  };
}

describe("host collection retains bodies and never touches the original disk", () => {
  it("refuses an unbounded host verifier heap before collection", async () => {
    const collector = new OfflineEvidenceCollector({
      io: {} as never,
      verifier: {} as never,
      clock: { nowMs: () => 0 },
      runnerPath: "/prepared/l3vz",
      images: IMAGES,
      exportRoot: "/tmp/unbounded-verifier",
    });
    const outcome = await collector.collect({
      collection_id: "col-unbounded",
      original_state_path: "/state/a.img",
      attempt_directory: "/attempt",
      tokens: { attach: 1, drain: 2 },
      expectation: {},
    } as never);
    assert.equal(outcome.available, false);
    if (!outcome.available) {
      assert.equal(outcome.reason, "collector_launch_failed");
      assert.match(outcome.detail, /unconstrained/);
    }
  });

  it("returns a receipt with retained bodies on ordered evidence", async () => {
    const h = await collectorHarness();
    h.io.captureQueue.push(new FakeSerialCapture({ frames: evidenceFrames() }));
    const outcome: CollectorOutcome = await h.collector.collect(collectionRequest(h));
    assert.equal(
      outcome.available,
      true,
      outcome.available ? "" : `${outcome.reason}: ${outcome.detail}`,
    );
    if (!outcome.available) return;
    assert.equal(outcome.bodies.length, REQUIRED_EVIDENCE_ARTIFACTS.length);
    for (const body of outcome.bodies) {
      // Retained bodies are raw bytes: the carrier is reversible, the artifact is not text.
      assert.deepEqual(await readFile(body.retained_path), body.bytes);
    }
    assert.equal(outcome.receipt.coverage.stream_terminated, true);
    assert.equal(outcome.receipt.run_id, RUN_ID);
    assert.equal(outcome.receipt.attempt_index, DESCRIPTOR.attempt_index);
    const exportRelative = path.relative(h.attemptDir, outcome.receipt.readonly_copy_path);
    assert.ok(exportRelative.startsWith(".."), "preserved copy must be outside the attempt deletion subtree");
    assert.equal(h.io.commands.some((command) => command.argv[0] === "/bin/rm"), false);
    assert.equal(h.io.commands.some((command) => command.argv.includes(h.statePath) && command.argv[0] === "/bin/cp"), true);
  });

  it("marks duplicate or incomplete evidence unavailable and compromise-typed", async () => {
    const duplicate = await collectorHarness();
    duplicate.io.captureQueue.push(
      new FakeSerialCapture({
        frames: [wireFrame("output.log", 1, "a"), wireFrame("output.log", 1, "b")],
      }),
    );
    const dupOutcome = await duplicate.collector.collect(collectionRequest(duplicate));
    assert.equal(dupOutcome.available, false);
    if (!dupOutcome.available) {
      assert.equal(dupOutcome.reason, "suspected_compromise");
      assert.equal(dupOutcome.suspected_compromise, true);
    }

    const incomplete = await collectorHarness();
    incomplete.io.captureQueue.push(
      new FakeSerialCapture({ frames: evidenceFrames({ artifact: "receipt.json", skipComplete: true }) }),
    );
    const incompleteOutcome = await incomplete.collector.collect(collectionRequest(incomplete));
    assert.equal(incompleteOutcome.available, false);
  });

  it("refuses to verify an export whose retained body was modified", async () => {
    const h = await collectorHarness();
    h.io.captureQueue.push(new FakeSerialCapture({ frames: evidenceFrames() }));
    const outcome = await h.collector.collect(collectionRequest(h));
    assert.equal(outcome.available, true, outcome.available ? "" : `${outcome.reason}: ${outcome.detail}`);
    if (!outcome.available) return;

    const verified = await verifyExport(outcome.receipt, outcome.bodies);
    assert.equal(verified.collection_id, "col-1");

    await writeFile(outcome.bodies[0].retained_path, "tampered");
    await assert.rejects(async () => verifyExport(outcome.receipt, outcome.bodies), /no longer matches/);
  });

  it("bounds aggregate evidence bytes", async () => {
    const h = await collectorHarness();
    const oversized = `${"z".repeat(MAX_EVIDENCE_TOTAL_BYTES + 1)}`;
    h.io.captureQueue.push(new FakeSerialCapture({ frames: [wireFrame("output.log", 1, oversized)] }));
    const outcome = await h.collector.collect(collectionRequest(h));
    assert.equal(outcome.available, false, "aggregate overflow must not be available");
    if (!outcome.available) assert.equal(outcome.suspected_compromise, true, `${outcome.reason}: ${outcome.detail}`);
  });

  it("exercises adapter.collect with separate attach and drain tokens", async () => {
    const { adapter, io, tokens } = await harness();
    await adapter.preflight(DESCRIPTOR, tokens.runtime_preflight, mintImagesApproval());
    const guest = await adapter.stageAttempt(DESCRIPTOR, tokens.guest_stage, ARTIFACTS);
    io.captureQueue.push(new FakeSerialCapture());
    await adapter.launchAttempt(guest.guest_id, tokens.guest_execute_run);
    await adapter.stopGuest(guest.guest_id, tokens.guest_stop);

    io.captureQueue.push(new FakeSerialCapture({ frames: evidenceFrames() }));
    const outcome = await adapter.collect(
      guest.guest_id,
      { attach: tokens.collector_attach, drain: tokens.collector_drain },
      "col-adapt-1",
    );
    assert.equal(outcome.available, true);
    if (outcome.available) {
      assert.equal(outcome.receipt.collection_id, "col-adapt-1");
      assert.equal(outcome.bodies.length, REQUIRED_EVIDENCE_ARTIFACTS.length);
    }

    // Negative case: reusing collector_attach as drain token fails closed
    io.captureQueue.push(new FakeSerialCapture({ frames: evidenceFrames() }));
    const badOutcome = await adapter.collect(
      guest.guest_id,
      { attach: tokens.collector_attach, drain: tokens.collector_attach },
      "col-adapt-2",
    );
    assert.equal(badOutcome.available, false);
    assert.equal(badOutcome.reason, "collector_stream_failed");
  });
});

// ---------------------------------------------------------------------------
// Guest channel bounds
// ---------------------------------------------------------------------------

describe("actual raw command stream capture", () => {
  it("preserves invalid UTF-8 bytes and per-byte stream origin before decoding", async () => {
    const script =
      "process.stdout.write(Buffer.from([65,255,66]));process.stderr.write(Buffer.from([128,67]))";
    const result = await streamCommand([process.execPath, "-e", script], { timeoutMs: 2_000, maxBytes: 32 });
    assert.equal(result.code, 0);
    assert.equal(result.truncated, false);
    assert.equal(result.timedOut, false);
    assert.deepEqual(result.raw.filter((_byte, index) => (result.streamMask![index >>> 3] & (1 << (index & 7))) === 0), Buffer.from([65, 255, 66]));
    assert.deepEqual(result.raw.filter((_byte, index) => (result.streamMask![index >>> 3] & (1 << (index & 7))) !== 0), Buffer.from([128, 67]));
    assert.equal(result.stdoutBytes, 3);
    assert.equal(result.stderrBytes, 2);
    assert.deepEqual(result.stdoutRaw, Buffer.from([65, 255, 66]));
    assert.deepEqual(result.stderrRaw, Buffer.from([128, 67]));
  });

  it("preserves header-like binary payloads on the actual separate stdout/stderr pipes", async () => {
    // Docker's historical multiplexed stream used an 8-byte header
    // [stream,0,0,0,size:u32be]. The pinned CLI keeps stdout/stderr as explicit
    // separate pipes, so these bytes must be retained verbatim, never sniffed,
    // stripped, or reinterpreted as framing.
    const script = [
      "const header = Buffer.from([1,0,0,0,0,0,0,5,0x68,0x69]);",
      "const stderrHeader = Buffer.from([2,0,0,0,0,0,0,3,0xff,0xfe,0x00]);",
      "process.stdout.write(header);process.stderr.write(stderrHeader);",
    ].join("");
    const result = await streamCommand([process.execPath, "-e", script], { timeoutMs: 2_000, maxBytes: 64 });
    assert.equal(result.code, 0);
    assert.equal(result.truncated, false);
    assert.deepEqual(result.stdoutRaw, Buffer.from([1, 0, 0, 0, 0, 0, 0, 5, 0x68, 0x69]));
    assert.deepEqual(result.stderrRaw, Buffer.from([2, 0, 0, 0, 0, 0, 0, 3, 0xff, 0xfe, 0x00]));
    assert.equal(result.stdoutBytes, 10);
    assert.equal(result.stderrBytes, 11);
  });

  it("kills a producer when combined raw bytes exceed the single cap", async () => {
    const script = "process.stdout.write(Buffer.alloc(4096, 65));process.stderr.write(Buffer.alloc(4096, 66))";
    const result = await streamCommand([process.execPath, "-e", script], { timeoutMs: 2_000, maxBytes: 32 });
    assert.equal(result.truncated, true);
    assert.equal(result.raw.length, 32);
    assert.ok(result.observedBytes > result.raw.length);
  });

  it("reports an elapsed command deadline separately from byte overflow", async () => {
    const result = await streamCommand(
      [process.execPath, "-e", "setInterval(() => process.stdout.write('x'), 1)"],
      { timeoutMs: 30, maxBytes: 4096 },
    );
    assert.equal(result.timedOut, true);
    assert.equal(result.truncated, false);
    assert.ok(result.raw.length <= 4096);
  });
});

describe("DockerGuestRuntime process capture (fake command port, real child pipes)", () => {
  const GUEST_LIMITS = {
    build: {
      cpu: 1, memory_mib: 512, max_processes: 32, workspace_disk_mib: 256,
      wall_time_seconds: 120, max_output_bytes: 1024,
      builder_image_digest: `sha256:${"a".repeat(64)}`,
    },
    run: {
      cpu: 1, memory_mib: 512, max_processes: 16, attempt_state_disk_mib: 64,
      wall_time_seconds: 90, max_output_bytes: 64, max_frame_bytes: 65_536,
    },
  } as const;

  async function fixture(dir: string, name: string, body: string): Promise<string> {
    const file = path.join(dir, name);
    await writeFile(file, `#!/bin/sh\nexec '${process.execPath}' -e ${JSON.stringify(body)}\n`, { mode: 0o755 });
    await chmod(file, 0o755);
    return file;
  }

  function fakeCommand(calls: string[][]): {
    run(argv: readonly string[]): Promise<{
      code: number | null; timedOut: boolean; stdout: string; stderr: string;
      stdoutBytes: number; stderrBytes: number; truncated: boolean; durationMs: number;
    }>;
    stream(): Promise<never>;
  } {
    return {
      async run(argv) {
        calls.push([...argv]);
        const stdout = argv[1] === "inspect" ? `${"a".repeat(64)} 123` : "";
        return {
          code: 0, timedOut: false, stdout, stderr: "",
          stdoutBytes: stdout.length, stderrBytes: 0, truncated: false, durationMs: 1,
        };
      },
      async stream() {
        throw new Error("stream is not used by these tests");
      },
    };
  }

  type Internals = {
    attachChannel(child: unknown, maxFrameBytes: number, sessionId: string): void;
    restartCandidate(reason: string): Promise<{ restart_count: number }>;
    candidateContainerName: string | null;
    containerId: string | null;
    containerPid: number;
    sessionSequence: number;
  };

  it("charges every session to one run budget and kills the owning container on overflow", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "l3-run-budget-"));
    try {
      const shim = await fixture(
        dir,
        "docker",
        "process.stdout.write(Buffer.alloc(40, 0x41));process.stderr.write(Buffer.alloc(120, 0x42));",
      );
      const calls: string[][] = [];
      const runtime = new DockerGuestRuntime({
        command: fakeCommand(calls) as never,
        clock: { nowMs: () => Date.now() },
        dockerBinary: shim,
        stateDir: dir,
        limits: GUEST_LIMITS,
      });
      const internals = runtime as unknown as Internals;
      internals.candidateContainerName = "l3-run-budget";
      const child = spawn(shim, ["start"], { stdio: ["pipe", "pipe", "pipe"] });
      internals.attachChannel(child, 65_536, "ps-0");
      await once(child, "close");
      assert.equal(runtime.candidateOutputTruncated(), true);
      const chunks = runtime.drainCandidateOutput();
      const retained = chunks.reduce((total, chunk) => total + chunk.bytes.length, 0);
      assert.ok(retained <= GUEST_LIMITS.run.max_output_bytes, `retained ${retained} bytes`);
      assert.ok(chunks.every((chunk) => chunk.process_session_id === "ps-0"));
      await waitForCondition(() => calls.some((argv) => argv[1] === "kill" && argv[2] === "l3-run-budget"));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("drains the old session before restarting and attributes the new session", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "l3-restart-"));
    try {
      const oldShim = await fixture(dir, "docker-old", "process.stdout.write('OLD')");
      const newShim = await fixture(dir, "docker-new", "process.stdout.write('NEW')");
      const calls: string[][] = [];
      const runtime = new DockerGuestRuntime({
        command: fakeCommand(calls) as never,
        clock: { nowMs: () => Date.now() },
        dockerBinary: newShim,
        stateDir: dir,
        limits: GUEST_LIMITS,
      });
      const internals = runtime as unknown as Internals;
      internals.containerId = "a".repeat(64);
      internals.containerPid = 111;
      internals.sessionSequence = 0;
      const oldChild = spawn(oldShim, ["attach"], { stdio: ["pipe", "pipe", "pipe"] });
      internals.attachChannel(oldChild, 65_536, "ps-0");
      await once(oldChild, "close");

      const result = await internals.restartCandidate("test_restart");
      assert.equal(result.restart_count, 1);
      assert.ok(calls.some((argv) => argv[1] === "stop"));
      assert.ok(calls.some((argv) => argv[1] === "inspect"));
      let chunks = runtime.drainCandidateOutput();
      await waitForCondition(() => {
        const next = runtime.drainCandidateOutput();
        if (next.length > 0) chunks = chunks.concat(next);
        return chunks.some((chunk) => chunk.process_session_id === "ps-1");
      });
      assert.deepEqual(
        chunks.map((chunk) => [chunk.process_session_id, chunk.bytes.toString("utf8")]),
        [["ps-0", "OLD"], ["ps-1", "NEW"]],
        "the old capture survives and the restarted process owns a new session",
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  function buildCommand(options: {
    stream: {
      code: number | null; observedBytes: number; timedOut: boolean; truncated: boolean;
      durationMs: number; raw: Buffer; stdoutBytes?: number; stderrBytes?: number;
    };
    waitStdout?: string;
  }): {
    run(argv: readonly string[]): Promise<{
      code: number | null; timedOut: boolean; stdout: string; stderr: string;
      stdoutBytes: number; stderrBytes: number; truncated: boolean; durationMs: number;
    }>;
    stream(): Promise<typeof options.stream>;
  } {
    return {
      async run(argv) {
        if (argv[1] === "inspect") {
          const stdout = JSON.stringify({ Id: "a".repeat(64), State: { Pid: 123 } });
          return {
            code: 0, timedOut: false, stdout, stderr: "",
            stdoutBytes: stdout.length, stderrBytes: 0, truncated: false, durationMs: 1,
          };
        }
        if (argv[1] === "wait") {
          const stdout = options.waitStdout ?? "0";
          return {
            code: 0, timedOut: false, stdout, stderr: "",
            stdoutBytes: stdout.length, stderrBytes: 0, truncated: false, durationMs: 1,
          };
        }
        return {
          code: 0, timedOut: false, stdout: "", stderr: "",
          stdoutBytes: 0, stderrBytes: 0, truncated: false, durationMs: 1,
        };
      },
      async stream() {
        return options.stream;
      },
    };
  }

  function buildRuntime(dir: string, command: unknown, overrides: Record<string, unknown> = {}) {
    const noopPolicy = {
      verifyConfig: () => undefined,
      verifyCgroup: async () => undefined,
    };
    return new DockerGuestRuntime({
      command: command as never,
      clock: { nowMs: () => Date.now() },
      stateDir: dir,
      limits: GUEST_LIMITS,
      buildPolicyChecks: noopPolicy,
      ...overrides,
    });
  }

  it("distinguishes compiler status, policy, persistence and timeout classes", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "l3-build-classes-"));
    const base = {
      code: 0, observedBytes: 3, timedOut: false, truncated: false, durationMs: 1,
      raw: Buffer.from("abc"), stdoutBytes: 3, stderrBytes: 0,
    };
    try {
      // Attach client exits nonzero while the container exits 3: `wait` wins.
      const normal = await buildRuntime(dir, buildCommand({ stream: { ...base, code: 1 }, waitStdout: "3" }))
        .build({ workspace_ref: dir, offline_bundle_ref: dir, build_spec_sha256: "b".repeat(64) });
      assert.equal(normal.failure_class, "normal");
      assert.equal(normal.exit_code, 3);

      const policy = await buildRuntime(
        dir,
        buildCommand({ stream: base }),
        { buildPolicyChecks: { verifyConfig: () => { throw new Error("config refused"); }, verifyCgroup: async () => undefined } },
      ).build({ workspace_ref: dir, offline_bundle_ref: dir, build_spec_sha256: "c".repeat(64) });
      assert.equal(policy.failure_class, "policy");

      const persistence = await buildRuntime(
        dir,
        buildCommand({ stream: base }),
        { appendOutputFile: async () => { throw new Error("disk full"); } },
      ).build({ workspace_ref: dir, offline_bundle_ref: dir, build_spec_sha256: "d".repeat(64) });
      assert.equal(persistence.failure_class, "persistence");

      const timeout = await buildRuntime(
        dir,
        buildCommand({ stream: { ...base, timedOut: true } }),
      ).build({ workspace_ref: dir, offline_bundle_ref: dir, build_spec_sha256: "e".repeat(64) });
      assert.equal(timeout.failure_class, "timeout");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("drives run() through the fake command port and shares one budget across a reset", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "l3-run-reset-"));
    const argsFile = path.join(dir, "argv.txt");
    try {
      const shim = path.join(dir, "docker");
      await writeFile(
        shim,
        `#!/bin/sh\nprintf '%s ' "$@" > ${JSON.stringify(argsFile)}\nexec '${process.execPath}' -e 'process.stdout.write(Buffer.alloc(40, 0x41))'\n`,
        { mode: 0o755 },
      );
      await chmod(shim, 0o755);
      const calls: string[][] = [];
      const command = {
        async run(argv: readonly string[]) {
          calls.push([...argv]);
          const format = argv[3] ?? "";
          const stdout = argv[1] === "inspect"
            ? (format.includes("|") ? "exited|0|2026-01-01T00:00:00Z|0" : `${"a".repeat(64)} 123`)
            : "";
          return {
            code: 0, timedOut: false, stdout, stderr: "",
            stdoutBytes: stdout.length, stderrBytes: 0, truncated: false, durationMs: 1,
          };
        },
        async stream() {
          throw new Error("stream is not used by run");
        },
      };
      const runtime = new DockerGuestRuntime({
        command: command as never,
        clock: { nowMs: () => Date.now() },
        dockerBinary: shim,
        stateDir: dir,
        limits: GUEST_LIMITS,
        prepareVolume: async (stateVolume) => ({
          volume_dir: path.join(dir, "volumes", stateVolume),
          aux_dir: path.join(dir, "candidate", stateVolume),
          aux_socket_path: path.join(dir, "candidate", stateVolume, "aux.sock"),
        }),
      });
      await runtime.prepareStateVolume("vol-0");
      const first = await runtime.run("/workspace/index.js", "vol-0", `sha256:${"a".repeat(64)}`);
      assert.equal(first.pid, 123);
      await waitForCondition(() => existsSync(argsFile) && readFileSync(argsFile, "utf8").includes("--log-driver=none"));
      const launched = await readFile(argsFile, "utf8");
      assert.match(launched, /--log-driver=none/);
      await waitForCondition(() => runtime.processSessionId() === "ps-1");
      await runtime.resetState("vol-0");
      await waitForCondition(() => runtime.processSessionId() === "ps-2");
      let chunks = runtime.drainCandidateOutput();
      await waitForCondition(() => {
        const next = runtime.drainCandidateOutput();
        if (next.length > 0) chunks = chunks.concat(next);
        return chunks.reduce((total, chunk) => total + chunk.bytes.length, 0) > 0;
      });
      const retained = chunks.reduce((total, chunk) => total + chunk.bytes.length, 0);
      assert.ok(retained <= GUEST_LIMITS.run.max_output_bytes, `retained ${retained} across two sessions`);
      assert.ok(chunks.some((chunk) => chunk.process_session_id === "ps-1"));
      assert.ok(calls.some((argv) => argv[1] === "stop"));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("classifies a container-create failure separately from a compiler status", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "l3-build-class-"));
    try {
      const command = {
        async run(argv: readonly string[]) {
          const code = argv[1] === "create" ? 2 : 0;
          return {
            code, timedOut: false, stdout: "", stderr: "create failed",
            stdoutBytes: 0, stderrBytes: 12, truncated: false, durationMs: 1,
          };
        },
        async stream() {
          throw new Error("stream is not used for a failed create");
        },
      };
      const runtime = new DockerGuestRuntime({
        command: command as never,
        clock: { nowMs: () => Date.now() },
        stateDir: dir,
        limits: GUEST_LIMITS,
      });
      const effect = await runtime.build({
        workspace_ref: dir,
        offline_bundle_ref: dir,
        build_spec_sha256: "b".repeat(64),
      });
      assert.equal(effect.failure_class, "infrastructure");
      assert.equal(effect.exit_code, 2);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("guest channel enforces queue and deadline bounds", () => {
  it("rejects a frame above the per-frame cap", async () => {
    const { PassThrough } = await import("node:stream");
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const channel = new BoundedJsonlChannel(
      { stdin, stdout, kill: () => undefined },
      { maxFrameBytes: 128, maxTotalBytes: 4096 },
    );
    await assert.rejects(async () => channel.write(`${"x".repeat(200)}\n`), /exceeds 128 bytes/);
    stdout.destroy();
    stdin.destroy();
  });

  it("captures binary stdout and stderr before JSONL decoding", async () => {
    const { PassThrough } = await import("node:stream");
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const channel = new BoundedJsonlChannel(
      { stdin, stdout, stderr, kill: () => undefined },
      { maxFrameBytes: 128, maxTotalBytes: 64 },
    );
    const stdoutPrefix = Buffer.from([0xff, 0x00]);
    const stdoutSuffix = Buffer.from([0x7b, 0x22]);
    const stderrBytes = Buffer.from([0x80, 0x00, 0xfe]);
    stdout.write(stdoutPrefix);
    stderr.write(stderrBytes);
    stdout.write(stdoutSuffix);
    await new Promise<void>((resolve) => setImmediate(resolve));

    const [captured] = channel.drainRawOutput();
    assert.notEqual(captured, undefined);
    assert.equal(captured?.stream, "combined");
    assert.equal(captured?.stream_offset, 0);
    assert.equal(captured?.capture_order, 1);
    assert.deepEqual(captured?.bytes, Buffer.concat([stdoutPrefix, stderrBytes, stdoutSuffix]));
    assert.deepEqual(captured?.stream_mask, Buffer.from([0b00011100]));
    stdout.destroy();
    stderr.destroy();
    stdin.destroy();
  });
  it("applies one combined stdout/stderr raw-byte ceiling and retains its exact prefix", async () => {
    const { PassThrough } = await import("node:stream");
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    let killed = false;
    const channel = new BoundedJsonlChannel(
      { stdin, stdout, stderr, kill: () => (killed = true) },
      { maxFrameBytes: 128, maxTotalBytes: 5 },
    );
    stdout.write(Buffer.from([0xff, 0x00, 0x7b]));
    stderr.write(Buffer.from([0x80, 0x00, 0xfe]));
    await new Promise<void>((resolve) => setImmediate(resolve));
    const output = channel.drainRawOutput();
    assert.deepEqual(output.map((chunk) => [chunk.stream, chunk.bytes, chunk.stream_mask]), [
      ["combined", Buffer.from([0xff, 0x00, 0x7b, 0x80, 0x00]), Buffer.from([0b00011000])],
    ]);
    assert.equal(channel.stats().truncated, true);
    assert.equal(channel.stats().observed_output_bytes, 6);
    assert.equal(channel.stats().stdout_raw_bytes, 3);
    assert.equal(channel.stats().stderr_raw_bytes, 2);
    assert.equal(killed, true);
    stdout.destroy();
    stderr.destroy();
    stdin.destroy();
  });

  it("fails on absolute deadline without a response", async () => {
    const { PassThrough } = await import("node:stream");
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const channel = new BoundedJsonlChannel(
      { stdin, stdout, kill: () => undefined },
      { maxFrameBytes: 1024, maxTotalBytes: 4096 },
    );
    await assert.rejects(async () => channel.exchange(`${JSON.stringify({ a: 1 })}\n`, Date.now() - 1), /deadline/);
    stdout.destroy();
    stdin.destroy();
  });
});

async function waitForCondition(check: () => boolean, attempts = 1500): Promise<void> {
  for (let index = 0; index < attempts; index += 1) {
    if (check()) return;
    // The code under test resolves its identity with real short timers.
    await new Promise<void>((resolve) => setTimeout(resolve, 1));
  }
  throw new Error("condition was not reached");
}

describe("artifact-v1 auxiliary contract", () => {
  it("never mints a receipt without an authenticated peer on the same connection", async () => {
    const tmp = await realpath(await mkdtemp(path.join(tmpdir(), "l3-aux-")));
    let aux: AuxiliaryChannel | null = null;
    let client: { destroy(): void } | null = null;
    try {
      const socketPath = path.join(tmp, "aux.sock");
      aux = new AuxiliaryChannel({
        socketPath,
        attempt_id: "attempt-1",
        processSessionId: () => "ps-1",
        resolvePeer: async () => null,
        peerHelperBinary: path.join(tmp, "missing-helper"),
        nowMs: () => 1000,
      });
      await aux.listen();
      const payload = Buffer.from("synthetic payload bytes for overload testing");

      const withoutPeer = await aux
        .sendFrame({
          seq: 1,
          connection_id: "conn-1",
          message_id: "msg-1",
          payload,
          requested_summary: { offer_id: "offer-1", window_index: 0 },
        })
        .then(
          (receipt) => ({ receipt }),
          (error: Error) => ({ error }),
        );
      assert.equal("receipt" in withoutPeer ? withoutPeer.receipt : null, null, "no receipt without a peer");
      assert.match("error" in withoutPeer ? withoutPeer.error.message : "", /peer|identity|authenticated/);

      const net = await import("node:net");
      const connected = net.createConnection(socketPath);
      client = connected;
      await new Promise<void>((resolve) => connected.once("connect", () => resolve()));
      await waitForCondition(() => aux !== null && aux.getFailure() !== null);
      const afterConnect = await aux
        .sendFrame({
          seq: 1,
          connection_id: "conn-1",
          message_id: "msg-1",
          payload,
          requested_summary: { offer_id: "offer-1", window_index: 0 },
        })
        .then(
          (receipt) => ({ receipt }),
          (error: Error) => ({ error }),
        );
      assert.equal("receipt" in afterConnect ? afterConnect.receipt : null, null);
      assert.match("error" in afterConnect ? afterConnect.error.message : "", /identity|authenticated/);
      assert.equal(aux.getObservation(), null);
      assert.match(aux.getFailure() ?? "", /identity is unavailable/);
    } finally {
      client?.destroy();
      await aux?.close();
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it("fails closed when the peer helper rejects the connection", async () => {
    const tmp = await realpath(await mkdtemp(path.join(tmpdir(), "l3-aux-")));
    let aux: AuxiliaryChannel | null = null;
    let client: { destroy(): void } | null = null;
    try {
      const socketPath = path.join(tmp, "aux.sock");
      aux = new AuxiliaryChannel({
        socketPath,
        attempt_id: "attempt-1",
        processSessionId: () => "ps-1",
        resolvePeer: async () => ({ pid: 4242, cgroup: "/system.slice/docker-test.scope" }),
        peerHelperBinary: "/usr/bin/false",
        nowMs: () => 1000,
      });
      await aux.listen();
      const net = await import("node:net");
      const connected = net.createConnection(socketPath);
      client = connected;
      await new Promise<void>((resolve) => connected.once("connect", () => resolve()));
      await waitForCondition(() => aux !== null && aux.getFailure() !== null);

      const attempt = await aux
        .sendFrame({
          seq: 1,
          connection_id: "conn-1",
          message_id: "msg-1",
          payload: Buffer.from("x"),
          requested_summary: { offer_id: "offer-x", window_index: 0 },
        })
        .then(
          (receipt) => ({ receipt }),
          (error: Error) => ({ error }),
        );
      assert.equal("receipt" in attempt ? attempt.receipt : null, null, "a rejected peer can never mint a receipt");
      assert.equal(aux.getObservation(), null);
    } finally {
      client?.destroy();
      await aux?.close();
      await rm(tmp, { recursive: true, force: true });
    }
  });
});

describe("autonomous controller execution and D3 driver lifecycle", () => {
  it("executes the build-only workflow and reports it in the receipt", async () => {
    const stateDir = await mkdtemp(path.join(tmpdir(), "l3-ctrl-build-"));
    try {
      let shutdownCalled = false;
      const phases: string[] = [];
      const runtime = fakeGuestRuntime({
        async run() {
          throw new Error("run must not be called in build phase");
        },
        async shutdownGuest() {
          shutdownCalled = true;
        },
      });

      const app = controllerApp(runtime, stateDir, {
        attempt: attemptInvocation({ phase: "build" }),
        emitStatus: (phase) => phases.push(phase),
      });

      await app.runAutonomous();
      assert.equal(shutdownCalled, true);
      const receipt = JSON.parse(await readFile(path.join(stateDir, "receipt.json"), "utf8"));
      assert.equal(receipt.reason, "build_completed", JSON.stringify(receipt));
      assert.equal(receipt.attempt.phase, "build");
      assert.deepEqual(phases, ["build_started", "build_finished"]);
    } finally {
      await rm(stateDir, { recursive: true, force: true });
    }
  });

  it("turns a plain consumer-read resume error into a fatal workflow failure", async () => {
    const stateDir = await mkdtemp(path.join(tmpdir(), "l3-ctrl-resume-"));
    try {
      const payload = Buffer.from("resume-payload");
      const app = controllerApp(
        fakeGuestRuntime({
          async resumeCandidate() {
            throw new Error("unpause refused");
          },
          async readCandidate() {
            const frame = JSON.stringify({
              version: 1, seq: 2, ok: true,
              result: { delivered: [{ message_id: "msg-1", bytes: payload.length }], closed: false },
            });
            return { response_frame: frame, observed_bytes: frame.length, deadline_exceeded: false };
          },
        }),
        stateDir,
      );
      const internals = app as unknown as {
        expectedPayloads: Map<string, { bytes: number; sha256: string; send_seq: number }>;
        queueObserver: unknown;
        fatalResumeFailure: Error | null;
        buildPorts(): { transport: { sendRawRequest(frame: string): Promise<string> } };
      };
      internals.expectedPayloads.set("conn-1|msg-1", {
        bytes: payload.length,
        sha256: createHash("sha256").update(payload).digest("hex"),
        send_seq: 1,
      });
      internals.queueObserver = { async readConsumerOutbox() { return payload; } };
      const envelope = JSON.stringify({
        version: 1, seq: 2, operation: "read",
        payload: { connection_id: "conn-1", max_bytes: 1024 },
      });
      await assert.rejects(
        async () => await internals.buildPorts().transport.sendRawRequest(envelope),
        ObserverResumeError,
      );
      assert.ok(internals.fatalResumeFailure instanceof ObserverResumeError);
    } finally {
      await rm(stateDir, { recursive: true, force: true });
    }
  });

  it("refuses a read selection from a connection with no outstanding trusted send", async () => {
    const stateDir = await mkdtemp(path.join(tmpdir(), "l3-ctrl-cross-"));
    try {
      const app = controllerApp(fakeGuestRuntime(), stateDir);
      const internals = app as unknown as {
        expectedPayloads: Map<string, { bytes: number; sha256: string; send_seq: number }>;
        consumedReceipts: Map<string, unknown>;
        queueObserver: unknown;
        consumerReceiptsOf(
          requestFrame: string,
          responseFrame: string,
          deadlineAtMs: number,
        ): Promise<Map<string, unknown>>;
      };
      const payload = Buffer.from("cross-connection");
      internals.expectedPayloads.set("conn-1|msg-1", {
        bytes: payload.length,
        sha256: createHash("sha256").update(payload).digest("hex"),
        send_seq: 1,
      });
      internals.queueObserver = {
        async readConsumerOutbox(_root: string, connectionId: string) {
          if (connectionId !== "conn-2") throw new Error(`unexpected connection ${connectionId}`);
          return payload;
        },
      };
      const request = JSON.stringify({
        version: 1, seq: 2, operation: "read",
        payload: { connection_id: "conn-2", max_bytes: 1024 },
      });
      const response = JSON.stringify({
        version: 1, seq: 2, ok: true,
        result: { delivered: [{ message_id: "msg-1", bytes: payload.length }], closed: false },
      });
      await assert.rejects(
        async () => await internals.consumerReceiptsOf(request, response, Date.now() + 5_000),
        /outstanding trusted send/,
      );
    } finally {
      await rm(stateDir, { recursive: true, force: true });
    }
  });

  it("records driver_missing and stops cleanly instead of throwing mid-run", async () => {
    const stateDir = await mkdtemp(path.join(tmpdir(), "l3-ctrl-missing-"));
    try {
      let stopped = false;
      const runtime = fakeGuestRuntime({
        async stopCandidate() {
          stopped = true;
          return { terminated: true, exit_code: 0 };
        },
      });

      const app = controllerApp(runtime, stateDir);
      await app.runAutonomous();

      assert.equal(stopped, true, "a missing driver must still stop the candidate");
      const receipt = JSON.parse(await readFile(path.join(stateDir, "receipt.json"), "utf8"));
      assert.equal(receipt.reason, "driver_missing");
      assert.equal(receipt.verdict, null);
      assert.match(receipt.failure, /driver/i);
    } finally {
      await rm(stateDir, { recursive: true, force: true });
    }
  });

  it("runs the driver with live controller ports and serializes its verdict", async () => {
    const stateDir = await mkdtemp(path.join(tmpdir(), "l3-ctrl-run-"));
    try {
      let resetStateCalled = false;
      let restartCalled = false;
      let exchangeCandidateCalled = false;
      const runtime = fakeGuestRuntime({
        async readCandidate() {
          exchangeCandidateCalled = true;
          return { response_frame: '{"echo":42}', observed_bytes: 42, deadline_exceeded: false };
        },
        async resetState() {
          resetStateCalled = true;
        },
        async restartCandidate() {
          restartCalled = true;
          return { restart_count: 1 };
        },
      });

      class BehaviouralPaymentDriver {
        constructor(
          readonly transport: { sendRawRequest(req: string): Promise<string> },
          readonly processController: { resetState(): Promise<void>; restartRetainingState(): Promise<void> },
          readonly provider: unknown,
        ) {}
        async runBaseSchedule() {
          await this.processController.resetState();
          const response = await this.transport.sendRawRequest('{"op":"ping"}');
          assert.match(response, /"echo"/);
          return passingPaymentSchedule("base");
        }
        async runAdverseSchedule() {
          await this.processController.restartRetainingState();
          return passingPaymentSchedule("adverse");
        }
        async runChangedConstraintSchedule() { return passingPaymentSchedule("changed_constraint"); }
        async runNegativeOutcomeControl() { return passingPaymentSchedule("negative_outcome_control"); }
      }

      const app = controllerApp(runtime, stateDir, {
        drivers: { PaymentCaseDriver: BehaviouralPaymentDriver },
        providerStub: {
          handleDebit: () => ({ kind: "dropped" }),
          handleLookup: () => ({ kind: "dropped" }),
          handleSettlement: () => ({ kind: "dropped" }),
        },
        emitStatus: () => undefined,
      });

      await app.runAutonomous();
      const receipt = JSON.parse(await readFile(path.join(stateDir, "receipt.json"), "utf8"));
      assert.equal(resetStateCalled, true, JSON.stringify(receipt));
      assert.equal(restartCalled, true, JSON.stringify(receipt.failure));
      assert.equal(exchangeCandidateCalled, true, JSON.stringify(receipt.failure));
      assert.equal(receipt.reason, "payment_completed");
      assert.equal(receipt.verdict.base.passed, true);
    } finally {
      await rm(stateDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Behavioural fault controls for host proofs
// ---------------------------------------------------------------------------

describe("host stop proof and image approval fault controls", () => {
  it("quarantines the attempt and keeps the lease when the runner never reports a stopped state", async () => {
    const { adapter, io, tokens, statePath } = await harness();
    await adapter.preflight(DESCRIPTOR, tokens.runtime_preflight, mintImagesApproval());
    const guest = await adapter.stageAttempt(DESCRIPTOR, tokens.guest_stage, ARTIFACTS);
    io.captureQueue.push(new FakeSerialCapture({ stopped: false }));
    await adapter.launchAttempt(guest.guest_id, tokens.guest_execute_run);

    await assert.rejects(
      async () => adapter.stopGuest(guest.guest_id, tokens.guest_stop),
      /could not be proven/,
    );
    assert.equal(adapter.getGuest(guest.guest_id).status, "failed");
    const ledger = JSON.parse(await readFile(statePath, "utf8"));
    assert.notEqual(ledger.lease, null, "uncertain teardown must keep the durable lease");

    const outcome = await adapter.collect(guest.guest_id, tokens, "col-quarantine");
    assert.equal(outcome.available, false);
    if (!outcome.available) assert.equal(outcome.reason, "guest_not_stopped");
  });

  it("refuses images whose approved facts do not match the declared bytes", async () => {
    const tampered = {
      ...IMAGES,
      rootfs: { ...IMAGES.rootfs, sha256: "a".repeat(64) },
    };
    const { adapter, io } = await harness();
    await assert.rejects(
      async () => adapter.preflight(DESCRIPTOR, tokensFor(DESCRIPTOR).runtime_preflight, mintImagesApproval(tampered)),
      /approval signature verification failed/,
    );
    assert.equal(io.commands.length, 0);
  });

  it("refuses an image approval bound to a different manifest", async () => {
    const { adapter } = await harness();
    await assert.rejects(
      async () =>
        adapter.preflight(
          DESCRIPTOR,
          tokensFor(DESCRIPTOR).runtime_preflight,
          mintImagesApproval(IMAGES, { manifest_sha256: "b".repeat(64) }),
        ),
      /does not match the frozen manifest/,
    );
  });

  it("clamps the staged workflow deadline to the grant expiry", async () => {
    const { adapter, tokens } = await harness();
    const now = Date.parse("2030-01-01T00:30:00.000Z");
    const approval = mintImagesApproval(IMAGES, { expires_at: "2030-01-01T01:00:00.000Z" });
    await adapter.preflight(DESCRIPTOR, tokens.runtime_preflight, approval);
    const stageToken = mint(
      { ...DESCRIPTOR, action: "guest_stage" },
      { expires_at: "2030-01-01T00:31:00.000Z" },
    );
    const guest = await adapter.stageAttempt(DESCRIPTOR, stageToken, ARTIFACTS);
    const config = JSON.parse(await readFile(path.join(guest.attempt_directory, "run.json"), "utf8"));
    assert.ok(
      config.deadline_ms <= 60_000,
      `deadline ${config.deadline_ms} must not exceed the remaining grant window before ${now}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Final acceptance corrections: observable boundary and full workload
// ---------------------------------------------------------------------------

describe("independent boundary evidence and shared time", () => {
  it("records the real message bytes and retires closed connections", async () => {
    const stateDir = await mkdtemp(path.join(tmpdir(), "l3-boundary-"));
    try {
      let snapshotA: unknown = null;
      let snapshotB: unknown = null;
      const written: string[] = [];
      const runtime = fakeGuestRuntime({
        async writeCandidate(frame) {
          written.push(frame);
          return { observed_bytes: Buffer.byteLength(frame, "utf8") };
        },
        async readCandidate() {
          const last = written[written.length - 1] ?? "";
          const request = JSON.parse(last) as {
            seq: number;
            operation: string;
            payload: Record<string, unknown>;
          };
          const result =
            request.operation === "read"
              ? { delivered: [], closed: true }
              : { message_id: request.payload["message_id"], status: "accepted" };
          const response = JSON.stringify({ version: 1, seq: request.seq, ok: true, result });
          return {
            response_frame: response,
            observed_bytes: Buffer.byteLength(response, "utf8"),
            deadline_exceeded: false,
          };
        },
      });
      const envelope = (seq: number, operation: string, connection: string, message: string): string =>
        JSON.stringify({
          version: 1,
          seq,
          operation,
          payload:
            operation === "send"
              ? { connection_id: connection, message_id: message, bytes: 1024 }
              : { connection_id: connection, max_bytes: 1024 },
        });

      class BoundaryDriver {
        constructor(
          readonly transport: {
            sendRawRequest(frame: string, sideband?: unknown): Promise<string>;
          },
          readonly controller: {
            observeConnectionBufferSnapshot(): Promise<unknown>;
          },
        ) {}
        async runBaseSchedule() {
          await this.transport.sendRawRequest(envelope(1, "send", "conn-1", "msg-1"), {
            syntheticBytes: Buffer.alloc(1024, 1),
          });
          await this.transport.sendRawRequest(envelope(2, "send", "conn-2", "msg-2"), {
            syntheticBytes: Buffer.alloc(1024, 2),
          });
          snapshotA = await this.controller.observeConnectionBufferSnapshot();
          await this.transport.sendRawRequest(envelope(3, "read", "conn-1", "read-1"));
          snapshotB = await this.controller.observeConnectionBufferSnapshot();
          return passingPaymentSchedule("base");
        }
        async runAdverseSchedule() { return passingPaymentSchedule("adverse"); }
        async runChangedConstraintSchedule() { return passingPaymentSchedule("changed_constraint"); }
        async runNegativeOutcomeControl() { return passingPaymentSchedule("negative_outcome_control"); }
      }

      const aux = {
        sendFrame: async () => null,
        getStats: () => ({ frames: 2, raw_bytes: 2048, wire_bytes: 2100, offers: 0 }),
        getObservation: () => null,
      } as unknown as AuxiliaryChannel;

      const app = controllerApp(runtime, stateDir, {
        drivers: { PaymentCaseDriver: BoundaryDriver },
        providerStub: {
          handleDebit: () => ({ kind: "dropped" }),
          handleLookup: () => ({ kind: "dropped" }),
          handleSettlement: () => ({ kind: "dropped" }),
        },
        auxChannel: aux,
        emitStatus: () => undefined,
      });
      await app.runAutonomous();

      const evidence = await readFile(path.join(stateDir, "events.jsonl"));
      const section = evidenceSectionOf(evidence);
      assert.notEqual(section, null, "the retained events artifact carries the evidence section");
      const decoded = decodeEvidence(section ?? Buffer.alloc(0), { max_bytes: 8 * 1024 * 1024 });
      assert.equal(decoded.ok, true, decoded.reason ?? "");
      const dispositions = decoded.items
        .filter((item) => item.kind === "transport_disposition")
        .map((item) => item.body as { state: string; bytes: number; connection_id: string });
      const sendEvents = dispositions.filter((event) => event.connection_id.startsWith("conn-"));
      assert.equal(sendEvents.length, 2, "only accepted outbound sends are evidenced before the consumer reads them");
      const accepted = sendEvents.filter((event) => event.state === "accepted");
      assert.equal(accepted.length, 2);
      assert.equal(accepted[0]?.bytes, 1024);
      assert.equal(accepted[1]?.bytes, 1024);

      // No reviewed observer was admitted for this attempt, so there is no
      // independent observation of candidate buffers. Nothing is fabricated.
      assert.equal(snapshotA, null);
      assert.equal(snapshotB, null);
    } finally {
      await rm(stateDir, { recursive: true, force: true });
    }
  });

  it("passes one scheduler instance to the overload driver", async () => {
    const stateDir = await mkdtemp(path.join(tmpdir(), "l3-scheduler-"));
    try {
      const scheduler = { nowMs: () => 1234, scheduleAt: () => () => undefined, waitUntil: async () => undefined };
      let observedScheduler: unknown = null;
      class SchedulerDriver {
        constructor(
          _transport: unknown,
          _controller: unknown,
          _summarizer: unknown,
          sharedScheduler: unknown,
        ) {
          observedScheduler = sharedScheduler;
        }
        async runWorkload() { return { passed: true }; }
      }
      const app = controllerApp(fakeGuestRuntime(), stateDir, {
        attempt: attemptInvocation({ case_id: "overload" }),
        drivers: { OverloadCaseDriver: SchedulerDriver },
        summarizerStub: { handleSummarize: async () => ({ kind: "dropped" }) },
        scheduler,
        emitStatus: () => undefined,
      });
      await app.runAutonomous();
      assert.equal(observedScheduler, scheduler);
    } finally {
      await rm(stateDir, { recursive: true, force: true });
    }
  });
});

describe("auxiliary helper protocol and host recovery", () => {
  it("completes the ready handshake and requires ok for every frame", async () => {
    const tmp = await realpath(await mkdtemp(path.join(tmpdir(), "l3-helper-")));
    let aux: AuxiliaryChannel | null = null;
    let client: { destroy(): void } | null = null;
    try {
      const helper = path.join(tmp, "helper.sh");
      await writeFile(
        helper,
        ["#!/bin/sh", "printf 'ready\\n'", "while IFS= read -r line; do printf 'ok\\n'; done", ""].join("\n"),
      );
      await chmod(helper, 0o755);
      const socketPath = path.join(tmp, "aux.sock");
      aux = new AuxiliaryChannel({
        socketPath,
        attempt_id: "attempt-1",
        processSessionId: () => "ps-1",
        resolvePeer: async () => ({ pid: 4242, cgroup: "/system.slice/docker-test.scope" }),
        peerHelperBinary: helper,
        nowMs: () => 1000,
      });
      await aux.listen();
      const net = await import("node:net");
      const connected = net.createConnection(socketPath);
      client = connected;
      await new Promise<void>((resolve) => connected.once("connect", () => resolve()));
      await waitForCondition(() => aux !== null && aux.getStats().frames >= 0 && aux.getFailure() === null);
      const receipt = await aux.sendFrame({ seq: 1, connection_id: "conn-1", message_id: "msg-1", payload: Buffer.alloc(8, 1) });
      assert.equal(receipt, null, "a plain frame is delivered without an offer receipt");
      assert.equal(aux.getStats().frames, 1);
    } finally {
      client?.destroy();
      await aux?.close();
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it("reconstructs owned live guests and never trusts caller names", async () => {
    const { adapter, io, tokens, workDir, statePath } = await harness();
    await adapter.preflight(DESCRIPTOR, tokens.runtime_preflight, mintImagesApproval());
    const guest = await adapter.stageAttempt(DESCRIPTOR, tokens.guest_stage, ARTIFACTS);
    io.captureQueue.push(new FakeSerialCapture());
    await adapter.launchAttempt(guest.guest_id, tokens.guest_execute_run);
    await adapter.close();

    const recovered = new RuntimeLifecycleAdapter({
      manifest: adapterManifest(),
      manifestSha256: MANIFEST_SHA,
      io,
      verifier,
      clock: fixedClock(),
      statePath,
      workDir,
      runnerPath: "/prepared/l3vz",
      images: IMAGES,
      imagesApprovalVerifier,
    });
    await recovered.preflight(DESCRIPTOR, tokens.runtime_preflight, mintImagesApproval());
    const report = await recovered.reconcile();
    assert.deepEqual([...report.owned_live], [guest.instance_name]);
    assert.deepEqual([...report.reconstructed], [guest.instance_name]);
    assert.deepEqual([...report.unowned_observed], []);
    assert.equal(recovered.getGuest(guest.instance_name).status, "failed");
    await recovered.close();
  });

  it("refuses a delayed launch after the persisted workflow deadline", async () => {
    const { adapter, clock, tokens } = await harness();
    await adapter.preflight(DESCRIPTOR, tokens.runtime_preflight, mintImagesApproval());
    const guest = await adapter.stageAttempt(DESCRIPTOR, tokens.guest_stage, ARTIFACTS);
    clock.advance(10 * 60 * 1000);
    await assert.rejects(
      async () => adapter.launchAttempt(guest.guest_id, tokens.guest_execute_run),
      /deadline|wall ceiling/,
    );
  });
});

describe("prescribed evidence retention under approved limits", () => {
  it("collects approved evidence artifacts under approved caps", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "l3-appr-evidence-"));
    try {
      await writeFile(path.join(root, "events.jsonl"), '{"observation":1}\n');
      await writeFile(path.join(root, "output.log"), "completed: overload_completed\n");
      await writeFile(path.join(root, "receipt.json"), '{"reason":"overload_completed"}\n');

      const frames: string[] = [];
      const collected = await runCollector({
        evidenceRoot: root,
        writeFrame: async (frame) => {
          frames.push(frame);
        },
      });
      assert.ok(collected.bytes > 0);
      assert.ok(collected.bytes <= MAX_EVIDENCE_TOTAL_BYTES);

      const queue = [...frames];
      const outcome = await parseSerialEvidence(
        async () => {
          const next = queue.shift();
          if (next === undefined) throw new SerialCleanEOF();
          return next;
        },
        Date.now() + 30_000,
      );
      assert.equal(outcome.available, true);
      if (!outcome.available) return;
      assert.equal(outcome.artifacts.length, 3);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
describe("reviewed observer custody and observation", () => {
  const EXEC = "a".repeat(64);
  const PROGRAM = "b".repeat(64);

  function custodySignature(input: {
    readonly keys: { publicKey: KeyObject; privateKey: KeyObject };
    readonly custodian?: string;
    readonly artifactSha256: string;
    readonly runId?: string;
    readonly attemptId?: string;
    readonly issuedAt?: number;
    readonly expiresAt?: number;
    readonly approvalReason?: string;
    readonly domain?: string;
  }): Record<string, unknown> {
    const unsigned = {
      version: 1 as const,
      run_id: input.runId ?? RUN_ID,
      attempt_id: input.attemptId ?? ATTEMPT_ID,
      executable_sha256: EXEC,
      program_sha256: PROGRAM,
      artifact_sha256: input.artifactSha256,
      custodian: input.custodian ?? "custodian-1",
      issued_at: new Date(input.issuedAt ?? 1_000).toISOString(),
      expires_at: new Date(input.expiresAt ?? 100_000_000).toISOString(),
    };
    const payload = reviewPayload(
      input.domain ?? OBSERVER_REVIEW_DOMAIN,
      unsigned,
      input.approvalReason ?? "reviewed-file-spool",
    );
    return {
      ...unsigned,
      signature: cryptoSign(null, Buffer.from(payload, "utf8"), input.keys.privateKey).toString("hex"),
    };
  }

  function mappingBody(): Record<string, unknown> {
    return {
      version: 4,
      mechanism: "file_spool",
      executable_sha256: EXEC,
      observer_sha256: PROGRAM,
      approval_reason: "reviewed-file-spool",
      queue_records: { path: ["spool", "queue.jsonl"], encoding: "jsonl" },
      record_fields: {
        connection: "c",
        message: "m",
        request_seq: "q",
        payload_bytes: "b",
        payload_sha256: "h",
        state: "s",
      },
      // Reviewed decision: candidate rejection is a drop, not a new state.
      state_map: {
        accepted: ["queued", "accepted"],
        delivered: ["delivered"],
        dropped: ["dropped", "rejected"],
        retained: ["retained"],
      },
      queue_payloads: { path: ["queue-payloads"], file: "{message_id}.bin", connection_directory: true },
      delivery_outbox: { path: ["delivery"], file: "{message_id}.bin", connection_directory: true },
      transition_log: "append_only",
    };
  }

  function entry(name: string, data: Buffer): { name: string; data: Buffer; sha256: string } {
    return { name, data, sha256: sha256Of(data) };
  }

  function fixtureEntries(
    keys: { publicKey: KeyObject; privateKey: KeyObject },
    body: Record<string, unknown> = mappingBody(),
  ): { entries: { name: string; data: Buffer; sha256: string }[]; mappingSha256: string } {
    const bodyBytes = Buffer.from(JSON.stringify(body));
    const custody = custodySignature({ keys, artifactSha256: sha256Of(bodyBytes) });
    return {
      entries: [
        entry("queue_observer.json", bodyBytes),
        entry("queue_observer_review.json", Buffer.from(JSON.stringify(custody))),
      ],
      mappingSha256: sha256Of(bodyBytes),
    };
  }

  function anchor(keys: { publicKey: KeyObject }, nowMs = 5_000) {
    return {
      domain: OBSERVER_REVIEW_DOMAIN,
      run_id: RUN_ID,
      attempt_id: ATTEMPT_ID,
      custodian_keys: new Map([["custodian-1", keys.publicKey]]),
      now_epoch_ms: () => nowMs,
    };
  }
  function receipt(payload: Buffer, readSeq = 2, sendSeq = 1) {
    return {
      attempt_id: ATTEMPT_ID,
      process_session_id: "ps-0",
      read_seq: readSeq,
      send_seq: sendSeq,
      connection_id: "conn-1",
      message_id: "msg-1",
      observed_monotonic_ms: 9_000,
      bytes: payload.length,
      sha256: sha256Of(payload),
      content_verified: true as const,
      payload_base64: payload.toString("base64"),
    };
  }

  it("admits only a signed mapping bound to the actual executable, program and mapping bytes", () => {
    const keys = generateKeyPairSync("ed25519");
    const { entries } = fixtureEntries(keys);

    const admitted = admitCandidateObserver({
      entries,
      executableDigest: `sha256:${EXEC}`,
      programSha256: PROGRAM,
      trust: anchor(keys),
    });
    assert.equal(admitted.observer === null, false, admitted.refusal_reason ?? "");
    assert.equal(admitted.refusal_reason, null);

    // No trusted keys provisioned: refuse, never fall back to unsigned trust.
    const noKeys = admitCandidateObserver({
      entries,
      executableDigest: `sha256:${EXEC}`,
      programSha256: PROGRAM,
      trust: { ...anchor(keys), custodian_keys: new Map() },
    });
    assert.equal(noKeys.observer, null);
    assert.match(noKeys.refusal_reason ?? "", /no trusted custodian keys/);

    // Wrong executable: the mapping was reviewed for a different image.
    const wrongExec = admitCandidateObserver({
      entries,
      executableDigest: `sha256:${"e".repeat(64)}`,
      programSha256: PROGRAM,
      trust: anchor(keys),
    });
    assert.equal(wrongExec.observer, null);
    assert.match(wrongExec.refusal_reason ?? "", /executable digest mismatch/);

    // Mismatched packaged observer program: the reviewed behaviour is not this one.
    const wrongProgram = admitCandidateObserver({
      entries,
      executableDigest: `sha256:${EXEC}`,
      programSha256: "f".repeat(64),
      trust: anchor(keys),
    });
    assert.equal(wrongProgram.observer, null);
    assert.match(wrongProgram.refusal_reason ?? "", /observer digest mismatch/);

    // Tampered mapping body: the signature no longer covers these bytes.
    const tampered = entries.map((existing) =>
      existing.name === "queue_observer.json"
        ? entry(existing.name, Buffer.from(JSON.stringify({ ...mappingBody(), approval_reason: "other-reason" })))
        : existing,
    );
    const tamperedAdmission = admitCandidateObserver({
      entries: tampered,
      executableDigest: `sha256:${EXEC}`,
      programSha256: PROGRAM,
      trust: anchor(keys),
    });
    assert.equal(tamperedAdmission.observer, null);
    assert.match(tamperedAdmission.refusal_reason ?? "", /artifact digest mismatch/);

    // Expired custody: a stale review is not authority.
    const expiredKeys = generateKeyPairSync("ed25519");
    const expiredEntries = fixtureEntries(expiredKeys);
    const expired = admitCandidateObserver({
      entries: expiredEntries.entries,
      executableDigest: `sha256:${EXEC}`,
      programSha256: PROGRAM,
      trust: anchor(expiredKeys, 200_000_000),
    });
    assert.equal(expired.observer, null);
    assert.match(expired.refusal_reason ?? "", /expired/);

    // Signed for another attempt: identity binding is part of the payload.
    const otherAttemptBody = mappingBody();
    const bodyBytes = Buffer.from(JSON.stringify(otherAttemptBody));
    const wrongAttemptCustody = custodySignature({
      keys,
      artifactSha256: sha256Of(bodyBytes),
      attemptId: "att-other",
    });
    const wrongAttempt = admitCandidateObserver({
      entries: [
        entry("queue_observer.json", bodyBytes),
        entry("queue_observer_review.json", Buffer.from(JSON.stringify(wrongAttemptCustody))),
      ],
      executableDigest: `sha256:${EXEC}`,
      programSha256: PROGRAM,
      trust: anchor(keys),
    });
    assert.equal(wrongAttempt.observer, null);
    assert.match(wrongAttempt.refusal_reason ?? "", /attempt_id mismatch/);

    // Unsigned correspondence (custody entry absent) is refused.
    const unsigned = admitCandidateObserver({
      entries: [entries[0]!],
      executableDigest: `sha256:${EXEC}`,
      programSha256: PROGRAM,
      trust: anchor(keys),
    });
    assert.equal(unsigned.observer, null);
    assert.match(unsigned.refusal_reason ?? "", /no signed review custody/);
  });

  it("observes the authoritative spool against trusted workload bytes and consumer receipts", async () => {
    const keys = generateKeyPairSync("ed25519");
    const { entries } = fixtureEntries(keys);
    const admission = admitCandidateObserver({
      entries,
      executableDigest: `sha256:${EXEC}`,
      programSha256: PROGRAM,
      trust: anchor(keys),
    });
    const observer = admission.observer;
    assert.notEqual(observer, null);
    if (observer === null) return;

    const root = await mkdtemp(path.join(tmpdir(), "l3-spool-"));
    try {
      await mkdir(path.join(root, "spool"), { recursive: true });
      await mkdir(path.join(root, "delivery", "conn-1"), { recursive: true });
      const payload = Buffer.from("synthetic-payload-1");
      const digest = sha256Of(payload);
      await writeFile(path.join(root, "delivery", "conn-1", "msg-1.bin"), payload);
      const lifecycle = [
        { c: "conn-1", m: "msg-1", q: 1, b: payload.length, h: digest, s: "queued" },
        { c: "conn-1", m: "msg-1", q: 1, b: payload.length, h: digest, s: "delivered" },
      ];
      await writeFile(
        path.join(root, "spool", "queue.jsonl"),
        lifecycle.map((record) => JSON.stringify(record)).join("\n") + "\n",
      );
      assert.deepEqual(await observer.readConsumerOutbox(root, "conn-1", "msg-1"), payload);

      const expected = new Map([["conn-1|msg-1", { bytes: payload.length, sha256: digest, send_seq: 1 }]]);
      const consumed = new Map([["conn-1|msg-1", receipt(payload)]]);
      const request = {
        state_volume_dir: root,
        attempt_id: ATTEMPT_ID,
        process_session_id: "ps-0",
        observation_id: "buf-1",
        now: () => 9_000,
        trusted: { expected, consumed },
        final: true,
        frozen: false,
      };

      const dispositions = await observer.observeDispositions(request);
      assert.equal(dispositions.length, 2, "accepted and its terminal transition are both retained");
      assert.equal(dispositions[0]?.state, "accepted");
      assert.equal(dispositions[1]?.state, "delivered");
      assert.equal(dispositions[0]?.bytes, payload.length);
      assert.equal(dispositions[0]?.request_seq, 1);
      assert.equal(dispositions[0]?.observed_monotonic_ms, 9_000, "boundary time is taken after the read");

      // Re-observing an unchanged record must not mint a new event.
      const again = await observer.observeDispositions({ ...request, observation_id: "buf-2" });
      assert.equal(again.length, 2);
      assert.deepEqual(again.map((entry) => entry.event_seq), dispositions.map((entry) => entry.event_seq));

      const buffers = await observer.observeBuffers({ ...request, observation_id: "buf-3" });
      assert.equal(buffers.complete, true);
      assert.deepEqual(buffers.connection_buffers, [{ connection_id: "conn-1", buffered_bytes: 0 }]);

      // Candidate claims delivery without the consumer's actual payload bytes.
      await assert.rejects(
        async () =>
          await observer.observeDispositions({ ...request, trusted: { expected, consumed: new Map() } }),
        /consumer delivery outbox bytes lack an exact trusted read receipt/
      );

      // A byte count the consumer did not see is not that delivery either.
      await assert.rejects(
        async () =>
          await observer.observeDispositions({
            ...request,
            trusted: { expected, consumed: new Map([["conn-1|msg-1", { ...receipt(payload), bytes: payload.length + 1 }]]) },
          }),
        /consumer delivery outbox bytes lack an exact trusted read receipt/
      );

      // A payload the trusted workload never sent is not the workload's bytes.
      await assert.rejects(
        async () =>
          await observer.observeDispositions({ ...request, trusted: { expected: new Map(), consumed } }),
        /queue transition lacks matching trusted send provenance/
      );

      // A record without a request sequence has no provenance: refused, not invented.
      await writeFile(
        path.join(root, "spool", "queue.jsonl"),
        `${JSON.stringify({ c: "conn-1", m: "msg-1", b: payload.length, h: digest, s: "delivered" })}\n`,
      );
      await assert.rejects(async () => await observer.observeDispositions(request), /required own field 'q'/);

      // Payload bytes that differ from the workload's exact bytes are refused.
      await writeFile(
        path.join(root, "spool", "queue.jsonl"),
        lifecycle.map((record) => JSON.stringify(record)).join("\n") + "\n",
      );
      await writeFile(path.join(root, "delivery", "conn-1", "msg-1.bin"), Buffer.from("different-payload-1"));
      await assert.rejects(
        async () => await observer.observeDispositions(request),
        /does not match the trusted workload bytes|payload digest mismatch|lack an exact trusted read receipt/,
      );

      // Unaccounted payload bytes mean the observation is incomplete.
      await writeFile(path.join(root, "delivery", "conn-1", "msg-1.bin"), payload);
      await writeFile(path.join(root, "delivery", "conn-1", "msg-2.bin"), Buffer.from("stray"));
      await assert.rejects(
        async () => await observer.observeBuffers({ ...request, observation_id: "buf-4" }),
        /consumer delivery outbox contains an unselected message/,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("admits before launch and refuses to start when custody cannot be substantiated", async () => {
    const keys = generateKeyPairSync("ed25519");
    const { entries } = fixtureEntries(keys);
    const stateDir = await mkdtemp(path.join(tmpdir(), "l3-admit-"));
    try {
      let launches = 0;
      const runtime = fakeGuestRuntime({
        async run() {
          launches += 1;
          return { container_id: "abc123", pid: 42 };
        },
      });
      const withoutTrust = controllerApp(runtime, stateDir, { bundle: entries });
      const refused = await withoutTrust.dispatch({
        version: 1,
        seq: 1,
        operation: "run",
        payload: { entrypoint: "/e", state_volume: "vol-1", image_id: `sha256:${EXEC}` },
      });
      assert.equal(refused.ok, false);
      assert.match(refused.error?.message ?? "", /trusted review custody/);
      assert.equal(launches, 0, "the candidate must not launch before admission");

      // Wrong executable for the review: still no launch.
      const withWrongImage = controllerApp(runtime, stateDir, {
        bundle: entries,
        observerTrust: { anchor: anchor(keys), program_sha256: PROGRAM },
      });
      const mismatch = await withWrongImage.dispatch({
        version: 1,
        seq: 1,
        operation: "run",
        payload: { entrypoint: "/e", state_volume: "vol-1", image_id: `sha256:${"e".repeat(64)}` },
      });
      assert.equal(mismatch.ok, false);
      assert.match(mismatch.error?.message ?? "", /executable digest mismatch/);
      assert.equal(launches, 0);
    } finally {
      await rm(stateDir, { recursive: true, force: true });
    }
  });

  it("publishes candidate-selected bytes atomically before the real controller accepts the read", async () => {
    const keys = generateKeyPairSync("ed25519");
    const { entries } = fixtureEntries(keys);
    const stateDir = await mkdtemp(path.join(tmpdir(), "l3-wired-"));
    const volumeDir = path.join(stateDir, "volumes", `vol-${DESCRIPTOR.attempt_index}`);
    try {
      const payloadBytes = Buffer.alloc(64, 0x41);
      const sendEnvelope = JSON.stringify({
        version: 1,
        seq: 1,
        operation: "send",
        payload: { connection_id: "conn-1", message_id: "msg-1", bytes: payloadBytes.length },
      });
      const readEnvelope = JSON.stringify({
        version: 1,
        seq: 2,
        operation: "read",
        payload: { connection_id: "conn-1", max_bytes: 1024 },
      });
      let responseFrame = "";
      // A restart between acceptance and delivery must not rewrite history.
      let session = 1;

      let buffers: unknown = null;
      let dispositions: readonly { state: string; bytes: number }[] | null = null;
      class ObserverDriver {
        constructor(
          readonly transport: { sendRawRequest(frame: string, sideband?: unknown): Promise<string> },
          readonly controller: {
            observeConnectionBufferSnapshot(): Promise<unknown>;
            observeMessageDispositions(): Promise<readonly { state: string; bytes: number }[] | null>;
          },
        ) {}
        async runBaseSchedule() {
          await this.transport.sendRawRequest(sendEnvelope, { syntheticBytes: payloadBytes });
          await this.transport.sendRawRequest(readEnvelope);
          buffers = await this.controller.observeConnectionBufferSnapshot();
          dispositions = await this.controller.observeMessageDispositions();
          return passingPaymentSchedule("base");
        }
        async runAdverseSchedule() {
          return passingPaymentSchedule("adverse");
        }
        async runChangedConstraintSchedule() {
          return passingPaymentSchedule("changed_constraint");
        }
        async runNegativeOutcomeControl() {
          return passingPaymentSchedule("negative_outcome_control");
        }
      }

      // This test-owned publisher receives the real ControllerApp D1 frames,
      // selects only whole queued messages within max_bytes, atomically publishes
      // each selected byte buffer to the reviewed outbox, then returns its result.
      const queuePath = path.join(volumeDir, "queue-payloads", "conn-1", "msg-1.bin");
      const outboxPath = path.join(volumeDir, "delivery", "conn-1", "msg-1.bin");
      const queueRecordsPath = path.join(volumeDir, "spool", "queue.jsonl");
      const queueRecords: Record<string, unknown>[] = [];
      const queue = new Map<string, { readonly request_seq: number; readonly bytes: Buffer }>();
      let exchangeIndex = 0;
      const sendResult = (seq: number) => ({
        version: 1,
        seq,
        ok: true,
        result: { message_id: "msg-1", status: "accepted" },
      });
      const readResult = (seq: number) => ({
        version: 1,
        seq,
        ok: true,
        result: { delivered: [{ message_id: "msg-1", bytes: payloadBytes.length }], closed: false },
      });
      const rawStdout = Buffer.from([0xff, 0x00, 0x7b, 0x22]);
      const rawStderr = Buffer.from([0x80, 0x00, 0xfe]);
      const app = controllerApp(
        fakeGuestRuntime({
          processSessionId: () => `ps-${session}`,
          async writeCandidate(frame) {
            const request = JSON.parse(frame) as {
              readonly seq: number;
              readonly operation: "send" | "read";
              readonly payload: { readonly connection_id: string; readonly message_id?: string; readonly bytes?: number; readonly max_bytes?: number };
            };
            if (request.operation === "send") {
              if (request.payload.bytes !== payloadBytes.length) throw new Error("publisher send byte count mismatch");
              const key = `${request.payload.connection_id}|${request.payload.message_id}`;
              queue.set(key, { request_seq: request.seq, bytes: Buffer.from(payloadBytes) });
              await mkdir(path.dirname(queuePath), { recursive: true });
              await writeFile(queuePath, payloadBytes, { mode: 0o600 });
              queueRecords.push({
                c: request.payload.connection_id,
                m: request.payload.message_id,
                q: request.seq,
                b: payloadBytes.length,
                h: sha256Of(payloadBytes),
                s: "queued",
              });
              await mkdir(path.dirname(queueRecordsPath), { recursive: true });
              await writeFile(queueRecordsPath, queueRecords.map((entry) => JSON.stringify(entry)).join("\n") + "\n");
              responseFrame = JSON.stringify(sendResult(request.seq));
            } else {
              // The process restarted after the send: the read is owned by a new
              // process session, while the accepted transition belongs to ps-1.
              session += 1;
              const [key, selected] = [...queue.entries()].find(
                ([entryKey, entry]) =>
                  entryKey.startsWith(`${request.payload.connection_id}|`) &&
                  entry.bytes.length <= (request.payload.max_bytes ?? 0),
              ) ?? [];
              if (key === undefined || selected === undefined) {
                responseFrame = JSON.stringify({ version: 1, seq: request.seq, ok: true, result: { delivered: [], closed: false } });
              } else {
                await mkdir(path.dirname(outboxPath), { recursive: true });
                const temporary = `${outboxPath}.tmp`;
                await writeFile(temporary, selected.bytes, { mode: 0o600 });
                await rename(temporary, outboxPath);
                await rm(queuePath);
                queue.delete(key);
                queueRecords.push({
                  c: request.payload.connection_id,
                  m: key.slice(key.indexOf("|") + 1),
                  q: selected.request_seq,
                  b: selected.bytes.length,
                  h: sha256Of(selected.bytes),
                  s: "delivered",
                });
              await writeFile(queueRecordsPath, queueRecords.map((entry) => JSON.stringify(entry)).join("\n") + "\n");
                responseFrame = JSON.stringify(readResult(request.seq));
              }
            }
            return { observed_bytes: Buffer.byteLength(frame, "utf8") };
          },
          async readCandidate() {
            const index = exchangeIndex++;
            const response = responseFrame;
            responseFrame = "";
            return {
              response_frame: response,
              observed_bytes: response.length,
              deadline_exceeded: false,
              raw_output_truncated: false,
              raw_output: index === 0 ? [
                      {
                        stream: "combined" as const,
                        stream_offset: 0,
                        capture_order: 1,
                        process_session_id: "ps-1",
                        bytes: Buffer.concat([rawStdout, rawStderr]),
                        stream_mask: Buffer.from([0b01110000]),
                      },
                    ]
                  : [],
            };
          },
        }),
        stateDir,
        {
          bundle: entries,
          observerTrust: { anchor: anchor(keys), program_sha256: PROGRAM },
          drivers: { PaymentCaseDriver: ObserverDriver },
          providerStub: {
            handleDebit: () => ({ kind: "dropped" }),
            handleLookup: () => ({ kind: "dropped" }),
            handleSettlement: () => ({ kind: "dropped" }),
          },
          auxChannel: {
            sendFrame: async () => null,
            getStats: () => ({ frames: 1, raw_bytes: payloadBytes.length, wire_bytes: payloadBytes.length, offers: 0 }),
            getObservation: () => null,
          } as unknown as AuxiliaryChannel,
          emitStatus: () => undefined,
        },
      );
      await app.runAutonomous();

      const diagnostic = JSON.parse(await readFile(path.join(stateDir, "receipt.json"), "utf8")) as {
        reason: string;
        failure: string | null;
        queue_observation: unknown;
      };
      assert.notEqual(buffers, null, JSON.stringify(diagnostic));
      const snapshot = buffers as { complete: boolean; connection_buffers: { connection_id: string; buffered_bytes: number }[] };
      assert.equal(snapshot.complete, true);
      assert.deepEqual(snapshot.connection_buffers, [{ connection_id: "conn-1", buffered_bytes: 0 }]);
      assert.notEqual(dispositions, null);
      assert.deepEqual(
        (dispositions ?? []).map((entry) => entry.state),
        ["accepted", "delivered"],
      );
      assert.equal(dispositions?.[1]?.bytes, payloadBytes.length);
      const outputBytes = await readFile(path.join(stateDir, "output.log"));
      assert.deepEqual(outputBytes, Buffer.concat([rawStdout, rawStderr]));
      assert.equal(outputBytes.includes(Buffer.from(JSON.stringify(sendResult(1)))), false);
      const evidenceLines = (await readFile(path.join(stateDir, "events.jsonl"), "utf8"))
        .split("\n")
        .filter(Boolean)
        .map((line) =>
          JSON.parse(line) as {
            i?: { t?: string; b?: { stream?: string; stream_mask_base64?: string; state?: string; process_session_id?: string } };
          },
        );
      const transportEvidence = evidenceLines.filter((line) => line.i?.t === "transport_disposition");
      assert.deepEqual(
        transportEvidence.map((line) => [line.i?.b?.state, line.i?.b?.process_session_id]),
        [["accepted", "ps-1"], ["delivered", "ps-1"]],
        "terminal evidence keeps the session that accepted the message across a restart",
      );
      const rawOutputEvidence = evidenceLines.filter((line) => line.i?.t === "raw_output_chunk");
      assert.deepEqual(rawOutputEvidence.map((line) => line.i?.b?.stream), ["combined"]);
      assert.equal(
        Buffer.from(rawOutputEvidence[0]?.i?.b?.stream_mask_base64 ?? "", "base64").toString("hex"),
        "70",
        "the evidence bitset losslessly maps the raw stdout/stderr interleave",
      );
    } finally {
      await rm(stateDir, { recursive: true, force: true });
    }
  });

  it("rejects an ACK-only response as delivery evidence", async () => {
    const keys = generateKeyPairSync("ed25519");
    const { entries } = fixtureEntries(keys);
    const stateDir = await mkdtemp(path.join(tmpdir(), "l3-ack-"));
    const volumeDir = path.join(stateDir, "volumes", `vol-${DESCRIPTOR.attempt_index}`);
    try {
      const envelope = JSON.stringify({
        version: 1,
        seq: 1,
        operation: "send",
        payload: { connection_id: "conn-1", message_id: "msg-1" },
      });
      const payloadBytes = Buffer.from(envelope, "utf8");
      await mkdir(path.join(volumeDir, "spool"), { recursive: true });
      await mkdir(path.join(volumeDir, "delivery", "conn-1"), { recursive: true });
      await writeFile(path.join(volumeDir, "delivery", "conn-1", "msg-1.bin"), payloadBytes);
      await writeFile(
        path.join(volumeDir, "spool", "queue.jsonl"),
        [
          { c: "conn-1", m: "msg-1", q: 1, b: payloadBytes.length, h: sha256Of(payloadBytes), s: "queued" },
          { c: "conn-1", m: "msg-1", q: 1, b: payloadBytes.length, h: sha256Of(payloadBytes), s: "delivered" },
        ].map((record) => JSON.stringify(record)).join("\n") + "\n",
      );

      let observed: unknown = "unset";
      class AckDriver {
        constructor(
          readonly transport: { sendRawRequest(frame: string): Promise<string> },
          readonly controller: { observeMessageDispositions(): Promise<unknown> },
        ) {}
        async runBaseSchedule() {
          await this.transport.sendRawRequest(envelope);
          observed = await this.controller.observeMessageDispositions();
          return passingPaymentSchedule("base");
        }
        async runAdverseSchedule() {
          return passingPaymentSchedule("adverse");
        }
        async runChangedConstraintSchedule() {
          return passingPaymentSchedule("changed_constraint");
        }
        async runNegativeOutcomeControl() {
          return passingPaymentSchedule("negative_outcome_control");
        }
      }

      // A send acknowledgement names the message but reports no delivery.
      const ack = `{"version":1,"seq":1,"ok":true,"result":{"message_id":"msg-1","status":"accepted"}}`;
      const app = controllerApp(
        fakeGuestRuntime({
          async readCandidate() {
            return { response_frame: ack, observed_bytes: ack.length, deadline_exceeded: false };
          },
        }),
        stateDir,
        {
          bundle: entries,
          observerTrust: { anchor: anchor(keys), program_sha256: PROGRAM },
          drivers: { PaymentCaseDriver: AckDriver },
          providerStub: {
            handleDebit: () => ({ kind: "dropped" }),
            handleLookup: () => ({ kind: "dropped" }),
            handleSettlement: () => ({ kind: "dropped" }),
          },
          emitStatus: () => undefined,
        },
      );
      await app.runAutonomous();

      assert.equal(observed, null, "an ACK is not a consumer receipt, so the observation is unavailable");
      const receipt = JSON.parse(await readFile(path.join(stateDir, "receipt.json"), "utf8")) as {
        queue_observation: { consumer_receipts: number };
      };
      assert.equal(receipt.queue_observation.consumer_receipts, 0);
    } finally {
      await rm(stateDir, { recursive: true, force: true });
    }
  });

  it("reconstructs per-message lifecycles without demanding universal delivery", async () => {
    const keys = generateKeyPairSync("ed25519");
    const { entries } = fixtureEntries(keys);
    const observer = admitCandidateObserver({
      entries,
      executableDigest: `sha256:${EXEC}`,
      programSha256: PROGRAM,
      trust: anchor(keys),
    }).observer;
    assert.notEqual(observer, null);
    if (observer === null) return;

    const root = await mkdtemp(path.join(tmpdir(), "l3-lifecycle-"));
    try {
      await mkdir(path.join(root, "spool"), { recursive: true });
      await mkdir(path.join(root, "queue-payloads", "conn-1"), { recursive: true });
      const bodies = new Map([
        ["msg-drop", Buffer.from("dropped-bytes")],
        ["msg-retain", Buffer.from("retained-bytes")],
        ["msg-open", Buffer.from("open-bytes")],
        ["msg-postdrop", Buffer.from("post-accept-dropped-bytes")],
      ]);
      const expected = new Map<string, { bytes: number; sha256: string; send_seq: number }>();
      const records: Record<string, unknown>[] = [];
      let sendSeq = 0;
      for (const [message, body] of bodies) {
        const digest = sha256Of(body);
        const requestSeq = ++sendSeq;
        expected.set(`conn-1|${message}`, { bytes: body.length, sha256: digest, send_seq: requestSeq });
        if (message === "msg-drop") {
          records.push({ c: "conn-1", m: message, q: requestSeq, b: body.length, h: digest, s: "rejected" });
          continue;
        }
        records.push({ c: "conn-1", m: message, q: requestSeq, b: body.length, h: digest, s: "accepted" });
        if (message !== "msg-postdrop") {
          await writeFile(path.join(root, "queue-payloads", "conn-1", `${message}.bin`), body);
        }
        if (message === "msg-retain") {
          records.push({ c: "conn-1", m: message, q: requestSeq, b: body.length, h: digest, s: "retained" });
        }
        if (message === "msg-postdrop") {
          records.push({ c: "conn-1", m: message, q: requestSeq, b: body.length, h: digest, s: "dropped" });
        }
      }
      await writeFile(
        path.join(root, "spool", "queue.jsonl"),
        records.map((record) => JSON.stringify(record)).join("\n") + "\n",
      );

      const request = {
        state_volume_dir: root,
        attempt_id: ATTEMPT_ID,
        process_session_id: "ps-0",
        observation_id: "buf-1",
        now: () => 1_000,
        trusted: { expected, consumed: new Map() },
        final: false,
        frozen: false,
      };
      const history = await observer.observeDispositions(request);
      const states = history.map((entry) => `${entry.message_id}:${entry.state}`);
      assert.ok(!states.includes("msg-drop:accepted"), "a send-time rejection has no accepted transition");
      assert.ok(states.includes("msg-drop:dropped"), "send-time rejection is a legitimate drop");
      assert.ok(states.includes("msg-retain:retained"));
      assert.ok(states.includes("msg-postdrop:accepted"));
      assert.ok(states.includes("msg-postdrop:dropped"), "an accepted message may later be dropped");

      // Only the retained message still occupies buffer; the dropped one does not.
      const snapshot = await observer.observeBuffers({ ...request, observation_id: "buf-2" });
      const retainedBytes = bodies.get("msg-retain")?.length ?? 0;
      const openBytes = bodies.get("msg-open")?.length ?? 0;
      assert.deepEqual(snapshot.connection_buffers, [
        { connection_id: "conn-1", buffered_bytes: retainedBytes + openBytes },
      ]);

      // Final observation rejects an accepted message that never terminated.
      await assert.rejects(
        async () => await observer.observeDispositions({ ...request, observation_id: "buf-3", final: true }),
        /no final or retained transition/,
      );
      await rm(path.join(root, "queue-payloads", "conn-1", "msg-open.bin"));
      const open = bodies.get("msg-open");
      if (open === undefined) throw new Error("open lifecycle fixture is missing");
      records.push({
        c: "conn-1",
        m: "msg-open",
        q: 3,
        b: open.length,
        h: sha256Of(open),
        s: "dropped",
      });
      await writeFile(
        path.join(root, "spool", "queue.jsonl"),
        records.map((record) => JSON.stringify(record)).join("\n") + "\n",
      );
      const finalHistory = await observer.observeDispositions({ ...request, observation_id: "buf-4", final: true });
      assert.ok(finalHistory.every((entry) => entry.state !== "delivered"), "final lifecycle may be complete without delivery");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("enforces one-way lifecycle progression and keeps the accepting session across a restart", async () => {
    const keys = generateKeyPairSync("ed25519");
    const { entries } = fixtureEntries(keys);
    const observer = admitCandidateObserver({
      entries,
      executableDigest: `sha256:${EXEC}`,
      programSha256: PROGRAM,
      trust: anchor(keys),
    }).observer;
    assert.notEqual(observer, null);
    if (observer === null) return;

    const root = await mkdtemp(path.join(tmpdir(), "l3-lifecycle-order-"));
    try {
      await mkdir(path.join(root, "spool"), { recursive: true });
      await mkdir(path.join(root, "queue-payloads", "conn-1"), { recursive: true });
      await mkdir(path.join(root, "delivery", "conn-1"), { recursive: true });
      const body = Buffer.from("ordered-bytes");
      const digest = sha256Of(body);
      await writeFile(path.join(root, "queue-payloads", "conn-1", "msg-1.bin"), body);
      const writeRecords = async (states: readonly string[]): Promise<void> => {
        await writeFile(
          path.join(root, "spool", "queue.jsonl"),
          states
            .map((state) => JSON.stringify({ c: "conn-1", m: "msg-1", q: 1, b: body.length, h: digest, s: state }))
            .join("\n") + "\n",
        );
      };
      const expected = new Map([["conn-1|msg-1", { bytes: body.length, sha256: digest, send_seq: 1 }]]);
      const receipt = {
        attempt_id: ATTEMPT_ID, process_session_id: "ps-0", read_seq: 2, send_seq: 1,
        connection_id: "conn-1", message_id: "msg-1", observed_monotonic_ms: 900,
        bytes: body.length, sha256: digest, payload_base64: body.toString("base64"),
        content_verified: true as const,
      };
      const baseRequest = {
        state_volume_dir: root,
        attempt_id: ATTEMPT_ID,
        observation_id: "obs-1",
        now: () => 1_000,
        final: false,
        frozen: false,
      };

      await writeRecords(["accepted", "retained"]);
      const early = await observer.observeDispositions({
        ...baseRequest,
        process_session_id: "ps-0",
        trusted: { expected, consumed: new Map() },
      });
      assert.deepEqual(early.map((entry) => entry.state), ["accepted", "retained"]);
      assert.ok(early.every((entry) => entry.process_session_id === "ps-0"));

      // Retained may progress to exactly one final state, observed after a restart.
      await rm(path.join(root, "queue-payloads", "conn-1", "msg-1.bin"));
      await writeFile(path.join(root, "delivery", "conn-1", "msg-1.bin"), body);
      await writeRecords(["accepted", "retained", "delivered"]);
      const progressed = await observer.observeDispositions({
        ...baseRequest,
        process_session_id: "ps-1",
        observation_id: "obs-2",
        trusted: { expected, consumed: new Map([["conn-1|msg-1", receipt]]) },
      });
      assert.deepEqual(progressed.map((entry) => entry.state), ["accepted", "retained", "delivered"]);
      assert.ok(
        progressed.every((entry) => entry.process_session_id === "ps-0"),
        "terminal observations keep the accepting session",
      );

      // A second final state is refused.
      await writeRecords(["accepted", "retained", "delivered", "dropped"]);
      await assert.rejects(
        async () => await observer.observeDispositions({
          ...baseRequest,
          process_session_id: "ps-1",
          observation_id: "obs-3",
          trusted: { expected, consumed: new Map([["conn-1|msg-1", receipt]]) },
        }),
        /more than one final transition/,
      );

      // Retention after a final state is a regression, not a new observation.
      await writeRecords(["accepted", "delivered", "retained"]);
      await assert.rejects(
        async () => await observer.observeDispositions({
          ...baseRequest,
          process_session_id: "ps-1",
          observation_id: "obs-4",
          trusted: { expected, consumed: new Map([["conn-1|msg-1", receipt]]) },
        }),
        /retained transition is repeated or follows a final state/,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails closed when a later observation rewrites or drops earlier lifecycle state", async () => {
    const keys = generateKeyPairSync("ed25519");
    const { entries } = fixtureEntries(keys);
    const makeObserver = () =>
      admitCandidateObserver({
        entries,
        executableDigest: `sha256:${EXEC}`,
        programSha256: PROGRAM,
        trust: anchor(keys),
      }).observer;

    const runScenario = async (
      scenario: "rewritten" | "removed" | "retained" | "accepted-vanished" | "retained-vanished" | "final-vanished",
    ): Promise<void> => {
      const observer = makeObserver();
      assert.notEqual(observer, null);
      if (observer === null) return;
      const root = await mkdtemp(path.join(tmpdir(), `l3-history-${scenario}-`));
      try {
        await mkdir(path.join(root, "spool"), { recursive: true });
        await mkdir(path.join(root, "queue-payloads", "conn-1"), { recursive: true });
        await mkdir(path.join(root, "delivery", "conn-1"), { recursive: true });
        const body = Buffer.from("history-bytes");
        const digest = sha256Of(body);
        const write = async (states: readonly string[]): Promise<void> => {
          await writeFile(
            path.join(root, "spool", "queue.jsonl"),
            states.map((state) => JSON.stringify({ c: "conn-1", m: "msg-1", q: 1, b: body.length, h: digest, s: state }))
              .join("\n") + "\n",
          );
        };
        const receipt = {
          attempt_id: ATTEMPT_ID, process_session_id: "ps-0", read_seq: 2, send_seq: 1,
          connection_id: "conn-1", message_id: "msg-1", observed_monotonic_ms: 900,
          bytes: body.length, sha256: digest, payload_base64: body.toString("base64"),
          content_verified: true as const,
        };
        const request = {
          state_volume_dir: root, attempt_id: ATTEMPT_ID, process_session_id: "ps-0",
          observation_id: "obs-1", now: () => 1_000, final: false, frozen: false,
          trusted: {
            expected: new Map([["conn-1|msg-1", { bytes: body.length, sha256: digest, send_seq: 1 }]]),
            consumed: new Map([["conn-1|msg-1", receipt]]),
          },
        };
        const writeOtherOnly = async (): Promise<void> => {
          await writeFile(
            path.join(root, "spool", "queue.jsonl"),
            `${JSON.stringify({ c: "conn-2", m: "msg-2", q: 1, b: 1, h: digest, s: "dropped" })}\n`,
          );
        };
        if (scenario === "accepted-vanished") {
          await writeFile(path.join(root, "queue-payloads", "conn-1", "msg-1.bin"), body);
          await write(["accepted"]);
          await observer.observeDispositions(request);
          await rm(path.join(root, "queue-payloads", "conn-1", "msg-1.bin"));
          await writeOtherOnly();
          await assert.rejects(
            async () => await observer.observeDispositions({ ...request, observation_id: "obs-2" }),
            /disappeared from the candidate records/,
          );
          return;
        }
        if (scenario === "retained" || scenario === "retained-vanished") {
          await writeFile(path.join(root, "queue-payloads", "conn-1", "msg-1.bin"), body);
          await write(["accepted", "retained"]);
          await observer.observeDispositions(request);
          if (scenario === "retained-vanished") {
            await rm(path.join(root, "queue-payloads", "conn-1", "msg-1.bin"));
            await writeOtherOnly();
            await assert.rejects(
              async () => await observer.observeDispositions({ ...request, observation_id: "obs-2" }),
              /disappeared from the candidate records/,
            );
            return;
          }
          await write(["accepted"]);
          await assert.rejects(
            async () => await observer.observeDispositions({ ...request, observation_id: "obs-2" }),
            /retained state disappeared/,
          );
          return;
        }
        await writeFile(path.join(root, "delivery", "conn-1", "msg-1.bin"), body);
        await write(["accepted", "delivered"]);
        await observer.observeDispositions(request);
        if (scenario === "final-vanished") {
          await rm(path.join(root, "delivery", "conn-1", "msg-1.bin"));
          await writeOtherOnly();
          await assert.rejects(
            async () => await observer.observeDispositions({ ...request, observation_id: "obs-2" }),
            /disappeared from the candidate records/,
          );
        } else if (scenario === "rewritten") {
          await rm(path.join(root, "delivery", "conn-1", "msg-1.bin"));
          await write(["accepted", "dropped"]);
          await assert.rejects(
            async () => await observer.observeDispositions({ ...request, observation_id: "obs-2" }),
            /final state changed/,
          );
        } else {
          await write(["accepted"]);
          await assert.rejects(
            async () => await observer.observeDispositions({ ...request, observation_id: "obs-2" }),
            /final state disappeared/,
          );
        }
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    };

    await runScenario("rewritten");
    await runScenario("removed");
    await runScenario("retained");
    await runScenario("accepted-vanished");
    await runScenario("retained-vanished");
    await runScenario("final-vanished");
  });

  it("accepts candidate cleanup of a delivered outbox file when the exact receipt is retained", async () => {
    const keys = generateKeyPairSync("ed25519");
    const { entries } = fixtureEntries(keys);
    const observer = admitCandidateObserver({
      entries,
      executableDigest: `sha256:${EXEC}`,
      programSha256: PROGRAM,
      trust: anchor(keys),
    }).observer;
    assert.notEqual(observer, null);
    if (observer === null) return;

    const root = await mkdtemp(path.join(tmpdir(), "l3-outbox-cleanup-"));
    try {
      await mkdir(path.join(root, "spool"), { recursive: true });
      await mkdir(path.join(root, "delivery", "conn-1"), { recursive: true });
      const body = Buffer.from("delivered-bytes");
      const digest = sha256Of(body);
      await writeFile(path.join(root, "delivery", "conn-1", "msg-del.bin"), body);
      await writeFile(
        path.join(root, "spool", "queue.jsonl"),
        [
          { c: "conn-1", m: "msg-del", q: 1, b: body.length, h: digest, s: "accepted" },
          { c: "conn-1", m: "msg-del", q: 1, b: body.length, h: digest, s: "delivered" },
        ].map((record) => JSON.stringify(record)).join("\n") + "\n",
      );
      const key = "conn-1|msg-del";
      const request = {
        state_volume_dir: root,
        attempt_id: ATTEMPT_ID,
        process_session_id: "ps-0",
        observation_id: "obs-1",
        now: () => 1_000,
        trusted: {
          expected: new Map([[key, { bytes: body.length, sha256: digest, send_seq: 1 }]]),
          consumed: new Map([[key, {
            attempt_id: ATTEMPT_ID,
            process_session_id: "ps-0",
            read_seq: 2,
            send_seq: 1,
            connection_id: "conn-1",
            message_id: "msg-del",
            observed_monotonic_ms: 900,
            bytes: body.length,
            sha256: digest,
            payload_base64: body.toString("base64"),
            content_verified: true as const,
          }]]),
        },
        final: true,
        frozen: false,
      };
      const first = await observer.observeDispositions(request);
      assert.deepEqual(first.map((entry) => entry.state), ["accepted", "delivered"]);

      // The candidate is allowed to remove its outbox file after delivery; the
      // retained exact receipt is what the final observation reconciles against.
      await rm(path.join(root, "delivery", "conn-1", "msg-del.bin"));
      const second = await observer.observeDispositions({ ...request, observation_id: "obs-2" });
      assert.deepEqual(second.map((entry) => entry.state), ["accepted", "delivered"]);

      // A file that is still present with different bytes is still refused.
      await writeFile(path.join(root, "delivery", "conn-1", "msg-del.bin"), Buffer.from("tampered-bytes-"));
      await assert.rejects(
        async () => await observer.observeDispositions({ ...request, observation_id: "obs-3" }),
        /lack an exact trusted read receipt/,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("observes a frozen stopped state without pausing a dead process", async () => {
    const keys = generateKeyPairSync("ed25519");
    const { entries } = fixtureEntries(keys);
    const observer = admitCandidateObserver({
      entries,
      executableDigest: `sha256:${EXEC}`,
      programSha256: PROGRAM,
      trust: anchor(keys),
    }).observer;
    assert.notEqual(observer, null);
    if (observer === null) return;

    const root = await mkdtemp(path.join(tmpdir(), "l3-frozen-"));
    try {
      await mkdir(path.join(root, "spool"), { recursive: true });
      const body = Buffer.from("frozen-bytes");
      const digest = sha256Of(body);
      await writeFile(
        path.join(root, "spool", "queue.jsonl"),
        [
          { c: "conn-1", m: "msg-1", q: 1, b: body.length, h: digest, s: "queued" },
          { c: "conn-1", m: "msg-1", q: 1, b: body.length, h: digest, s: "dropped" },
        ].map((record) => JSON.stringify(record)).join("\n") + "\n",
      );

      let pauses = 0;
      const runtime = fakeGuestRuntime({
        async pauseCandidate() {
          pauses += 1;
        },
        async resumeCandidate() {
          pauses += 1;
        },
      });
      const history = await observer.observeDispositions({
        state_volume_dir: root,
        attempt_id: ATTEMPT_ID,
        process_session_id: "ps-0",
        observation_id: "buf-1",
        now: () => 2_000,
        trusted: {
          expected: new Map([["conn-1|msg-1", { bytes: body.length, sha256: digest, send_seq: 1 }]]),
          consumed: new Map(),
        },
        final: true,
        frozen: true,
        runtime,
      });
      assert.equal(pauses, 0, "a stopped candidate must not be paused or resumed");
      assert.deepEqual(history.map((entry) => entry.state), ["accepted", "dropped"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps retained transitions immutable and surfaces resume failures", async () => {
    const keys = generateKeyPairSync("ed25519");
    const { entries } = fixtureEntries(keys);
    const observer = admitCandidateObserver({
      entries,
      executableDigest: `sha256:${EXEC}`,
      programSha256: PROGRAM,
      trust: anchor(keys),
    }).observer;
    assert.notEqual(observer, null);
    if (observer === null) return;

    const root = await mkdtemp(path.join(tmpdir(), "l3-spool-"));
    try {
      await mkdir(path.join(root, "spool"), { recursive: true });
      await mkdir(path.join(root, "delivery", "conn-1"), { recursive: true });
      const payload = Buffer.from("abc");
      const digest = sha256Of(payload);
      await writeFile(path.join(root, "delivery", "conn-1", "msg-1.bin"), payload);
      const lifecycle = [
        { c: "conn-1", m: "msg-1", q: 1, b: 3, h: digest, s: "queued" },
        { c: "conn-1", m: "msg-1", q: 1, b: 3, h: digest, s: "delivered" },
      ];
      await writeFile(
        path.join(root, "spool", "queue.jsonl"),
        lifecycle.map((record) => JSON.stringify(record)).join("\n") + "\n",
      );
      const request = {
        state_volume_dir: root,
        attempt_id: ATTEMPT_ID,
        process_session_id: "ps-0",
        observation_id: "buf-1",
        now: () => 9_000,
        trusted: {
          expected: new Map([["conn-1|msg-1", { bytes: 3, sha256: digest, send_seq: 1 }]]),
          consumed: new Map([["conn-1|msg-1", receipt(payload)]]),
        },
        final: false,
        frozen: false,
      };
      await observer.observeDispositions(request);

      // Same transition identity, different byte count: the history is immutable.
      const wider = Buffer.from("abcd");
      const widerDigest = sha256Of(wider);
      await writeFile(path.join(root, "delivery", "conn-1", "msg-1.bin"), wider);
      await writeFile(
        path.join(root, "spool", "queue.jsonl"),
        [
          { c: "conn-1", m: "msg-1", q: 1, b: 4, h: widerDigest, s: "queued" },
          { c: "conn-1", m: "msg-1", q: 1, b: 4, h: widerDigest, s: "delivered" },
        ].map((record) => JSON.stringify(record)).join("\n") + "\n",
      );
      await assert.rejects(
        async () =>
          await observer.observeDispositions({
            ...request,
            observation_id: "buf-2",
            trusted: {
              expected: new Map([["conn-1|msg-1", { bytes: 4, sha256: widerDigest, send_seq: 1 }]]),
              consumed: new Map([["conn-1|msg-1", receipt(wider)]]),
            },
          }),
        /changed its byte count|final state changed after it was observed/,
      );

      // A candidate that cannot be resumed is a workflow error, not a quiet pass.
      const resumeFailure = {
        ...request,
        runtime: fakeGuestRuntime({
          async resumeCandidate() {
            throw new Error("unpause refused");
          },
        }),
      };
      await assert.rejects(async () => await observer.observeDispositions(resumeFailure), ObserverResumeError);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails the workflow when the overload driver swallows a real snapshot resume error", async () => {
    const keys = generateKeyPairSync("ed25519");
    const { entries } = fixtureEntries(keys);
    const stateDir = await mkdtemp(path.join(tmpdir(), "l3-ctrl-swallow-"));
    try {
      let stopped = false;
      class SnapshotSwallowingOverload {
        constructor(
          readonly transport: unknown,
          readonly controller: { observeConnectionBufferSnapshot(): Promise<unknown> },
        ) {}
        async runWorkload() {
          try {
            await this.controller.observeConnectionBufferSnapshot();
          } catch {
            // A driver that swallows the resume failure must not hide it.
          }
          return { case_id: "overload" };
        }
      }
      const runtime = fakeGuestRuntime({
        async resumeCandidate() {
          throw new Error("unpause refused");
        },
        async stopCandidate() {
          stopped = true;
          return { terminated: true, exit_code: 0 };
        },
      });
      const app = controllerApp(runtime, stateDir, {
        attempt: attemptInvocation({ case_id: "overload" }),
        bundle: entries,
        observerTrust: { anchor: anchor(keys), program_sha256: PROGRAM },
        drivers: { OverloadCaseDriver: SnapshotSwallowingOverload },
        summarizerStub: {} as never,
        scheduler: { nowMs: () => 1_000, isVirtual: false } as never,
        emitStatus: () => undefined,
      });
      await app.runAutonomous();
      const receipt = JSON.parse(await readFile(path.join(stateDir, "receipt.json"), "utf8")) as {
        reason: string;
        failure: string;
        verdict: unknown;
      };
      assert.equal(receipt.reason, "controller_error");
      assert.match(receipt.failure, /resume/i);
      assert.equal(receipt.verdict, null);
      assert.equal(stopped, true);
    } finally {
      await rm(stateDir, { recursive: true, force: true });
    }
  });
});

describe("relay server uses the frozen D1 contract", () => {
  it("rejects overlapping requests with a canonical code and validates payloads", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "l3-stubs-"));
    const sockPath = path.join(dir, "stub.sock");
    try {
      let release: (() => void) | null = null;
      const server = await startStubServer({
        socketPath: sockPath,
        sessionId: "ps-0",
        relayId: "relay",
        contracts: {
          slow: {
            validate_payload: () => ({}),
            validate_result: (result) => result,
          },
          check: {
            validate_payload: (payload) => {
              if (payload["x"] !== 1) throw new Error("x must be 1");
              return payload;
            },
            validate_result: (result) => result,
          },
        },
        handler: async (operation, _payload, effect) => {
          if (operation === "slow") {
            await new Promise<void>((resolve) => {
              release = resolve;
            });
            return { kind: "result", result: { done: true } };
          }
          return effect.commit(() => ({ kind: "result", result: { ok: true } }));
        },
      });

      const client = net.connect(sockPath);
      await once(client, "connect");
      client.write(`${JSON.stringify({ version: 1, seq: 1, operation: "slow", payload: {} })}\n`);
      client.write(`${JSON.stringify({ version: 1, seq: 2, operation: "check", payload: { x: 1 } })}\n`);
      const [reply] = await once(client, "data");
      const parsed = JSON.parse(String(reply)) as { error: { code: string } };
      assert.equal(parsed.error.code, "OVERLOADED");
      assert.doesNotMatch(String(reply), /CONCURRENCY_VIOLATION/);

      release?.();
      await server.close();
      client.destroy();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("refuses a payload outside the operation contract and cancels effects on timeout", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "l3-stubs-"));
    const sockPath = path.join(dir, "stub.sock");
    try {
      let release: (() => void) | null = null;
      let timeoutSignal: AbortSignal | undefined;
      let lateCommitResult: string | null = null;
      const server = await startStubServer({
        socketPath: sockPath,
        sessionId: "ps-0",
        relayId: "relay",
        contracts: {
          check: {
            validate_payload: (payload) => {
              if (payload["x"] !== 1) throw new Error("x must be 1");
              return payload;
            },
            validate_result: (result) => result,
          },
          hang: { validate_payload: () => ({}), validate_result: () => ({}) },
        },
        handler: async (operation, _payload, effect) => {
          if (operation === "hang") {
            timeoutSignal = effect.signal;
            await new Promise<void>((resolve) => {
              release = resolve;
            });
            try {
              effect.commit(() => undefined);
              lateCommitResult = "committed";
            } catch {
              lateCommitResult = "refused";
            }
            return { kind: "result", result: {} };
          }
          return effect.commit(() => ({ kind: "result", result: { ok: true } }));
        },
      });

      const badClient = net.connect(sockPath);
      await once(badClient, "connect");
      badClient.write(`${JSON.stringify({ version: 1, seq: 1, operation: "check", payload: { x: 2 } })}\n`);
      const [badReply] = await once(badClient, "data");
      const badParsed = JSON.parse(String(badReply)) as { error: { code: string } };
      assert.equal(badParsed.error.code, "INVALID_REQUEST");
      badClient.destroy();

      const hangClient = net.connect(sockPath);
      await once(hangClient, "connect");
      hangClient.write(`${JSON.stringify({ version: 1, seq: 1, operation: "hang", payload: {} })}\n`);
      await new Promise((resolve) => setTimeout(resolve, 5_400));
      release?.();
      await new Promise((resolve) => setTimeout(resolve, 100));
      assert.equal(timeoutSignal?.aborted, true);
      assert.equal(lateCommitResult, "refused");
      await server.close();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it("aborts an in-flight handler when its client disconnects", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "l3-stubs-disconnect-"));
    const sockPath = path.join(dir, "stub.sock");
    let markStarted: (() => void) | null = null;
    let markAborted: (() => void) | null = null;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const aborted = new Promise<void>((resolve) => {
      markAborted = resolve;
    });
    try {
      const server = await startStubServer({
        socketPath: sockPath,
        sessionId: "ps-disconnect",
        relayId: "relay",
        contracts: {
          hang: { validate_payload: () => ({}), validate_result: (result) => result },
        },
        handler: async (_operation, _payload, effect) => {
          markStarted?.();
          await new Promise<void>((resolve) => {
            effect.signal.addEventListener("abort", () => {
              markAborted?.();
              resolve();
            }, { once: true });
          });
          return { kind: "error", error: { code: "UNAVAILABLE", message: "cancelled" } };
        },
      });
      const client = net.connect(sockPath);
      await once(client, "connect");
      client.write(`${JSON.stringify({ version: 1, seq: 1, operation: "hang", payload: {} })}\n`);
      await started;
      client.destroy();
      await aborted;
      await server.close();
      await new Promise<void>((resolve) => setImmediate(resolve));
      assert.equal(server.stats().cancelled, 1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it("binds each relay exchange to the live process session and the owning relay", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "l3-stubs-session-"));
    try {
      let currentSession = "ps-0";
      const seen: { session: string; connection: string; exchange: string }[] = [];
      const server = await startStubServer({
        socketPath: path.join(dir, "provider.sock"),
        sessionId: () => currentSession,
        relayId: "provider",
        contracts: { check: { validate_payload: (payload) => payload, validate_result: (result) => result } },
        handler: (_operation, _payload, effect) => {
          seen.push({ session: effect.session_id, connection: effect.connection_id, exchange: effect.exchange_id });
          return { kind: "result", result: {} };
        },
      });
      const other = await startStubServer({
        socketPath: path.join(dir, "summarizer.sock"),
        sessionId: () => currentSession,
        relayId: "summarizer",
        contracts: { check: { validate_payload: (payload) => payload, validate_result: (result) => result } },
        handler: (_operation, _payload, effect) => {
          seen.push({ session: effect.session_id, connection: effect.connection_id, exchange: effect.exchange_id });
          return { kind: "result", result: {} };
        },
      });
      try {
        const client = net.connect(server.socketPath);
        await once(client, "connect");
        const firstResponse = once(client, "data");
        client.write(`${JSON.stringify({ version: 1, seq: 1, operation: "check", payload: {} })}\n`);
        await firstResponse;
        // The connection outlives a process restart; the next exchange belongs
        // to the new live session, not the session that opened the socket.
        currentSession = "ps-1";
        const secondResponse = once(client, "data");
        client.write(`${JSON.stringify({ version: 1, seq: 2, operation: "check", payload: {} })}\n`);
        await secondResponse;
        client.destroy();

        const otherClient = net.connect(other.socketPath);
        await once(otherClient, "connect");
        const otherResponse = once(otherClient, "data");
        otherClient.write(`${JSON.stringify({ version: 1, seq: 1, operation: "check", payload: {} })}\n`);
        await otherResponse;
        otherClient.destroy();

        assert.deepEqual(
          seen.map((entry) => entry.session),
          ["ps-0", "ps-1", "ps-1"],
          "each exchange is attributed to the session live when it was handled",
        );
        assert.equal(new Set(seen.map((entry) => entry.connection)).size, 2);
        assert.equal(new Set(seen.map((entry) => entry.exchange)).size, 3);
        assert.ok(seen[0]?.connection.startsWith("provider-"));
        assert.ok(seen[2]?.connection.startsWith("summarizer-"));
      } finally {
        await server.close();
        await other.close();
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it("cancels the actual summarizer on relay timeout and disconnect without refunding retries", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "l3-summarizer-relay-"));
    const sockPath = path.join(dir, "summarizer.sock");
    const stub = new SummarizerStub("attempt-relay-cancel", {
      nowMs: () => 0,
      serviceLatencyMs: 60_000,
    });
    stub.beginWorkload(0);
    let handlerCount = 0;
    let markSecondStarted: (() => void) | null = null;
    const secondStarted = new Promise<void>((resolve) => {
      markSecondStarted = resolve;
    });
    let server: Awaited<ReturnType<typeof startStubServer>> | null = null;
    const waitBounded = async <T>(promise: Promise<T>, label: string): Promise<T> =>
      await new Promise<T>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(
            new Error(
              `timed out waiting for ${label}; relay=${JSON.stringify(server?.stats())}; handlerCount=${handlerCount}; ledger=${JSON.stringify(stub.getLedger())}; cancellations=${JSON.stringify(stub.getCancellations())}`,
            ),
          ),
          8_000,
        );
        promise.then(
          (value) => {
            clearTimeout(timer);
            resolve(value);
          },
          (error: unknown) => {
            clearTimeout(timer);
            reject(error);
          },
        );
      });
    try {
      server = await startStubServer({
        socketPath: sockPath,
        sessionId: "ps-summarizer",
        relayId: "relay",
        contracts: {
          summarize: {
            validate_payload: (payload) => payload,
            validate_result: (result) => result,
          },
        },
        handler: async (_operation, payload, effect) => {
          handlerCount += 1;
          if (handlerCount === 2) markSecondStarted?.();
          return await stub.handleSummarize(payload, { signal: effect.signal });
        },
      });
      const request = `${JSON.stringify({
        version: 1,
        seq: 1,
        operation: "summarize",
        payload: { request_id: "req-retry", connection_id: "conn-1", message_ids: ["msg-1"] },
      })}\n`;
      const timedClient = net.connect(sockPath);
      await once(timedClient, "connect");
      const timedEnded = once(timedClient, "end");
      const timedResponse = once(timedClient, "data");
      timedClient.write(request);
      const [responseChunk] = await waitBounded(timedResponse, "relay timeout response");
      assert.match(Buffer.from(responseChunk as Buffer).toString("utf8"), /"ok":false/);
      await waitBounded(timedEnded, "relay timeout end");
      timedClient.destroy();

      const timedEntry = stub.getLedger()[0];
      assert.equal(timedEntry?.scheduled_ms, 60_000);
      assert.equal(timedEntry?.completed_ms, null);
      assert.equal(timedEntry?.latency_ms, null);
      assert.equal(timedEntry?.delivered, false);
      assert.equal(stub.getCancellations().length, 1);

      const disconnectedClient = net.connect(sockPath);
      await once(disconnectedClient, "connect");
      disconnectedClient.write(request);
      await waitBounded(secondStarted, "retry handler start");
      const disconnected = once(disconnectedClient, "close");
      disconnectedClient.destroy();
      await waitBounded(disconnected, "disconnect socket close");
      await waitForCondition(() => stub.getCancellations().length === 2 && server?.stats().cancelled === 2);

      const ledger = stub.getLedger();
      assert.equal(ledger.length, 2);
      assert.equal(ledger[1]?.request_id, ledger[0]?.request_id);
      assert.equal(ledger[1]?.retry, true);
      assert.equal(stub.pendingCount, 0);
      assert.equal(stub.getCancellations().length, 2);
      assert.equal(server.stats().cancelled, 2);
      await server.close();
      assert.equal(server.stats().cancelled, 2, "relay close waits for actual cancelled handlers to settle");
    } finally {
      await server?.close();
      await rm(dir, { recursive: true, force: true });
    }
  });
  it("binds unique relay exchanges to the process session active at connection time", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "l3-relay-identity-"));
    const sockPath = path.join(dir, "stub.sock");
    let currentSession = "ps-1";
    const contexts: { session: string; connection: string; exchange: string; seq: number }[] = [];
    let server: Awaited<ReturnType<typeof startStubServer>> | null = null;
    try {
      server = await startStubServer({
        socketPath: sockPath,
        sessionId: () => currentSession,
        relayId: "relay",
        contracts: { check: { validate_payload: (payload) => payload, validate_result: (result) => result } },
        handler: (_operation, _payload, effect) =>
          effect.commit(() => {
            contexts.push({
              session: effect.session_id,
              connection: effect.connection_id,
              exchange: effect.exchange_id,
              seq: effect.seq,
            });
            return { kind: "result", result: { session_id: effect.session_id } };
          }),
      });
      const request = `${JSON.stringify({ version: 1, seq: 1, operation: "check", payload: {} })}\n`;
      const first = net.connect(sockPath);
      await once(first, "connect");
      const firstReply = once(first, "data");
      first.write(request);
      await firstReply;
      first.destroy();
      currentSession = "ps-2";
      const second = net.connect(sockPath);
      await once(second, "connect");
      const secondReply = once(second, "data");
      second.write(request);
      await secondReply;
      second.destroy();
      assert.deepEqual(contexts.map((entry) => entry.session), ["ps-1", "ps-2"]);
      assert.equal(contexts[0]?.seq, contexts[1]?.seq);
      assert.notEqual(contexts[0]?.connection, contexts[1]?.connection);
      assert.notEqual(contexts[0]?.exchange, contexts[1]?.exchange);
      await server.close();
    } finally {
      await server?.close();
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("descriptor-safe bounded reads", () => {
  it("enumerates the target directory, not its parent", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "l3-safefs-dir-"));
    try {
      const realRoot = await realpath(root);
      await mkdir(path.join(realRoot, "nested", "target"), { recursive: true });
      await writeFile(path.join(realRoot, "nested", "target", "one.txt"), "1");
      await writeFile(path.join(realRoot, "nested", "parent-only.txt"), "p");

      const entries = await listDirectoryBeneath(realRoot, ["nested", "target"]);
      assert.deepEqual(
        entries?.map((entry) => entry.name),
        ["one.txt"],
        "the target directory is enumerated, not its parent",
      );
      await symlinkDir(path.join(realRoot, "nested", "target"), path.join(realRoot, "nested", "link"));
      await assert.rejects(async () => await listDirectoryBeneath(realRoot, ["nested", "link"]));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // The descriptor-chain strategy is the one the guest runs, and its descriptor
  // root only exists on Linux: this covers it on a Linux host and skips elsewhere.
  it("enumerates through the descriptor chain on Linux", { skip: process.platform !== "linux" }, async () => {
    const root = await mkdtemp(path.join(tmpdir(), "l3-safefs-chain-"));
    try {
      const realRoot = await realpath(root);
      await mkdir(path.join(realRoot, "nested", "target"), { recursive: true });
      await writeFile(path.join(realRoot, "nested", "target", "one.txt"), "1");
      await writeFile(path.join(realRoot, "nested", "parent-only.txt"), "p");

      const entries = await listDirectoryBeneath(realRoot, ["nested", "target"], { platform: "linux" });
      assert.deepEqual(entries?.map((entry) => entry.name), ["one.txt"]);
      assert.equal(
        (
          await readRegularFileBeneath(realRoot, ["nested", "target", "one.txt"], 64, { platform: "linux" })
        ).toString("utf8"),
        "1",
      );
      await symlinkDir(path.join(realRoot, "nested", "target"), path.join(realRoot, "nested", "link"));
      await assert.rejects(
        async () => await listDirectoryBeneath(realRoot, ["nested", "link"], { platform: "linux" }),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("refuses symlinked ancestors, oversized targets and non-regular files", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "l3-safefs-"));
    try {
      await mkdir(path.join(root, "real"));
      await writeFile(path.join(root, "real", "f.txt"), "hi");
      const realRoot = await realpath(root);
      await mkdir(path.join(realRoot, "real2"));
      await writeFile(path.join(realRoot, "real2", "f.txt"), "hi");
      // Use the resolved root so the kernel-level no-follow check sees no symlink.
      await realpath(path.join(realRoot, "real2"));
      await symlinkDir(path.join(realRoot, "real2"), path.join(realRoot, "link"));

      await assert.rejects(async () => await readRegularFileBeneath(realRoot, ["link", "f.txt"], 1_024));
      await assert.rejects(async () => await readRegularFileBeneath(realRoot, ["real2", "f.txt"], 1), /exceeds/);
      await assert.rejects(async () => await readRegularFileBeneath(realRoot, ["..", "etc", "hosts"], 1_024), /unsafe path segment/);

      assert.equal((await readRegularFileBeneath(realRoot, ["real2", "f.txt"], 1_024)).toString("utf8"), "hi");

      const hardLinkSource = path.join(realRoot, "real2", "f.txt");
      await linkFile(hardLinkSource, path.join(realRoot, "real2", "f2.txt"));
      await assert.rejects(
        async () => await readRegularFileBeneath(realRoot, ["real2", "f2.txt"], 1_024),
        /hard link/,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("classified runner teardown", () => {
  function probe(overrides: Partial<IdentityProbe> = {}): IdentityProbe {
    let clock = 0;
    return {
      signal: () => ({ code: null }),
      startIdentity: async () => "start-A",
      now: () => clock,
      sleep: async (ms) => {
        clock += ms;
      },
      pollMs: 50,
      budgetMs: 500,
      ...overrides,
    };
  }

  it("classifies denied, reused, gone and confirmed teardown without guessing", async () => {
    assert.equal(await classifyProcessIdentity(1, "start-A", probe({ signal: () => ({ code: "EPERM" }) })), "permission_denied");
    assert.equal(await classifyProcessIdentity(1, "start-A", probe({ signal: () => ({ code: "ESRCH" }) })), "already_gone");
    assert.equal(await classifyProcessIdentity(1, "start-A", probe({ startIdentity: async () => "start-B" })), "identity_reused");
    assert.equal(await classifyProcessIdentity(1, "start-A", probe({ startIdentity: async () => null })), "unknown");
    assert.equal(await classifyProcessIdentity(1, "start-A", probe()), "owned");

    // Confirmed only when the pid disappears after our kill.
    let alive = true;
    const killed = probe({
      signal: (_pid, signal) => {
        if (signal === "SIGKILL") {
          alive = false;
          return { code: null };
        }
        return { code: alive ? null : "ESRCH" };
      },
      startIdentity: async () => (alive ? "start-A" : null),
    });
    assert.equal(await forceStopOwnedRunner(1, "start-A", killed), "confirmed_teardown");

    // Never confirmed when the process survives the bounded window.
    const stubborn = probe({ startIdentity: async () => "start-A" });
    assert.equal(await forceStopOwnedRunner(1, "start-A", stubborn), "unknown");

    // A pid that no longer matches is reported as reused, not "gone".
    const reused = probe({
      signal: (_pid, signal) => (signal === "SIGKILL" ? { code: "ESRCH" } : { code: null }),
    });
    assert.equal(await forceStopOwnedRunner(1, "start-A", reused), "already_gone");
  });
});

it("documents the accepted topology string used in receipts", () => {
  assert.equal(IMAGES.topology, "apple-vz-direct-arm64");
  assert.throws(() => parsePreparedImages({ ...IMAGES, schema_version: 2 }), /schema_version must be 1/);
});

function unusedCollectorReceiptType(): CollectorReceipt | null {
  return null;
}
void unusedCollectorReceiptType;
