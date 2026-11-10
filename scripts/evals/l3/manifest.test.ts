import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { execFileSync } from "node:child_process";

import {
  createValidManifestFixture,
  FIXTURE_NOW_MS,
} from "./test-fixtures";
import {
  ATTEMPT_ORDER_ALGORITHM,
  MAX_CONSECUTIVE_SAME_ARM,
  MAX_CONSECUTIVE_SAME_CASE,
  buildAttemptSequence,
  probeDescriptorAnchoredTraversal,
  validateManifestFilesystem,
  validateManifestStructure,
  type FilesystemIsolation,
  type L3Manifest,
} from "./manifest";

const CLOCK = () => FIXTURE_NOW_MS;
const TRUSTED_ISOLATION: FilesystemIsolation = {
  kind: "trusted-staging-boundary",
  controller_assertion: "immutable-non-attacker-writable",
};

function sha256Of(content: Buffer): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

test("SRS-001: valid frozen manifest is admitted and malformed top-level fields are rejected", () => {
  const valid = createValidManifestFixture();
  const parsed = validateManifestStructure(valid, { now: CLOCK });
  assert.equal(parsed.protocol, "artifact-v1");
  assert.equal(parsed.attempt_plan.starts_at, "2030-01-01T00:00:00.000Z");

  assert.throws(() => validateManifestStructure({ ...valid, schema_version: 2 }, { now: CLOCK }), /schema_version/i);
  assert.throws(() => validateManifestStructure({ ...valid, protocol: "transcript-v1" }, { now: CLOCK }), /protocol/i);
  assert.throws(() => validateManifestStructure({ ...valid, run_id: "-bad" }, { now: CLOCK }), /run_id/i);

  const missingGrant: Record<string, unknown> = { ...valid };
  delete missingGrant["approval_binding"];
  assert.throws(() => validateManifestStructure(missingGrant, { now: CLOCK }), /Missing required own field 'approval_binding'/i);

  assert.throws(
    () =>
      validateManifestStructure(
        { ...valid, runtime_policy: { ...valid.runtime_policy, arbitrary_flag: "--privileged" } },
        { now: CLOCK }
      ),
    /Unknown extra field 'arbitrary_flag'/i
  );

  // Inherited members never satisfy a required field.
  const prototypeBacked = Object.create(valid) as unknown;
  assert.throws(() => validateManifestStructure(prototypeBacked, { now: CLOCK }), /plain object/i);
});

test("SRS-001: approval window is checked against the injected trusted clock only", () => {
  const valid = createValidManifestFixture();
  validateManifestStructure(valid, { now: CLOCK });

  // Plan end earlier than the grant: the grant must cover the whole window.
  assert.throws(
    () =>
      validateManifestStructure(
        { ...valid, approval_binding: { ...valid.approval_binding, expiry: "2030-01-01T00:30:00.000Z" } },
        { now: CLOCK }
      ),
    /cannot be before/i
  );
  // Non-canonical and non-calendar timestamps.
  for (const bad of ["2030-01-02T00:00:00Z", "2030-01-02", "2030-02-30T00:00:00.000Z", "not-a-date"]) {
    assert.throws(
      () =>
        validateManifestStructure(
          { ...valid, approval_binding: { ...valid.approval_binding, expiry: bad } },
          { now: CLOCK }
        ),
      /canonical UTC|calendar instant/i,
      `expected ${bad} to be rejected`
    );
  }
  // A trusted clock returning garbage fails closed rather than defaulting.
  assert.throws(
    () => validateManifestStructure(valid, { now: () => Number.NaN }),
    /trusted clock|finite/i
  );
});

test("SRS-001: an ended attempt window is rejected even while the grant is current", () => {
  const valid = createValidManifestFixture();
  // ends_at = 2030-01-01T01:30:00.000Z, grant expiry = 2030-01-02T00:00:00.000Z.

  // Window already over, grant still current: must still be rejected.
  assert.throws(
    () => validateManifestStructure(valid, { now: () => Date.parse("2030-01-01T12:00:00.000Z") }),
    /not in the future/i
  );

  // Equality boundary: the end instant itself is a closed window.
  assert.throws(
    () => validateManifestStructure(valid, { now: () => Date.parse("2030-01-01T01:30:00.000Z") }),
    /not in the future/i
  );

  // One millisecond before the end remains admissible.
  validateManifestStructure(valid, { now: () => Date.parse("2030-01-01T01:29:59.999Z") });

  // A future window is structurally fine; D2 enforces start/end at execution.
  validateManifestStructure(valid, { now: () => Date.parse("2029-12-31T23:00:00.000Z") });
});

test("SRS-001: runtime policy enforces fixed SRS ceilings, mount identity and version strings", () => {
  const valid = createValidManifestFixture();
  const withRuntime = (patch: Record<string, unknown>) =>
    ({ ...valid, runtime_policy: { ...valid.runtime_policy, ...patch } }) as unknown;

  assert.throws(() => validateManifestStructure(withRuntime({ image_digest: "sha256:invalidhex" }), { now: CLOCK }), /image_digest/i);
  assert.throws(() => validateManifestStructure(withRuntime({ image_digest: "ba7816bf" }), { now: CLOCK }), /image_digest/i);
  assert.throws(
    () => validateManifestStructure(withRuntime({ permissible_mounts: ["/Users/admin"] }), { now: CLOCK }),
    /Forbidden mount identity/i
  );
  assert.throws(
    () => validateManifestStructure(withRuntime({ permissible_mounts: ["/workspace/attempt/../../Users"] }), { now: CLOCK }),
    /Forbidden mount identity/i
  );
  assert.throws(
    () => validateManifestStructure(withRuntime({ permissible_mounts: ["/workspace/attempt", "/workspace/attempt"] }), { now: CLOCK }),
    /Duplicate mount identity/i
  );
  assert.throws(
    () => validateManifestStructure(withRuntime({ permissible_mounts: "/workspace/attempt" }), { now: CLOCK }),
    /must be an array/i
  );
  assert.throws(() => validateManifestStructure(withRuntime({ node_version: "20" }), { now: CLOCK }), /node_version/i);
  assert.throws(
    () => validateManifestStructure(withRuntime({ runtime_adapter_version: "  " }), { now: CLOCK }),
    /runtime_adapter_version/i
  );
  assert.throws(() => validateManifestStructure(withRuntime({ network_policy: "bridge" }), { now: CLOCK }), /network_policy/i);
  assert.throws(() => validateManifestStructure(withRuntime({ deadline_seconds: 7201 }), { now: CLOCK }), /deadline_seconds/i);

  const build = { ...valid.runtime_policy.stage_limits.build };
  const run = { ...valid.runtime_policy.stage_limits.run };
  const withLimits = (nextBuild: Record<string, unknown>, nextRun: Record<string, unknown>) =>
    ({ ...valid, runtime_policy: { ...valid.runtime_policy, stage_limits: { build: nextBuild, run: nextRun } } }) as unknown;

  const overCeiling: [string, Record<string, unknown>, Record<string, unknown>][] = [
    ["cpu", { ...build, cpu: 2 }, run],
    ["memory_mib", { ...build, memory_mib: 1025 }, run],
    ["max_processes", { ...build, max_processes: 129 }, run],
    ["workspace_disk_mib", { ...build, workspace_disk_mib: 513 }, run],
    ["wall_time_seconds", { ...build, wall_time_seconds: 121 }, run],
    ["max_output_bytes", { ...build, max_output_bytes: 4_194_305 }, run],
    ["run memory_mib", build, { ...run, memory_mib: 513 }],
    ["run attempt_state_disk_mib", build, { ...run, attempt_state_disk_mib: 129 }],
    ["run max_frame_bytes", build, { ...run, max_frame_bytes: 65537 }],
  ];
  for (const [label, nextBuild, nextRun] of overCeiling) {
    assert.throws(
      () => validateManifestStructure(withLimits(nextBuild, nextRun), { now: CLOCK }),
      /exceeds accepted SRS diagnostic ceiling/i,
      `expected ${label} to exceed the accepted ceiling`
    );
  }

  // Smaller finite limits stay legal.
  const smaller = validateManifestStructure(
    withLimits({ ...build, memory_mib: 512 }, { ...run, max_frame_bytes: 4096 }),
    { now: CLOCK }
  ) as L3Manifest;
  assert.equal(smaller.runtime_policy.stage_limits.build.memory_mib, 512);
});

test("SRS-001: attempt plan rejects duplicates, unsupported cases, hidden retries and oversize sessions", () => {
  const valid = createValidManifestFixture();
  const withPlan = (patch: Record<string, unknown>, topLevel: Record<string, unknown> = {}) =>
    ({ ...valid, ...topLevel, attempt_plan: { ...valid.attempt_plan, ...patch } }) as unknown;

  assert.throws(
    () => validateManifestStructure(withPlan({ cases: ["payment", "payment", "tenant"], arms: ["A0"] }), { now: CLOCK }),
    /Duplicate case ID in attempt_plan/i
  );
  assert.throws(
    () => validateManifestStructure(withPlan({ cases: ["payment", "refund"] }), { now: CLOCK }),
    /Unsupported or invalid case ID/i
  );
  assert.throws(
    () => validateManifestStructure({ ...valid, case_ids: ["payment", "refund"] }, { now: CLOCK }),
    /Unsupported case ID in case_ids/i
  );
  assert.throws(() => validateManifestStructure(withPlan({ cases: ["payment", "tenant"] }), { now: CLOCK }), /must exactly match/i);
  assert.throws(
    () => validateManifestStructure(withPlan({ arms: ["A0", "A0"] }, { case_ids: ["payment"] }), { now: CLOCK }),
    /Duplicate arm ID/i
  );
  assert.throws(
    () => validateManifestStructure(withPlan({ arms: ["baseline"] }), { now: CLOCK }),
    /invalid arm ID/i
  );
  assert.throws(
    () => validateManifestStructure(withPlan({ repetitions: 2 }), { now: CLOCK }),
    /hidden retries/i
  );
  assert.throws(
    () => validateManifestStructure(withPlan({ repetitions: 10, max_attempts_per_arm_case: 10 }), { now: CLOCK }),
    /Session attempt ceiling exceeded/i
  );
  assert.throws(
    () => validateManifestStructure(withPlan({ max_attempts_per_arm_case: 4 }), { now: CLOCK }),
    /Session attempt ceiling exceeded/i
  );
  assert.throws(
    () => validateManifestStructure(withPlan({ ends_at: "2030-01-01T00:00:00.000Z" }), { now: CLOCK }),
    /strictly after/i
  );
  assert.throws(
    () => validateManifestStructure(withPlan({ ends_at: "2030-01-01T03:00:00.000Z" }), { now: CLOCK }),
    /2-hour session ceiling/i
  );
  assert.throws(
    () => validateManifestStructure(withPlan({ starts_at: "2030-01-01T00:00:00Z" }), { now: CLOCK }),
    /canonical UTC/i
  );
});

test("SRS-001: artifact references reject absolute, traversal, backslash and duplicate-slash paths", () => {
  const valid = createValidManifestFixture();
  const withArmPath = (badPath: string) =>
    ({
      ...valid,
      arm_sources: {
        ...valid.arm_sources,
        A0: { artifact_ref: { ...valid.arm_sources.A0.artifact_ref, path: badPath } },
      },
    }) as unknown;

  assert.throws(() => validateManifestStructure(withArmPath("../secret"), { now: CLOCK }), /traversal segments/i);
  assert.throws(() => validateManifestStructure(withArmPath("/etc/passwd"), { now: CLOCK }), /absolute path/i);
  assert.throws(() => validateManifestStructure(withArmPath("artifacts\\A0\\x"), { now: CLOCK }), /backslash/i);
  assert.throws(() => validateManifestStructure(withArmPath("artifacts//A0"), { now: CLOCK }), /empty path segments/i);
  assert.throws(
    () =>
      validateManifestStructure(
        {
          ...valid,
          arm_sources: {
            ...valid.arm_sources,
            A0: { artifact_ref: { ...valid.arm_sources.A0.artifact_ref, sha256: "A".repeat(64) } },
          },
        },
        { now: CLOCK }
      ),
    /lowercase hex/i
  );
  assert.throws(
    () =>
      validateManifestStructure(
        { ...valid, arm_sources: { A0: valid.arm_sources.A0, A1: valid.arm_sources.A1 } },
        { now: CLOCK }
      ),
    /Missing required own field 'A2'/i
  );
});

// ---------------------------------------------------------------------------
// Deterministic ordering
// ---------------------------------------------------------------------------

test("SRS-001: attempt order is deterministic, complete and honours bounded runs", () => {
  const valid = createValidManifestFixture();
  const plan = validateManifestStructure(valid, { now: CLOCK }).attempt_plan;

  const first = buildAttemptSequence(plan);
  const second = buildAttemptSequence(plan);
  assert.deepEqual(first, second);
  assert.equal(first.length, 9);
  first.forEach((entry, index) => assert.equal(entry.attempt_index, index));

  const population = new Set(first.map((entry) => `${entry.repetition}/${entry.case_id}/${entry.arm_id}`));
  assert.equal(population.size, 9);

  for (let i = 1; i < first.length; i += 1) {
    let caseRun = 1;
    let armRun = 1;
    for (let j = i; j > 0 && first[j].case_id === first[j - 1].case_id; j -= 1) caseRun += 1;
    for (let j = i; j > 0 && first[j].arm_id === first[j - 1].arm_id; j -= 1) armRun += 1;
    assert.equal(caseRun <= MAX_CONSECUTIVE_SAME_CASE, true);
    assert.equal(armRun <= MAX_CONSECUTIVE_SAME_ARM, true);
  }

  const otherSeed = buildAttemptSequence({ ...plan, seed: plan.seed + 1 });
  assert.notDeepEqual(
    otherSeed.map((entry) => `${entry.case_id}/${entry.arm_id}`),
    first.map((entry) => `${entry.case_id}/${entry.arm_id}`)
  );

  const repeated = buildAttemptSequence({ ...plan, repetitions: 3, max_attempts_per_arm_case: 3 });
  assert.equal(repeated.length, 27);
  assert.equal(new Set(repeated.map((entry) => entry.repetition)).size, 3);
  assert.equal(ATTEMPT_ORDER_ALGORITHM, "artifact-v1-seeded-shuffle-bounded-runs-v1");
});

// ---------------------------------------------------------------------------
// Filesystem binding
// ---------------------------------------------------------------------------

interface Workspace {
  readonly root: string;
  readonly artifact: Buffer;
  readonly manifest: L3Manifest;
}

function createWorkspace(): Workspace {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "l3-manifest-test-"));
  const artifact = Buffer.from("console.log('test');\n", "utf8");
  const prompts = Buffer.from("{}", "utf8");
  const drivers = Buffer.from("drivers", "utf8");

  for (const rel of ["artifacts/A0/service.tar", "fixtures/prompts.json", "fixtures/drivers.tar"]) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  }
  fs.writeFileSync(path.join(root, "artifacts/A0/service.tar"), artifact);
  fs.writeFileSync(path.join(root, "fixtures/prompts.json"), prompts);
  fs.writeFileSync(path.join(root, "fixtures/drivers.tar"), drivers);

  const artifactRef = {
    path: "artifacts/A0/service.tar",
    sha256: sha256Of(artifact),
    size: artifact.byteLength,
  };

  const manifest = createValidManifestFixture({
    arm_sources: {
      A0: { artifact_ref: artifactRef },
      A1: { artifact_ref: artifactRef },
      A2: { artifact_ref: artifactRef },
    },
    generation_contract: {
      prompts_ref: { path: "fixtures/prompts.json", sha256: sha256Of(prompts), size: prompts.byteLength },
      model: "test-model-v1",
      effort: "medium",
      context_delivery_mode: "frozen-bundle",
      tool_policy: "offline-only",
    },
    driver_bundle: {
      bundle_ref: { path: "fixtures/drivers.tar", sha256: sha256Of(drivers), size: drivers.byteLength },
      version: "1.0.0",
    },
  });

  return { root, artifact, manifest };
}

test("SRS-001/SRS-002: filesystem binding verifies actual bytes and rejects tampering", () => {
  const { root, artifact, manifest } = createWorkspace();
  try {
    const verified = validateManifestFilesystem(manifest, { stage_root: root, isolation: TRUSTED_ISOLATION });
    assert.equal(verified.valid, true);
    assert.equal(verified.isolation_kind, "trusted-staging-boundary");
    assert.equal(verified.verified_refs.length, 5);
    assert.equal(verified.verified_refs[0].actual_sha256, sha256Of(artifact));

    const withArm = (ref: { path: string; sha256: string; size: number }) =>
      ({ ...manifest, arm_sources: { ...manifest.arm_sources, A0: { artifact_ref: ref } } }) as L3Manifest;

    assert.throws(
      () =>
        validateManifestFilesystem(
          withArm({ path: "artifacts/A0/service.tar", sha256: "0".repeat(64), size: artifact.byteLength }),
          { stage_root: root, isolation: TRUSTED_ISOLATION }
        ),
      /integrity hash mismatch/i
    );
    assert.throws(
      () =>
        validateManifestFilesystem(
          withArm({ path: "artifacts/A0/service.tar", sha256: sha256Of(artifact), size: artifact.byteLength + 1 }),
          { stage_root: root, isolation: TRUSTED_ISOLATION }
        ),
      /size mismatch/i
    );
    assert.throws(
      () =>
        validateManifestFilesystem(
          withArm({ path: "artifacts/A0/missing.tar", sha256: sha256Of(artifact), size: artifact.byteLength }),
          { stage_root: root, isolation: TRUSTED_ISOLATION }
        ),
      /Missing referenced path component/i
    );
    assert.throws(
      () =>
        validateManifestFilesystem(
          withArm({ path: "../outside.tar", sha256: sha256Of(artifact), size: artifact.byteLength }),
          { stage_root: root, isolation: TRUSTED_ISOLATION }
        ),
      /traversal segments/i
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("SRS-002: filesystem binding rejects symlinks, hardlinks, special files and substituted ancestors", () => {
  const { root, artifact, manifest } = createWorkspace();
  const ref = { path: "", sha256: sha256Of(artifact), size: artifact.byteLength };
  const withArm = (candidatePath: string) =>
    ({ ...manifest, arm_sources: { ...manifest.arm_sources, A0: { artifact_ref: { ...ref, path: candidatePath } } } }) as L3Manifest;
  const verify = (candidate: L3Manifest) =>
    validateManifestFilesystem(candidate, { stage_root: root, isolation: TRUSTED_ISOLATION });

  try {
    // Final symlink.
    fs.symlinkSync(path.join(root, "artifacts/A0/service.tar"), path.join(root, "artifacts/A0/link.tar"));
    assert.throws(() => verify(withArm("artifacts/A0/link.tar")), /Symbolic link/i);

    // Hardlink (link count 2).
    fs.linkSync(path.join(root, "artifacts/A0/service.tar"), path.join(root, "artifacts/A0/hard.tar"));
    assert.throws(() => verify(withArm("artifacts/A0/hard.tar")), /Hardlink rejected/i);

    // Intermediate directory symlink pointing outside the stage root.
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "l3-outside-"));
    fs.writeFileSync(path.join(outside, "service.tar"), artifact);
    fs.symlinkSync(outside, path.join(root, "linked_dir"));
    assert.throws(() => verify(withArm("linked_dir/service.tar")), /Symbolic link/i);
    fs.rmSync(outside, { recursive: true, force: true });

    // Non-regular file (FIFO) must be rejected without blocking.
    try {
      execFileSync("mkfifo", [path.join(root, "artifacts/A0/pipe")], { stdio: "ignore" });
      assert.throws(() => verify(withArm("artifacts/A0/pipe")), /regular file/i);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("SRS-002: descriptor-anchored isolation is used when the platform can prove it, else it fails closed", () => {
  const { root, manifest } = createWorkspace();
  const probe = probeDescriptorAnchoredTraversal();
  try {
    if (probe.supported) {
      const verified = validateManifestFilesystem(manifest, { stage_root: root });
      assert.equal(verified.isolation_kind, "descriptor-anchored");
    } else {
      assert.throws(
        () => validateManifestFilesystem(manifest, { stage_root: root }),
        /Descriptor-anchored artifact traversal is unavailable/i
      );
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("SRS-002: trusted-staging isolation requires the explicit controller assertion", () => {
  const { root, manifest } = createWorkspace();
  try {
    const unasserted = {
      kind: "trusted-staging-boundary",
      controller_assertion: "because-i-said-so",
    } as unknown as FilesystemIsolation;
    assert.throws(
      () => validateManifestFilesystem(manifest, { stage_root: root, isolation: unasserted }),
      /controller assertion/i
    );
    assert.throws(
      () => validateManifestFilesystem(manifest, { stage_root: "" }),
      /stage_root/i
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
