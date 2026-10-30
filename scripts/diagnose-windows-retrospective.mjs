// Temporary Windows retrospective timing diagnostic.
// Prints one JSON line per measurement. Non-Windows hosts print a skip line and
// exit 0. Remove this script and its CI step after the measurement decision.
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const OVERALL_BUDGET_MS = 120_000;
const startedAt = performance.now();
const deadline = startedAt + OVERALL_BUDGET_MS;

function emit(step, data) {
  process.stdout.write(`${JSON.stringify({ step, ...data })}\n`);
}

function errorCode(error) {
  if (error !== null && typeof error === "object") {
    const code = Reflect.get(error, "code");
    if (typeof code === "string") return code;
    const name = Reflect.get(error, "name");
    if (typeof name === "string") return name;
  }
  return "ERROR";
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function runStep(name, task) {
  const remaining = deadline - performance.now();
  if (remaining <= 0) {
    emit(name, {
      ok: false,
      code: "DIAGNOSTIC_DEADLINE",
      message: "Skipped: overall budget exhausted.",
    });
    return undefined;
  }
  const start = performance.now();
  try {
    const result = await task(remaining);
    emit(name, {
      ok: true,
      durationMs: performance.now() - start,
      ...(result ?? {}),
    });
    return result;
  } catch (error) {
    emit(name, {
      ok: false,
      durationMs: performance.now() - start,
      code: errorCode(error),
      message: errorMessage(error),
    });
    return undefined;
  }
}

function percentile(values, fraction) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[
    Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))
  ];
}

if (process.platform !== "win32") {
  emit("skip", { ok: true, reason: "not-windows", platform: process.platform });
  process.exit(0);
}

const temporaryRoots = [];

async function temporaryRoot(prefix) {
  const base = await fs.realpath(os.tmpdir());
  const directory = await fs.mkdtemp(path.join(base, prefix));
  temporaryRoots.push(directory);
  return directory;
}

const platform = await import("../mcp/src/retrospective/platform-private.ts");
const store = await import("../mcp/src/retrospective/store.ts");

const MAIN = { hostId: "host-main", sessionId: "main-session" };
const root = path.join(await temporaryRoot("ags-diag-store-"), "store");

await runStep("helperColdStart", async () => {
  // ensurePrivateRoot is the first helper request (establish); a verified root
  // cannot exist before that first process starts.
  const start = performance.now();
  await platform.ensurePrivateRoot(root);
  const establishMs = performance.now() - start;
  const verifyStart = performance.now();
  await platform.verifyWindowsPrivatePath(root);
  return {
    rootEstablishMs: establishMs,
    firstVerifyMs: performance.now() - verifyStart,
  };
});

await runStep("sequentialVerify20", async () => {
  const durations = [];
  for (let index = 0; index < 20; index += 1) {
    const start = performance.now();
    await platform.verifyWindowsPrivatePath(root);
    durations.push(performance.now() - start);
  }
  return {
    count: durations.length,
    p50Ms: percentile(durations, 0.5),
    maxMs: Math.max(...durations),
    totalMs: durations.reduce((total, value) => total + value, 0),
  };
});

const layout = store.storeLayout(root);
const layoutDirectories = [
  layout.locksDir,
  layout.claimsDir,
  layout.sessionsDir,
  layout.stateDir,
  layout.fencesDir,
  layout.indexDir,
  layout.indexGenerationsDir,
];

await runStep("prepareStoreFresh", async () => {
  const start = performance.now();
  await store.prepareStore(root);
  return { durationMs: performance.now() - start };
});

await runStep("prepareStoreSameRoot", async () => {
  const start = performance.now();
  await store.prepareStore(root);
  return { durationMs: performance.now() - start };
});

await runStep("batchLayoutVerify", async () => {
  const start = performance.now();
  await platform.ensureWindowsPrivateStoreLayout(root, layoutDirectories);
  return { durationMs: performance.now() - start };
});

await runStep("establishFreshDirectory", async () => {
  const start = performance.now();
  await platform.createPrivateDirectory(
    path.join(root, "diag-fresh-directory"),
  );
  return { durationMs: performance.now() - start };
});

await runStep("exclusivePrivateFileWrite", async () => {
  const start = performance.now();
  await platform.writePrivateFileExclusive(
    path.join(root, "diag-private-file.bin"),
    "x",
  );
  return { durationMs: performance.now() - start };
});

await runStep("claimRunOnce", async () => {
  const start = performance.now();
  const claim = await store.claimRun(root, MAIN, "checkpoint-diag");
  return { durationMs: performance.now() - start, runId: claim.runId };
});

await runStep("publishRunOnce", async () => {
  const start = performance.now();
  const claim = await store.claimRun(root, MAIN, "checkpoint-diag");
  const published = await store.publishRun(claim, [
    {
      artifactId: `${claim.runId}.report`,
      kind: "report",
      content: "# Synthetic diagnostic\n",
    },
    {
      artifactId: `${claim.runId}.session`,
      kind: "session",
      content: '{"schemaVersion":1}',
    },
  ]);
  return {
    durationMs: performance.now() - start,
    generationId: published.generationId,
    artifactCount: published.artifactIds.length,
  };
});

await runStep("cliPrepare", async (remaining) => {
  const cliPath = fileURLToPath(
    new URL("../mcp/dist/retrospective-cli.js", import.meta.url),
  );
  const fixturePath = fileURLToPath(
    new URL(
      "../mcp/test/fixtures/retrospective/native-events.jsonl",
      import.meta.url,
    ),
  );
  const cliRoot = path.join(await temporaryRoot("ags-diag-cli-"), "store");
  const manifestPath = path.join(
    await temporaryRoot("ags-diag-manifest-"),
    "manifest.json",
  );
  await fs.writeFile(
    manifestPath,
    `${JSON.stringify({
      schemaVersion: 1,
      provenance: "user-supplied",
      main: MAIN,
      checkpointId: "checkpoint-cli-diagnostic",
      cutoff: "2026-10-01T10:10:00.000Z",
      nodes: [
        {
          key: MAIN,
          parent: null,
          disposition: "local-allowed",
          source: { format: "omp", absolutePath: fixturePath },
        },
      ],
    })}\n`,
    "utf8",
  );
  const start = performance.now();
  const run = spawnSync(
    process.execPath,
    [
      cliPath,
      "prepare",
      "--manifest",
      manifestPath,
      "--consent",
      "local-only",
      "--ack-storage-risk",
      "--root",
      cliRoot,
    ],
    {
      encoding: "utf8",
      timeout: Math.min(60_000, remaining),
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  return {
    durationMs: performance.now() - start,
    exitCode: run.status,
    signal: run.signal,
    spawnError: run.error === undefined ? null : run.error.message,
    stdout: run.stdout ?? "",
    stderr: run.stderr ?? "",
  };
});

for (const directory of temporaryRoots.splice(0)) {
  await fs
    .rm(directory, { recursive: true, force: true })
    .catch(() => undefined);
}

emit("complete", { ok: true, totalMs: performance.now() - startedAt });
