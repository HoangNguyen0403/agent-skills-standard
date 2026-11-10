/**
 * scripts/evals/l3/runtime/guest-inputs.test.ts
 *
 * Behavioural tests for the guest-side frozen-input boundary: attempt binding,
 * device-bundle framing, the ustar dependency reader, the packaged driver tree
 * digest, and the tenant stage reader. No VM, container or Docker is used.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign as cryptoSign } from "node:crypto";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { buildAttemptInvocation, buildBundleImage, readBundleImage } from "./index";
import { readUstarArchive } from "./guest/archive";
import { readBundleDevice } from "./guest/device-bundle";
import { verifyInvocationBinding, parseAttemptJson, verifyStagedInvocation } from "./guest/invocation";
import { STAGE_CORRESPONDENCE_DOMAIN, createBundleStageReader, type StageCorrespondenceTrust } from "./guest/stage-reader";
import { reviewPayload } from "./guest/trust";
import { verifyDriverTree, assertOfflineBuildPolicy } from "./guest/inputs";
import { createBundleStageReader } from "./guest/stage-reader";
import { buildFrozenSequence } from "./session";
import { createValidManifestFixture } from "../test-fixtures";

const MANIFEST = createValidManifestFixture({
  runtime_policy: { ...createValidManifestFixture().runtime_policy, runtime_adapter_version: "2.0.0" },
});
const MANIFEST_BYTES = Buffer.from(JSON.stringify(MANIFEST), "utf8");
const MANIFEST_SHA = createHash("sha256").update(MANIFEST_BYTES).digest("hex");
const DESCRIPTOR = buildFrozenSequence(MANIFEST)[0];
const ATTEMPT = buildAttemptInvocation(MANIFEST, MANIFEST_SHA, DESCRIPTOR, "run");

describe("guest attempt binding", () => {
  it("accepts the exact frozen invocation and rejects each mutated binding", () => {
    const verified = verifyInvocationBinding(ATTEMPT, MANIFEST_BYTES, MANIFEST_SHA, Date.now());
    assert.equal(verified.invocation.attempt_id, ATTEMPT.attempt_id);
    assert.equal(verified.manifest.run_id, MANIFEST.run_id);

    assert.throws(
      () => parseAttemptJson({ ...ATTEMPT, attempt_id: "0".repeat(64) }),
      /does not match its derived identity/,
    );
    assert.throws(
      () => verifyInvocationBinding({ ...ATTEMPT, seed: ATTEMPT.seed + 1 }, MANIFEST_BYTES, MANIFEST_SHA, Date.now()),
      /does not match the frozen plan seed/,
    );
    assert.throws(
      () => parseAttemptJson({ ...ATTEMPT, unexpected: true }),
      /Unknown extra field/,
    );
    assert.throws(
      () => verifyInvocationBinding(ATTEMPT, MANIFEST_BYTES, "f".repeat(64), Date.now()),
      /do not match the declared manifest digest/,
    );
  });

  it("rejects a descriptor that is not the frozen entry at its index", () => {
    const other = buildFrozenSequence(MANIFEST).find(
      (entry) => entry.attempt_index === DESCRIPTOR.attempt_index + 1,
    );
    assert.notEqual(other, undefined);
    assert.throws(
      () =>
        verifyInvocationBinding(
          { ...ATTEMPT, case_id: other!.case_id, arm_id: other!.arm_id, repetition: other!.repetition },
          MANIFEST_BYTES,
          MANIFEST_SHA,
          Date.now(),
        ),
      /not the exact frozen sequence entry/,
    );
  });
});

describe("device bundle framing", () => {
  it("reads exactly the declared bundle length from a zero-padded block device", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "l3-device-"));
    try {
      const image = buildBundleImage([
        { name: "attempt.json", data: Buffer.from("{}") },
        { name: "manifest.json", data: MANIFEST_BYTES },
      ]);
      const device = path.join(dir, "input.img");
      const padded = Buffer.concat([image, Buffer.alloc(8192)]);
      await writeFile(device, padded);
      const observed = await readBundleDevice(device);
      assert.deepEqual(readBundleImage(observed).map((entry) => entry.name), ["attempt.json", "manifest.json"]);
      assert.equal(observed.length, image.length);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

function ustar(name: string, data: Buffer, typeFlag = "0", prefix = ""): Buffer {
  const header = Buffer.alloc(512);
  header.write(name, 0, 100, "utf8");
  header.write("0000644\0", 100, "binary");
  header.write("0000000\0", 108, "binary");
  header.write("0000000\0", 116, "binary");
  header.write(`${data.length.toString(8).padStart(11, "0")}\0`, 124, "binary");
  header.write("00000000000\0", 136, "binary");
  header.write("        ", 148, "binary");
  header.write(typeFlag, 156, "binary");
  header.write("ustar\u0000", 257, "binary");
  header.write("00", 263, "binary");
  header.write(prefix, 345, 155, "utf8");
  let checksum = 0;
  for (const byte of header) checksum += byte;
  header.write(`${checksum.toString(8).padStart(6, "0")}\0 `, 148, "binary");
  const padding = Buffer.alloc((512 - (data.length % 512)) % 512);
  return Buffer.concat([header, data, padding]);
}

function archive(entries: readonly Buffer[]): Buffer {
  return Buffer.concat([...entries, Buffer.alloc(1024)]);
}

describe("offline dependency archive", () => {
  it("extracts regular files and directories from a ustar archive", () => {
    const entries = readUstarArchive(
      archive([ustar("deps/", Buffer.alloc(0), "5"), ustar("deps/package.json", Buffer.from("{}"))]),
    );
    assert.deepEqual(entries.map((entry) => entry.path), ["deps", "deps/package.json"]);
    assert.equal(entries[1].data.toString("utf8"), "{}");
  });

  it("rejects traversal, links and truncated archives", () => {
    assert.throws(() => readUstarArchive(archive([ustar("../escape", Buffer.from("x"))])), /unsafe/);
    assert.throws(() => readUstarArchive(archive([ustar("link", Buffer.alloc(0), "1")])), /not accepted/);
    const headerOnly = archive([ustar("payload", Buffer.alloc(1024))]).subarray(0, 512);
    assert.throws(() => readUstarArchive(headerOnly), /truncated/);
    assert.deepEqual(readUstarArchive(Buffer.alloc(512)), []);
  });
});

describe("packaged driver tree", () => {
  it("accepts the exact tree and rejects a changed file set or digest", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "l3-drivers-"));
    try {
      const tree = path.join(dir, "drivers");
      await mkdir(path.join(tree, "cases"), { recursive: true });
      const index = Buffer.from("export const PaymentCaseDriver = class {};\n");
      await writeFile(path.join(tree, "cases", "index.js"), index);
      const sha256 = createHash("sha256").update(index).digest("hex");
      const aggregate = createHash("sha256").update(`cases/index.js:${sha256}\n`, "utf8").digest("hex");
      const manifest = {
        version: 1,
        tree_sha256: aggregate,
        files: [{ path: "cases/index.js", sha256, bytes: index.length }],
      };
      const entries = readBundleImage(
        buildBundleImage([
          { name: "drivers.json", data: Buffer.from(JSON.stringify(manifest), "utf8") },
        ]),
      );
      assert.equal(await verifyDriverTree(entries, tree), aggregate);

      await writeFile(path.join(tree, "cases", "extra.js"), "export const x = 1;\n");
      await assert.rejects(async () => verifyDriverTree(entries, tree), /file set does not match/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("tenant frozen stages", () => {
  function stageBody(stage: "retrieval" | "rerank" | "cache"): Buffer {
    return Buffer.from(
      JSON.stringify({
        stage,
        sequence: 0,
        records: [{ tenant_id: "tenant-a", document_id: "doc-1" }],
        source_document_ids: ["doc-1"],
      }),
      "utf8",
    );
  }

  function reviewedLocations(stage: "retrieval" | "rerank" | "cache") {
    return {
      version: 2,
      reviewed_locations: [{ stage, path: `stages/${stage}.json` }],
      approval_reason: "reviewed-tenant-stage",
    };
  }

  const EXECUTABLE = "a".repeat(64);
  const PROGRAM = "b".repeat(64);
  const KEYS = generateKeyPairSync("ed25519");

  function stageTrust(keys = KEYS, nowMs = 5_000): StageCorrespondenceTrust {
    return {
      anchor: {
        domain: STAGE_CORRESPONDENCE_DOMAIN,
        run_id: "run-1",
        attempt_id: "att-1",
        custodian_keys: new Map([["custodian-1", keys.publicKey]]),
        now_epoch_ms: () => nowMs,
      },
      executable_sha256: EXECUTABLE,
      program_sha256: PROGRAM,
    };
  }

  function signedStageEntries(
    stage: "retrieval" | "rerank" | "cache",
    keys = KEYS,
  ): ReturnType<typeof buildBundleImage> {
    const bodyBytes = Buffer.from(JSON.stringify(reviewedLocations(stage)));
    const unsigned = {
      version: 1 as const,
      run_id: "run-1",
      attempt_id: "att-1",
      executable_sha256: EXECUTABLE,
      program_sha256: PROGRAM,
      artifact_sha256: createHash("sha256").update(bodyBytes).digest("hex"),
      custodian: "custodian-1",
      issued_at: new Date(1_000).toISOString(),
      expires_at: new Date(100_000_000).toISOString(),
    };
    const signature = cryptoSign(
      null,
      Buffer.from(reviewPayload(STAGE_CORRESPONDENCE_DOMAIN, unsigned, "reviewed-tenant-stage"), "utf8"),
      keys.privateKey,
    ).toString("hex");
    return buildBundleImage([
      { name: "stages.json", data: bodyBytes },
      { name: "stages_review.json", data: Buffer.from(JSON.stringify({ ...unsigned, signature })) },
    ]);
  }

  it("accepts correspondence only for a signed, digest-bound stage location", () => {
    const entries = readBundleImage(signedStageEntries("retrieval"));
    const reader = createBundleStageReader(entries, "/state/snapshots", stageTrust());
    assert.equal(reader.isStageCorrespondenceAccepted("retrieval"), true);
    assert.equal(reader.isStageCorrespondenceAccepted("rerank"), false);
    assert.equal(reader.correspondenceRefusalReason(), null);
    assert.deepEqual(reader.reviewedLocations().map((entry) => entry.path), ["stages/retrieval.json"]);

    // A location list without custody is not a review.
    const unsignedEntries = readBundleImage(
      buildBundleImage([
        { name: "stages.json", data: Buffer.from(JSON.stringify(reviewedLocations("retrieval"))) },
      ]),
    );
    const unsignedReader = createBundleStageReader(unsignedEntries, "/state/snapshots", stageTrust());
    assert.equal(unsignedReader.isStageCorrespondenceAccepted("retrieval"), false);
    assert.match(unsignedReader.correspondenceRefusalReason() ?? "", /no signed custody/);

    // A review signed by a key that is not the trusted custodian's is refused.
    const otherKeys = generateKeyPairSync("ed25519");
    const foreign = createBundleStageReader(
      readBundleImage(signedStageEntries("retrieval", otherKeys)),
      "/state/snapshots",
      stageTrust(),
    );
    assert.equal(foreign.isStageCorrespondenceAccepted("retrieval"), false);
    assert.match(foreign.correspondenceRefusalReason() ?? "", /signature verification failed/);

    // An expired review is refused.
    const expired = createBundleStageReader(
      readBundleImage(signedStageEntries("retrieval")),
      "/state/snapshots",
      stageTrust(KEYS, 200_000_000),
    );
    assert.equal(expired.isStageCorrespondenceAccepted("retrieval"), false);
    assert.match(expired.correspondenceRefusalReason() ?? "", /expired/);
  });

  it("reads only the observed snapshot bytes that match the pause-time digests", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "l3-snapshots-"));
    try {
      const body = stageBody("cache");
      const sha256 = createHash("sha256").update(body).digest("hex");
      await mkdir(path.join(dir, "snap-1"), { recursive: true });
      await writeFile(path.join(dir, "snap-1", "cache.json"), body);
      const entries = readBundleImage(signedStageEntries("cache"));
      const reader = createBundleStageReader(entries, dir, stageTrust());
      const manifest = [{ stage: "cache", path: "stages/cache.json", sha256, bytes: body.length }];
      const stages = await reader.readFrozenStages("snap-1", manifest);
      assert.equal(stages?.length, 1);
      assert.equal(stages?.[0].records[0]["document_id"], "doc-1");

      await writeFile(path.join(dir, "snap-1", "cache.json"), Buffer.from("{}"));
      assert.equal(await reader.readFrozenStages("snap-1", manifest), null);

      const wrongPath = [{ ...manifest[0], path: "stages/other.json" }];
      assert.equal(await reader.readFrozenStages("snap-1", wrongPath), null);
      const outside = path.join(dir, "outside");
      await mkdir(outside);
      await writeFile(path.join(outside, "cache.json"), body);
      const linkedManifest = [{ ...manifest[0], sha256: createHash("sha256").update(body).digest("hex") }];
      await mkdir(path.join(dir, "snap-2"));
      await symlink(path.join(outside, "cache.json"), path.join(dir, "snap-2", "cache.json"));
      assert.equal(await reader.readFrozenStages("snap-2", linkedManifest), null);
      await symlink(outside, path.join(dir, "snap-link"));
      const linkedReader = createBundleStageReader(entries, dir, stageTrust());
      assert.equal(await linkedReader.readFrozenStages("snap-link", manifest), null);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("ESM entrypoints and staged bootstrap", () => {
  it("loads both guest entrypoints and the emitted driver tree through an ESM loader", async () => {
    const controller = await import("./guest/controller-main.js");
    const collector = await import("./guest/collector-main.js");
    assert.equal(typeof controller.controllerMain, "function");
    assert.equal(typeof collector.collectorEntrypoint, "function");
    const drivers = await import("../cases/index.js");
    for (const name of [
      "PaymentCaseDriver",
      "TenantCaseDriver",
      "OverloadCaseDriver",
      "ProviderStub",
      "SummarizerStub",
      "RealMonotonicScheduler",
    ]) {
      assert.equal(typeof drivers[name], "function", `driver tree is missing ${name}`);
    }
  });

  it("binds a staged bundle using the observed manifest digest", () => {
    const image = buildBundleImage([
      { name: "attempt.json", data: Buffer.from(JSON.stringify(ATTEMPT), "utf8") },
      { name: "manifest.json", data: MANIFEST_BYTES },
    ]);
    const entries = readBundleImage(image);
    const verified = verifyStagedInvocation(entries, Date.now());
    assert.equal(verified.invocation.attempt_id, ATTEMPT.attempt_id);
    assert.equal(verified.manifest.run_id, MANIFEST.run_id);

    const tamperedManifest = Buffer.from(JSON.stringify({ ...MANIFEST, run_id: "run-other" }), "utf8");
    const tampered = readBundleImage(
      buildBundleImage([
        { name: "attempt.json", data: Buffer.from(JSON.stringify(ATTEMPT), "utf8") },
        { name: "manifest.json", data: tamperedManifest },
      ]),
    );
    assert.throws(() => verifyStagedInvocation(tampered, Date.now()), /does not match the staged manifest|declared manifest digest/);
  });

  it("refuses network install scripts in the frozen build context", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "l3-policy-"));
    try {
      await writeFile(path.join(dir, "Dockerfile"), "FROM node:22\nRUN npm install left-pad\n");
      await assert.rejects(async () => assertOfflineBuildPolicy(dir), /forbidden network install/);
      await writeFile(path.join(dir, "Dockerfile"), "FROM node:22\nRUN npm ci --offline --prefix deps\n");
      await assert.rejects(async () => assertOfflineBuildPolicy(dir), /ignore-scripts/);
      await writeFile(path.join(dir, "Dockerfile"), "FROM node:22\nRUN echo building \\\n && curl http://example.com\n");
      await assert.rejects(async () => assertOfflineBuildPolicy(dir), /forbidden network install/);
      await writeFile(path.join(dir, "Dockerfile"), "FROM node:22\nRUN npm ci --offline --ignore-scripts --prefix deps\n");
      await assertOfflineBuildPolicy(dir);
      await rm(path.join(dir, "Dockerfile"));
      await assert.rejects(async () => assertOfflineBuildPolicy(dir), /no Dockerfile/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("guest inputs come only from the read-only bundle", () => {
  it("does not fall back to a host path when the bundle entry is absent", async () => {
    const entries = readBundleImage(
      buildBundleImage([{ name: "manifest.json", data: MANIFEST_BYTES }]),
    );
    assert.equal(entries.some((entry) => entry.name === "workspace.tar"), false);
    const { materializeBuildContext } = await import("./guest/inputs");
    await assert.rejects(
      async () => materializeBuildContext(entries, path.join(tmpdir(), "l3-missing-context")),
      /missing required entry: workspace.tar/,
    );
  });
});
