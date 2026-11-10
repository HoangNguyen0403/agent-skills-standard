/**
 * Maximum-cardinality evidence algebra and its peak-heap bound.
 *
 * The fixture lives in `evidence-extreme-fixture.ts` so the heap test can run
 * the exact same algebra in a child process under a fixed old-space limit.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EVIDENCE_MAX_LINE_BYTES, decodeEvidence, encodeEvidence } from "./guest/evidence";
import { HOST_VERIFIER_MAX_OLD_SPACE_MIB } from "./vz";
import {
  EXPECTED_ITEMS,
  EXPECTED_MAX_LINE_BYTES,
  EXPECTED_WIRE_BYTES,
  FORWARDED,
  extremeEvidence,
} from "./evidence-extreme-fixture";

describe("maximum-cardinality evidence algebra", () => {
  it("encodes and decodes every production class within the derived wire bound", () => {
    const items = extremeEvidence();
    assert.equal(items.length, EXPECTED_ITEMS);
    const section = encodeEvidence(items, { max_bytes: 128 * 1024 * 1024 });
    assert.equal(section.ok, true, section.reason ?? "");
    assert.equal(section.items, EXPECTED_ITEMS);
    assert.equal(
      section.bytes,
      EXPECTED_WIRE_BYTES,
      "the complete algebra has one deterministic encoded size; a change here means the bound moved",
    );

    let maxLine = 0;
    for (const line of section.wire.toString("utf8").split("\n")) {
      if (line.length === 0) continue;
      const parsed = JSON.parse(line) as { l3e?: unknown };
      if (parsed.l3e !== undefined) continue;
      maxLine = Math.max(maxLine, Buffer.byteLength(`${line}\n`, "utf8"));
    }
    assert.equal(maxLine, EXPECTED_MAX_LINE_BYTES);
    assert.ok(maxLine <= EVIDENCE_MAX_LINE_BYTES, "the widest real item stays inside the 1 MiB line ceiling");

    const decoded = decodeEvidence(section.wire, { max_bytes: 128 * 1024 * 1024 });
    assert.equal(decoded.ok, true, decoded.reason ?? "");
    assert.equal(decoded.items.length, EXPECTED_ITEMS);
    assert.equal(decoded.items[0]?.kind, "provenance");
    const ledger = decoded.items.find((item) => item.kind === "stub_observation");
    const ledgerEntry = (ledger?.body as { entry?: { message_ids?: unknown[] } } | undefined)?.entry;
    assert.equal(ledgerEntry?.message_ids?.length, 256, "deduplicated ids are restored losslessly");
    const verdict = decoded.items[decoded.items.length - 1];
    assert.equal(verdict?.kind, "verdict");
    const body = verdict?.body as { timing_evidence: unknown[]; window_diagnostics: unknown[] };
    assert.equal(body.timing_evidence.length, FORWARDED);
    assert.equal(body.window_diagnostics.length, 60);
  });

  it("splits a worst-case payment verdict so overload stays the largest case", () => {
    const id = (prefix: string): string => `${prefix}${"-x".repeat(64)}`.slice(0, 64);
    const reason = (index: number, prefix: string): string =>
      `${prefix}${index}-${"x".repeat(256 - String(index).length - prefix.length - 2)}`;
    const schedule = (name: string) => ({
      case_id: "payment", schedule: name, passed: false, instruction_id: id(`instr-${name}`),
      committed_debits: Number.MAX_SAFE_INTEGER, duplicate_debit_attempts: Number.MAX_SAFE_INTEGER,
      unknown_views_observed: Number.MAX_SAFE_INTEGER, final_negative_observed: false, restart_occurred: false,
      evidence_checks: Array.from({ length: 7 * 256 }, (_, index) => ({
        evidence_id: id(`ev-${index}`), instruction_id: id(`instr-${name}`),
        expected_outcome: "succeeded" as const, accepted: true, reason: reason(index, "check"),
      })),
      failure_reasons: Array.from({ length: 64 }, (_, index) => reason(index, "failure")),
      unverified_reasons: Array.from({ length: 64 }, (_, index) => reason(index, "unverified")),
      failure_reason_count: Number.MAX_SAFE_INTEGER,
      unverified_reason_count: Number.MAX_SAFE_INTEGER,
    });
    const verdict = {
      case_id: "payment",
      base: schedule("base"),
      adverse: schedule("adverse"),
      changed: schedule("changed_constraint"),
      negative: schedule("negative_outcome_control"),
    };
    const section = encodeEvidence([{ seq: 1, kind: "verdict", body: verdict }], { max_bytes: 16 * 1024 * 1024 });
    assert.equal(section.ok, true, section.reason ?? "");
    assert.ok(section.bytes < EXPECTED_WIRE_BYTES, "payment stays below the overload maximum");
    let maxLine = 0;
    for (const line of section.wire.toString("utf8").split("\n")) {
      if (line.length === 0) continue;
      const parsed = JSON.parse(line) as { l3e?: unknown };
      if (parsed.l3e !== undefined) continue;
      maxLine = Math.max(maxLine, Buffer.byteLength(`${line}\n`, "utf8"));
    }
    assert.ok(maxLine <= EVIDENCE_MAX_LINE_BYTES, `payment line ${maxLine}`);
    const decoded = decodeEvidence(section.wire, { max_bytes: 16 * 1024 * 1024 });
    assert.equal(decoded.ok, true, decoded.reason ?? "");
    assert.deepEqual(decoded.items[0]?.body, verdict);
  });

  it("fits the derived guest and host memory budgets on the real paths", async () => {
    // Budgets (fixed ceiling): 768 MiB V8 old space, 1536 MiB RSS, 512 MiB
    // external Buffers. Both the guest retainEvidence path (with the full 8 MiB
    // output.log read) and the host frame-reassembly/evidenceSectionOf/decode
    // path run in one child under that ceiling.
    const dir = await mkdtemp(path.join(tmpdir(), "l3-heap-"));
    try {
      const root = path.dirname(fileURLToPath(new URL("./evidence-extreme-fixture.ts", import.meta.url)));
      const fixture = path.join(root, "evidence-extreme-fixture.ts");
      const evidence = path.join(root, "guest", "evidence.ts");
      const collector = path.join(root, "guest", "collector.ts");
      const vz = path.join(root, "vz.ts");
      const index = path.join(root, "index.ts");
      const script = path.join(dir, "memory.mts");
      await writeFile(
        script,
        [
          `import { ControllerApp } from ${JSON.stringify(path.join(root, "guest", "controller.ts"))};`,
          `import { encodeEvidence, decodeEvidence, evidenceSectionOf } from ${JSON.stringify(evidence)};`,
          `import { runCollector } from ${JSON.stringify(collector)};`,
          `import { DEFAULT_SERIAL_EVIDENCE_LIMITS, parseSerialEvidence } from ${JSON.stringify(vz)};`,
          `import { extremeEvidence, EXPECTED_ITEMS, EXPECTED_WIRE_BYTES } from ${JSON.stringify(fixture)};`,
          `import { SerialCleanEOF } from ${JSON.stringify(path.join(root, "types.ts"))};`,
          `import { mkdir, readFile, writeFile } from "node:fs/promises";`,
          `const stateDir = ${JSON.stringify(dir)};`,
          `const MiB = 1024 * 1024;`,
          `if (!process.execArgv.includes("--max-old-space-size=${HOST_VERIFIER_MAX_OLD_SPACE_MIB}")) throw new Error("host verifier old-space limit not applied");`,
          `const peaks = { rss: 0, heap: 0, external: 0, arrayBuffers: 0 };`,
          `const sample = () => { const m = process.memoryUsage(); const maxRss = process.resourceUsage().maxRSS * 1024; peaks.rss = Math.max(peaks.rss, m.rss, maxRss); peaks.heap = Math.max(peaks.heap, m.heapUsed); peaks.external = Math.max(peaks.external, m.external); peaks.arrayBuffers = Math.max(peaks.arrayBuffers, m.arrayBuffers); };`,
          `try {`,
          `  const items = extremeEvidence();`,
          `  sample();`,
          `  const byKind = (kind) => items.filter((item) => item.kind === kind).map((item) => item.body);`,
          `  const app = new ControllerApp({ runtime: { processSessionId: () => "ps-1" }, nowMs: () => 1000, stateDir, deadlineAtMs: 1e15, evidenceMaxBytes: 78 * MiB, attempt: { run_id: "run-x", attempt_id: "att-x", manifest_sha256: "c".repeat(64), case_id: "overload", phase: "run" }, limits: { build: { max_output_bytes: 8 * MiB }, run: { max_output_bytes: 8 * MiB } }, bundle: [] });`,
          `  const internals = app;`,
          `  internals.evidenceBuffers = byKind("buffer_snapshot");`,
          `  internals.dispositionHistory = byKind("disposition_history");`,
          `  internals.consumedReceipts = new Map(byKind("consumer_receipt").map((body, i) => ["conn-1|msg-" + i, body]));`,
          `  internals.dispositions = byKind("transport_disposition");`,
          `  internals.evidenceAuxiliary = byKind("auxiliary_observation");`,
          `  internals.evidenceStubs = byKind("stub_observation");`,
          `  internals.evidenceProcess = byKind("process_observation");`,
          `  internals.evidenceTermination = byKind("termination");`,
          `  internals.evidenceRestarts = byKind("restart");`,
          `  internals.evidencePhases = byKind("phase");`,
          `  internals.evidenceMarkers = byKind("output_marker");`,
          `  internals.verdictValue = byKind("verdict")[0];`,
          `  internals.finalObservation = { attempted: true, complete: true, reason: null, records: 0 };`,
          `  internals.eventsBytes = 2_978_308;`,
          `  const seededEvents = Buffer.alloc(2_978_308, 0x20);`,
          `  internals.candidateOutputRanges = new Map([["ps-1", { process_session_id: "ps-1", artifact_offset: 0, stream_mask: Buffer.alloc(4 * MiB / 8), stream_offset: 0, capture_order: 1, bytes: 4 * MiB, exported_bytes: 4 * MiB }]]);`,
          `  const output = Buffer.alloc(8 * MiB, 0x41);`,
          `  await writeFile(stateDir + "/output.log", output);`,
          `  await writeFile(stateDir + "/events.jsonl", seededEvents);`,
          `  const retained = await internals.retainEvidence();`,
          `  sample();`,
          `  if (retained.failure !== null) throw new Error("retainEvidence: " + retained.failure);`,
          `  const events = await readFile(stateDir + "/events.jsonl");`,
          `  if (events.length !== seededEvents.length + retained.bytes) throw new Error("guest evidence size " + events.length);`,
          `  await writeFile(stateDir + "/receipt.json", JSON.stringify({ schema_version: 1, evidence_artifact: "events.jsonl#evidence" }));`,
          `  const frames = [];`,
          `  const collected = await runCollector({ evidenceRoot: stateDir, writeFrame: async (frame) => frames.push(frame), limits: { artifact_bytes: 78 * MiB, total_bytes: 112 * MiB } });`,
          `  sample();`,
          `  const queue = [...frames];`,
          `  const outcome = await parseSerialEvidence(async () => { const next = queue.shift(); if (next === undefined) throw new SerialCleanEOF(); return next; }, Date.now() + 120000, { ...DEFAULT_SERIAL_EVIDENCE_LIMITS, artifact_bytes: 78 * MiB, total_bytes: 112 * MiB, frames: 4096 });`,
          `  sample();`,
          `  if (!outcome.available) throw new Error("host reassembly: " + outcome.reason + " " + outcome.detail);`,
          `  const eventArtifact = outcome.artifacts.find((artifact) => artifact.name === "events.jsonl");`,
          `  const section = evidenceSectionOf(eventArtifact.bytes);`,
          `  if (section === null) throw new Error("host evidence section missing");`,
          `  const decoded = decodeEvidence(section, { max_bytes: 78 * MiB });`,
          `  sample();`,
          `  if (!decoded.ok || decoded.items.length !== EXPECTED_ITEMS - 1) throw new Error("host decode: " + (decoded.reason ?? decoded.items.length));`,
          `  process.stdout.write("MEM_OK " + JSON.stringify(peaks));`,
          `} finally { sample(); }`,
        ].join("\n"),
      );
      const child = spawnSync(
        process.execPath,
        [`--max-old-space-size=${HOST_VERIFIER_MAX_OLD_SPACE_MIB}`, "--import", "tsx", script],
        { encoding: "utf8", timeout: 300_000 },
      );
      assert.equal(
        child.status,
        0,
        `real-path memory bound failed\nstdout:\n${child.stdout}\nstderr:\n${child.stderr}`,
      );
      const match = /MEM_OK (\{.*\})/.exec(child.stdout);
      assert.notEqual(match, null, child.stdout);
      const peaks = JSON.parse(match?.[1] ?? "{}") as {
        rss: number; heap: number; external: number; arrayBuffers: number;
      };
      assert.ok(peaks.rss <= 1536 * 1024 * 1024, `RSS ${peaks.rss}`);
      assert.ok(peaks.heap <= 768 * 1024 * 1024, `heap ${peaks.heap}`);
      assert.ok(peaks.external <= 512 * 1024 * 1024, `external ${peaks.external}`);
      assert.ok(peaks.arrayBuffers <= 512 * 1024 * 1024, `arrayBuffers ${peaks.arrayBuffers}`);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
