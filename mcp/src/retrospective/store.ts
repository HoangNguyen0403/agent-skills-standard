import { createHash, randomBytes, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  DEFAULT_LIMITS,
  artifactReceiptSchema,
  identifierSchema,
  nodeKeySchema,
  sameNodeKey,
  timestampSchema,
  type ArtifactReceipt,
  type NodeKey,
} from "./contracts";
import {
  NOFOLLOW_FLAG,
  PRIVATE_FILE_MODE,
  StoreError,
  assertDirectoryIdentity,
  assertPrivateDirectory,
  assertPrivateFile,
  createPrivateDirectory,
  ensurePrivateDirectory,
  ensurePrivateRoot,
  lstatOrNull,
  readPrivateFileOptional,
  removePrivateFile,
  removePrivateTree,
  syncDirectory,
  verifyPrivateRoot,
  verifyWindowsPrivatePath,
  writePrivateFileAtomic,
  writePrivateFileExclusive,
  type DirectoryIdentity,
} from "./platform-private";

export { StoreError } from "./platform-private";

/**
 * Absolute monotonic budget for a bounded observation. The deadline is
 * `performance.now()`-based; the signal aborts lock retries, sleeps, file
 * reads, and Windows helper processes.
 */
export type ObservationBound = {
  readonly deadline: number;
  readonly signal: AbortSignal;
};

function assertObservationBound(bound?: ObservationBound): void {
  if (!bound) return;
  if (bound.signal.aborted) throw new StoreError("ABORTED");
  if (!Number.isFinite(bound.deadline) || performance.now() >= bound.deadline)
    throw new StoreError("DEADLINE_EXCEEDED");
}

export const STORE_LIMITS = Object.freeze({
  bytes: 268_435_456,
  generations: 256,
});
export const CLAIM_STALE_MS = 15 * 60_000;
export const STORE_LOCK_TIMEOUT_MS = 5_000;
export const INDEX_PAGE_SIZE = 100;

export const ARTIFACT_FILES = Object.freeze({
  report: "report.md",
  proposals: "proposals.md",
  session: "session.json",
  receipt: "receipt.json",
});

export type ArtifactKind = keyof typeof ARTIFACT_FILES;
export type ArtifactStatus = "complete" | "partial" | "failed";

const MAX_INDEX_BYTES = 4_194_304;
const MAX_INDEX_POINTER_BYTES = 256;
const MAX_META_BYTES = 65_536;
const MAX_RECORD_BYTES = 4_096;
const MAX_LABEL_LENGTH = 200;
const LOCK_RETRY_MS = 10;
const INDEX_GENERATIONS_KEPT = 3;
const MAX_MEASURE_DEPTH = 8;
const PREPARATION_WAIT_INTERVAL_MS = 25;
const PREPARATION_WAIT_READS = 128;
const PREPARATION_WAIT_MAX_MS = 30_000;

/**
 * Age guard for abandoned publication staging. Staging directories are
 * written only while the root and session locks are held, so a directory
 * observed under those locks has no live writer; the margin keeps collection
 * away from a just-interrupted publish that is recovered manually. This is
 * not lock reclamation: a stale lock is refused as STORE_BUSY and is never
 * removed automatically.
 */
const STAGING_STALE_MS = 24 * 60 * 60_000;

/**
 * ASCII control characters rejected in labels. Built from code points because
 * the literal range trips CI's `no-control-regex`.
 */
const CONTROL_CHARACTERS = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(0x1f)}${String.fromCharCode(
    0x7f,
  )}]`,
);

const labelSchema = z
  .string()
  .min(1)
  .max(MAX_LABEL_LENGTH)
  .refine((value) => !CONTROL_CHARACTERS.test(value), {
    message: "Control characters are not allowed",
  });

const sessionMetaSchema = z.strictObject({
  schemaVersion: z.literal(1),
  main: nodeKeySchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  generationCount: z.number().int().nonnegative(),
  lastGenerationId: identifierSchema.nullable(),
  dev: z.number().int(),
  ino: z.number().int(),
  generations: z.strictObject({
    dev: z.number().int(),
    ino: z.number().int(),
  }),
  labels: z
    .strictObject({
      title: labelSchema.optional(),
      project: labelSchema.optional(),
    })
    .optional(),
});

const fenceRecordSchema = z.strictObject({
  schemaVersion: z.literal(1),
  tombstone: identifierSchema,
  deletedAt: timestampSchema,
});

const claimRecordSchema = z.strictObject({
  schemaVersion: z.literal(1),
  state: z.enum(["active", "published", "canceled"]),
  runId: identifierSchema,
  claimToken: z.string().regex(/^[0-9a-f]{64}$/),
  main: nodeKeySchema,
  checkpointId: identifierSchema,
  generation: z.number().int().positive(),
  fence: identifierSchema.nullable(),
  createdAt: timestampSchema,
  heartbeatAt: timestampSchema,
  publishedGenerationId: identifierSchema.optional(),
  canceledAt: timestampSchema.optional(),
  cancelReason: z.enum(["user", "deleted"]).optional(),
});

const indexEntrySchema = z.strictObject({
  artifactId: identifierSchema,
  sessionToken: z.string().regex(/^[0-9a-f]{32}$/),
  generationId: identifierSchema,
  runId: identifierSchema,
  checkpointId: identifierSchema,
  kind: z.enum(["report", "proposals", "session", "receipt"]),
  status: z.enum(["complete", "partial", "failed"]),
  publishedAt: timestampSchema,
  bytes: z.number().int().nonnegative(),
  /**
   * Deletion fence in force when this entry was published. Entries whose
   * fence differs from the session's current tombstone predate the latest
   * deletion and are not authoritative (partial deletion keeps them indexed).
   * Optional so an index written before fences were recorded still parses as
   * pre-fence state.
   */
  fence: identifierSchema.nullable().optional(),
});
const indexGenerationSchema = z.strictObject({
  schemaVersion: z.literal(1),
  generation: z.number().int().positive(),
  updatedAt: timestampSchema,
  counts: z.strictObject({
    artifacts: z.number().int().nonnegative(),
    sessions: z.number().int().nonnegative(),
  }),
  entries: z.array(indexEntrySchema),
});

type SessionMeta = z.infer<typeof sessionMetaSchema>;
type FenceRecord = z.infer<typeof fenceRecordSchema>;
type ClaimRecord = z.infer<typeof claimRecordSchema>;
type IndexEntry = z.infer<typeof indexEntrySchema>;
type IndexGeneration = z.infer<typeof indexGenerationSchema>;

export type StoreLayout = {
  root: string;
  locksDir: string;
  sessionsDir: string;
  claimsDir: string;
  stateDir: string;
  fencesDir: string;
  indexDir: string;
  indexGenerationsDir: string;
  indexPointer: string;
};

export type RunClaim = {
  root: string;
  runId: string;
  claimToken: string;
  main: NodeKey;
  checkpointId: string;
  generation: number;
  fence: string | null;
  createdAt: string;
};
export type PreparationAccess =
  | { readonly role: "owner"; readonly claim: RunClaim }
  | { readonly role: "join"; readonly runId: string };

export type PreparationResolution =
  | { readonly status: "published"; readonly receipt: ArtifactReceipt }
  | { readonly status: "in-progress"; readonly runId: string };

export type PreparationWaitOptions = {
  /** Absolute `performance.now()` deadline from this process. */
  readonly deadline: number;
  readonly signal: AbortSignal;
  /** Run the caller acquired or joined; any other run revokes the wait. */
  readonly expectedRunId: string;
};

export type PublishArtifact = {
  artifactId: string;
  kind: ArtifactKind;
  content: string | Uint8Array;
};

export type PublishOptions = {
  status?: ArtifactStatus;
  labels?: { title?: string; project?: string };
  publishedAt?: string;
};

export type PublishResult = {
  generationId: string;
  status: ArtifactStatus;
  artifactIds: string[];
  publishedAt: string;
  bytes: number;
};

export type DeleteResult = {
  deleted: boolean;
  removedArtifacts: number;
  tombstone: string;
};

export type ResolvedArtifact = {
  artifactId: string;
  kind: ArtifactKind;
  status: ArtifactStatus;
  sessionToken: string;
  generationId: string;
  absolutePath: string;
  bytes: number;
  publishedAt: string;
};

export type PublishedEntry = {
  artifactId: string;
  kind: ArtifactKind;
  status: ArtifactStatus;
  publishedAt: string;
  bytes: number;
};

export type PublishedPage = {
  entries: PublishedEntry[];
  nextCursor: string | null;
};

type SessionContext = {
  meta: SessionMeta;
  dir: string;
  metaPath: string;
  generationsDir: string;
  stagingDir: string;
};

type PreparedArtifact = {
  artifactId: string;
  kind: ArtifactKind;
  fileName: string;
  data: Buffer;
};

function randomHex(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

function parseIdentifier(value: unknown, code: string): string {
  const parsed = identifierSchema.safeParse(value);
  if (!parsed.success) throw new StoreError(code);
  return parsed.data;
}

function parseNodeKey(value: unknown, code: string): NodeKey {
  const parsed = nodeKeySchema.safeParse(value);
  if (!parsed.success) throw new StoreError(code);
  return parsed.data;
}

function parseRecord<T>(schema: z.ZodType<T>, buffer: Buffer, code: string): T {
  let value: unknown;
  try {
    value = JSON.parse(buffer.toString("utf8"));
  } catch {
    throw new StoreError(code);
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new StoreError(code);
  return parsed.data;
}

function resolveTimestamp(value: string | undefined): string {
  if (value === undefined) return new Date().toISOString();
  const parsed = timestampSchema.safeParse(value);
  if (!parsed.success) throw new StoreError("INVALID_TIMESTAMP");
  return parsed.data;
}

function resolveStatus(value: ArtifactStatus | undefined): ArtifactStatus {
  if (value === undefined) return "complete";
  if (value === "complete" || value === "partial" || value === "failed")
    return value;
  throw new StoreError("INVALID_STATUS");
}

function countEntries(entries: IndexEntry[]): IndexGeneration["counts"] {
  return {
    artifacts: entries.length,
    sessions: new Set(entries.map((entry) => entry.sessionToken)).size,
  };
}

export function storeLayout(root: string): StoreLayout {
  return {
    root,
    locksDir: path.join(root, "locks"),
    sessionsDir: path.join(root, "sessions"),
    claimsDir: path.join(root, "claims"),
    stateDir: path.join(root, "state"),
    fencesDir: path.join(root, "fences"),
    indexDir: path.join(root, "index"),
    indexGenerationsDir: path.join(root, "index", "generations"),
    indexPointer: path.join(root, "index", "current"),
  };
}

/** Deterministic neutral directory token; full identifiers stay in metadata. */
export function sessionToken(main: NodeKey): string {
  const key = parseNodeKey(main, "INVALID_NODE_KEY");
  return createHash("sha256")
    .update(`${key.hostId}\u0000${key.sessionId}`, "utf8")
    .digest("hex")
    .slice(0, 32);
}

export async function prepareStore(
  root: string,
  bound?: ObservationBound,
): Promise<StoreLayout> {
  assertObservationBound(bound);
  const resolved = await ensurePrivateRoot(root, bound);
  const layout = storeLayout(resolved);
  for (const directory of [
    layout.locksDir,
    layout.claimsDir,
    layout.sessionsDir,
    layout.stateDir,
    layout.fencesDir,
    layout.indexDir,
    layout.indexGenerationsDir,
  ]) {
    assertObservationBound(bound);
    await ensurePrivateDirectory(directory, bound);
  }
  return layout;
}

async function releaseLock(lockPath: string, token: string): Promise<void> {
  const buffer = await readPrivateFileOptional(
    lockPath,
    MAX_RECORD_BYTES,
  ).catch(() => null);
  if (!buffer) return;
  try {
    const record = JSON.parse(buffer.toString("utf8")) as { token?: unknown };
    if (record.token !== token) return;
  } catch {
    return;
  }
  await fsp.rm(lockPath, { force: true });
}

async function withFileLock<T>(
  locksDir: string,
  name: string,
  task: () => Promise<T>,
  bound?: ObservationBound,
): Promise<T> {
  const lockPath = path.join(locksDir, `${name}.lock`);
  const token = randomHex(16);
  const wallDeadline = Date.now() + STORE_LOCK_TIMEOUT_MS;
  const flags =
    fs.constants.O_WRONLY |
    fs.constants.O_CREAT |
    fs.constants.O_EXCL |
    NOFOLLOW_FLAG;
  for (;;) {
    assertObservationBound(bound);
    try {
      const handle = await fsp.open(lockPath, flags, PRIVATE_FILE_MODE);
      try {
        assertObservationBound(bound);
      } catch (error) {
        await handle.close();
        await fsp.rm(lockPath, { force: true }).catch(() => undefined);
        throw error;
      }
      try {
        await handle.writeFile(
          JSON.stringify({
            schemaVersion: 1,
            token,
            pid: process.pid,
            at: new Date().toISOString(),
          }),
        );
        await handle.sync();
      } finally {
        await handle.close();
      }
      assertObservationBound(bound);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        await releaseLock(lockPath, token).catch(() => undefined);
        throw error;
      }
      const wallRemaining = wallDeadline - Date.now();
      const boundRemaining = bound
        ? bound.deadline - performance.now()
        : Number.POSITIVE_INFINITY;
      const remaining = Math.min(wallRemaining, boundRemaining);
      if (remaining <= 0) {
        if (boundRemaining <= 0) throw new StoreError("DEADLINE_EXCEEDED");
        throw new StoreError("STORE_BUSY");
      }
      try {
        await delay(
          Math.min(LOCK_RETRY_MS, remaining),
          undefined,
          bound ? { signal: bound.signal } : undefined,
        );
      } catch {
        if (bound?.signal.aborted) throw new StoreError("ABORTED");
        throw new StoreError("DEADLINE_EXCEEDED");
      }
    }
  }
  try {
    assertObservationBound(bound);
    return await task();
  } finally {
    await releaseLock(lockPath, token);
  }
}

/**
 * Serialize root-wide mutations before the per-session lock. The stable order
 * prevents index/capacity lost updates and avoids cross-session lock cycles.
 * A supplied bound caps lock acquisition and is honored by bounded reads.
 */
export async function withSessionLock<T>(
  root: string,
  main: NodeKey,
  task: (layout: StoreLayout, token: string) => Promise<T>,
  bound?: ObservationBound,
): Promise<T> {
  const layout = await prepareStore(root, bound);
  const token = sessionToken(main);
  return await withFileLock(
    layout.locksDir,
    "root-mutation",
    async () =>
      await withFileLock(
        layout.locksDir,
        token,
        () => task(layout, token),
        bound,
      ),
    bound,
  );
}

async function readMeta(
  layout: StoreLayout,
  token: string,
): Promise<SessionMeta | null> {
  const buffer = await readPrivateFileOptional(
    path.join(layout.sessionsDir, token, "meta.json"),
    MAX_META_BYTES,
  );
  if (!buffer) return null;
  return parseRecord(sessionMetaSchema, buffer, "INVALID_SESSION_META");
}

async function readClaimRecord(
  layout: StoreLayout,
  token: string,
  bound?: ObservationBound,
): Promise<ClaimRecord | null> {
  const buffer = await readPrivateFileOptional(
    path.join(layout.claimsDir, `${token}.json`),
    MAX_RECORD_BYTES,
    bound,
  );
  if (!buffer) return null;
  return parseRecord(claimRecordSchema, buffer, "INVALID_CLAIM_RECORD");
}

async function readFence(
  layout: StoreLayout,
  token: string,
  bound?: ObservationBound,
): Promise<FenceRecord | null> {
  const buffer = await readPrivateFileOptional(
    path.join(layout.fencesDir, `${token}.json`),
    MAX_RECORD_BYTES,
    bound,
  );
  if (!buffer) return null;
  return parseRecord(fenceRecordSchema, buffer, "INVALID_FENCE_RECORD");
}

async function ensureSession(
  layout: StoreLayout,
  main: NodeKey,
  token: string,
  options: { create: boolean },
): Promise<SessionContext | null> {
  const dir = path.join(layout.sessionsDir, token);
  let dirStats = await lstatOrNull(dir);
  if (!dirStats) {
    if (!options.create) return null;
    await createPrivateDirectory(dir);
    dirStats = await fsp.lstat(dir);
  } else {
    assertPrivateDirectory(dir, dirStats);
  }
  if (dirStats.isSymbolicLink() || !dirStats.isDirectory())
    throw new StoreError(
      "UNSAFE_PATH",
      "Session path is not a real directory.",
    );
  const metaPath = path.join(dir, "meta.json");
  const metaBuffer = await readPrivateFileOptional(metaPath, MAX_META_BYTES);
  const generationsDir = path.join(dir, "generations");
  const stagingDir = path.join(dir, "staging");
  if (!metaBuffer) {
    if (!options.create) return null;
    const generations = await ensurePrivateDirectory(generationsDir);
    await ensurePrivateDirectory(stagingDir);
    const now = new Date().toISOString();
    const meta: SessionMeta = {
      schemaVersion: 1,
      main: { ...main },
      createdAt: now,
      updatedAt: now,
      generationCount: 0,
      lastGenerationId: null,
      dev: Number(dirStats.dev),
      ino: Number(dirStats.ino),
      generations,
    };
    await writePrivateFileAtomic(metaPath, JSON.stringify(meta));
    return { meta, dir, metaPath, generationsDir, stagingDir };
  }
  const meta = parseRecord(
    sessionMetaSchema,
    metaBuffer,
    "INVALID_SESSION_META",
  );
  if (!sameNodeKey(meta.main, main))
    throw new StoreError(
      "SESSION_MISMATCH",
      "Session metadata belongs to another key.",
    );
  const expected: DirectoryIdentity = { dev: meta.dev, ino: meta.ino };
  await assertDirectoryIdentity(dir, expected);
  await assertDirectoryIdentity(generationsDir, meta.generations);
  await ensurePrivateDirectory(stagingDir);
  return { meta, dir, metaPath, generationsDir, stagingDir };
}

async function sweepStaging(stagingDir: string): Promise<void> {
  const entries = await fsp
    .readdir(stagingDir, { withFileTypes: true })
    .catch(() => []);
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const full = path.join(stagingDir, entry.name);
    const stats = await lstatOrNull(full);
    if (!stats || stats.isSymbolicLink() || !stats.isDirectory()) continue;
    if (Date.now() - stats.mtimeMs > STAGING_STALE_MS)
      await removePrivateTree(full);
  }
}

async function removeRunStaging(
  stagingDir: string,
  runId: string,
): Promise<void> {
  const entries = await fsp
    .readdir(stagingDir, { withFileTypes: true })
    .catch(() => []);
  for (const entry of entries) {
    if (entry.name !== runId && !entry.name.startsWith(`${runId}-`)) continue;
    await removePrivateTree(path.join(stagingDir, entry.name));
  }
}

async function readIndex(
  layout: StoreLayout,
  bound?: ObservationBound,
): Promise<IndexGeneration | null> {
  const pointer = await readPrivateFileOptional(
    layout.indexPointer,
    MAX_INDEX_POINTER_BYTES,
    bound,
  );
  if (!pointer) return null;
  const name = pointer.toString("utf8").trim();
  if (!/^[a-z0-9][a-z0-9-]{0,63}\.json$/.test(name))
    throw new StoreError("INDEX_CORRUPT");
  const buffer = await readPrivateFileOptional(
    path.join(layout.indexGenerationsDir, name),
    MAX_INDEX_BYTES,
    bound,
  );
  if (!buffer) throw new StoreError("INDEX_CORRUPT");
  return parseRecord(indexGenerationSchema, buffer, "INDEX_CORRUPT");
}

async function writeIndexGeneration(
  layout: StoreLayout,
  index: IndexGeneration,
): Promise<void> {
  const serialized = JSON.stringify(index);
  const bytes = Buffer.byteLength(serialized, "utf8");
  if (bytes > MAX_INDEX_BYTES) throw new StoreError("INDEX_TOO_LARGE");
  await assertStoreCapacity(layout.root, bytes + MAX_INDEX_POINTER_BYTES);
  const name = `${Date.now().toString(36)}-${randomHex(6)}.json`;
  await writePrivateFileAtomic(
    path.join(layout.indexGenerationsDir, name),
    serialized,
  );
  await writePrivateFileAtomic(layout.indexPointer, name);
  try {
    const files = await fsp.readdir(layout.indexGenerationsDir);
    const ranked: Array<{ file: string; mtime: number }> = [];
    for (const file of files) {
      if (file === name) continue;
      const stats = await lstatOrNull(
        path.join(layout.indexGenerationsDir, file),
      );
      if (stats?.isFile()) ranked.push({ file, mtime: stats.mtimeMs });
    }
    ranked.sort((left, right) => right.mtime - left.mtime);
    for (const stale of ranked.slice(INDEX_GENERATIONS_KEPT - 1))
      await removePrivateFile(
        path.join(layout.indexGenerationsDir, stale.file),
        MAX_INDEX_BYTES,
      );
  } catch {
    // Index pruning is post-commit maintenance; never roll back published data.
  }
}

async function measureStore(
  root: string,
): Promise<{ generations: number; bytes: number }> {
  let generations = 0;
  let bytes = 0;
  const walk = async (directory: string, depth: number): Promise<void> => {
    if (depth > MAX_MEASURE_DEPTH) throw new StoreError("STORE_DEPTH_LIMIT");
    const entries = await fsp.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      const stats = await fsp.lstat(full);
      if (stats.isSymbolicLink()) throw new StoreError("UNSAFE_PATH");
      if (stats.isDirectory()) await walk(full, depth + 1);
      else if (stats.isFile()) bytes += Number(stats.size);
      else throw new StoreError("UNSAFE_PATH");
    }
  };
  const sessions = await lstatOrNull(path.join(root, "sessions"));
  if (sessions?.isDirectory() && !sessions.isSymbolicLink()) {
    for (const entry of await fsp.readdir(path.join(root, "sessions"), {
      withFileTypes: true,
    })) {
      if (!entry.isDirectory()) continue;
      const generationDir = path.join(
        root,
        "sessions",
        entry.name,
        "generations",
      );
      const stats = await lstatOrNull(generationDir);
      if (!stats) continue;
      if (stats.isSymbolicLink() || !stats.isDirectory())
        throw new StoreError("UNSAFE_PATH");
      generations += (
        await fsp.readdir(generationDir, { withFileTypes: true })
      ).filter((child) => child.isDirectory()).length;
    }
  }
  await walk(root, 0);
  return { generations, bytes };
}
/** Reserve bounded serialized state while the root mutation lock is held. */
export async function assertStoreCapacity(
  root: string,
  additionalBytes: number,
): Promise<void> {
  if (
    !Number.isSafeInteger(additionalBytes) ||
    additionalBytes < 0 ||
    additionalBytes > STORE_LIMITS.bytes
  )
    throw new StoreError("STORE_BYTE_LIMIT");
  const measured = await measureStore(root);
  if (measured.bytes + additionalBytes > STORE_LIMITS.bytes)
    throw new StoreError("STORE_BYTE_LIMIT");
}

function toPublicClaim(record: ClaimRecord, root: string): RunClaim {
  return {
    root,
    runId: record.runId,
    claimToken: record.claimToken,
    main: { ...record.main },
    checkpointId: record.checkpointId,
    generation: record.generation,
    fence: record.fence,
    createdAt: record.createdAt,
  };
}

function validateClaim(claim: RunClaim): {
  main: NodeKey;
  runId: string;
  claimToken: string;
  checkpointId: string;
  generation: number;
} {
  if (claim === null || typeof claim !== "object")
    throw new StoreError("INVALID_CLAIM");
  if (typeof claim.root !== "string" || claim.root.length === 0)
    throw new StoreError("INVALID_CLAIM");
  if (
    typeof claim.claimToken !== "string" ||
    !/^[0-9a-f]{64}$/.test(claim.claimToken)
  )
    throw new StoreError("INVALID_CLAIM");
  const generation = claim.generation;
  if (
    typeof generation !== "number" ||
    !Number.isInteger(generation) ||
    generation < 1
  )
    throw new StoreError("INVALID_CLAIM");
  return {
    main: parseNodeKey(claim.main, "INVALID_CLAIM"),
    runId: parseIdentifier(claim.runId, "INVALID_CLAIM"),
    claimToken: claim.claimToken,
    checkpointId: parseIdentifier(claim.checkpointId, "INVALID_CLAIM"),
    generation,
  };
}

/**
 * A committed publication is identified by any indexed entry for its run, not
 * by a report: the store accepts arbitrary supported artifact sets.
 */
function findCommittedRun(
  index: IndexGeneration | null,
  token: string,
  runId: string,
  fence: FenceRecord | null,
): IndexEntry | null {
  return (
    index?.entries.find(
      (entry) =>
        entry.sessionToken === token &&
        entry.runId === runId &&
        isCurrentGeneration(entry, fence),
    ) ?? null
  );
}

/**
 * The swapped index pointer is authoritative. Reconcile a claim whose state
 * write failed after commit so later cancel/acquire decisions see the committed
 * run instead of an active, cancellable claim.
 */
async function reconcileCommittedClaim(
  layout: StoreLayout,
  token: string,
  record: ClaimRecord,
  committed: IndexEntry,
): Promise<void> {
  if (
    record.state === "published" &&
    record.publishedGenerationId === committed.generationId
  )
    return;
  const published: ClaimRecord = {
    ...record,
    state: "published",
    heartbeatAt: committed.publishedAt,
    publishedGenerationId: committed.generationId,
  };
  await writePrivateFileAtomic(
    path.join(layout.claimsDir, `${token}.json`),
    JSON.stringify(published),
  );
}

function publishedGenerationError(
  message: string,
  generationId: string | undefined,
): StoreError {
  const error = new StoreError("RUN_ALREADY_PUBLISHED", message);
  error.generationId = generationId;
  return error;
}

/**
 * One fence-authority predicate for every persisted record that names a
 * deletion generation: an index entry or claim is authoritative only while it
 * carries the session's current tombstone (or both are null before any
 * deletion). A partial deletion leaves stale records; they must never be
 * presented as current, but a claim created under the current tombstone may
 * still publish.
 */
function isCurrentGeneration(
  record: { fence?: string | null },
  fence: FenceRecord | null,
): boolean {
  return (record.fence ?? null) === (fence?.tombstone ?? null);
}

/**
 * Shared read projection: keep only entries that still carry their session's
 * current generation. One fence read per distinct session, so listing,
 * resolution, publication uniqueness, and preparation all agree on what is
 * available.
 */
async function currentIndexEntries(
  layout: StoreLayout,
  entries: readonly IndexEntry[],
): Promise<IndexEntry[]> {
  const fences = new Map<string, FenceRecord | null>();
  const current: IndexEntry[] = [];
  for (const entry of entries) {
    if (!fences.has(entry.sessionToken))
      fences.set(
        entry.sessionToken,
        await readFence(layout, entry.sessionToken),
      );
    if (isCurrentGeneration(entry, fences.get(entry.sessionToken) ?? null))
      current.push(entry);
  }
  return current;
}

/**
 * Claim the single run allowed for a main session.
 *
 * - Identical checkpoint while active returns the same run and owner handle.
 * - A different checkpoint while active is refused (one concurrent run).
 * - A published checkpoint is terminal; a new checkpoint may open a new run.
 * - A stale claim is never replaced automatically; the user cancels first.
 */
export async function claimRun(
  root: string,
  main: NodeKey,
  checkpointId: string,
): Promise<RunClaim> {
  const checkpoint = parseIdentifier(checkpointId, "INVALID_CHECKPOINT_ID");
  const key = parseNodeKey(main, "INVALID_NODE_KEY");
  return await withSessionLock(root, key, async (layout, token) => {
    const sessionDir = path.join(layout.sessionsDir, token);
    if (!(await lstatOrNull(sessionDir)))
      await assertStoreCapacity(layout.root, MAX_META_BYTES);
    const session = await ensureSession(layout, key, token, { create: true });
    if (!session) throw new StoreError("SESSION_UNAVAILABLE");
    await sweepStaging(session.stagingDir);
    const fence = await readFence(layout, token);
    const existing = await readClaimRecord(layout, token);
    if (existing) {
      if (
        existing.state !== "canceled" &&
        !isCurrentGeneration(existing, fence)
      )
        throw new StoreError(
          "CLAIM_REVOKED",
          "This run was revoked by a deletion or cancellation; re-run deletion or cancel explicitly to recover.",
        );
      const committed = findCommittedRun(
        await readIndex(layout),
        token,
        existing.runId,
        fence,
      );
      if (committed) {
        await reconcileCommittedClaim(layout, token, existing, committed).catch(
          () => undefined,
        );
        if (existing.checkpointId === checkpoint)
          throw publishedGenerationError(
            "This checkpoint already produced a published generation.",
            committed.generationId,
          );
      } else if (existing.state === "active") {
        if (Date.now() - Date.parse(existing.heartbeatAt) > CLAIM_STALE_MS)
          throw new StoreError("STALE_CLAIM");
        if (existing.checkpointId !== checkpoint)
          throw new StoreError("RUN_ACTIVE");
        return toPublicClaim(existing, layout.root);
      } else if (
        existing.state === "published" &&
        existing.checkpointId === checkpoint
      ) {
        throw publishedGenerationError(
          "This checkpoint already produced a published generation.",
          existing.publishedGenerationId,
        );
      }
    }
    const now = new Date().toISOString();
    const record: ClaimRecord = {
      schemaVersion: 1,
      state: "active",
      runId: randomUUID(),
      claimToken: randomHex(32),
      main: { ...key },
      checkpointId: checkpoint,
      generation: session.meta.generationCount + 1,
      fence: fence?.tombstone ?? null,
      createdAt: now,
      heartbeatAt: now,
    };
    await assertStoreCapacity(layout.root, MAX_RECORD_BYTES);
    await writePrivateFileAtomic(
      path.join(layout.claimsDir, `${token}.json`),
      JSON.stringify(record),
    );
    return toPublicClaim(record, layout.root);
  });
}

function receiptFromRun(entries: IndexEntry[], runId: string): ArtifactReceipt {
  const reports = entries.filter(
    (entry) => entry.runId === runId && entry.kind === "report",
  );
  if (reports.length !== 1)
    throw new StoreError("PREPARATION_RECEIPT_UNAVAILABLE");
  const report = reports[0];
  return artifactReceiptSchema.parse({
    schemaVersion: 1,
    artifactId: report.artifactId,
    runId,
    status: report.status,
    modelCalls: 0,
    outboundRequests: 0,
  });
}

/** Atomically grants one owner-only publication capability; joiners get only a run ID. */
export async function acquirePreparation(
  root: string,
  main: NodeKey,
  checkpointId: string,
): Promise<PreparationAccess> {
  const checkpoint = parseIdentifier(checkpointId, "INVALID_CHECKPOINT_ID");
  const key = parseNodeKey(main, "INVALID_NODE_KEY");
  return await withSessionLock(root, key, async (layout, token) => {
    const sessionDir = path.join(layout.sessionsDir, token);
    if (!(await lstatOrNull(sessionDir)))
      await assertStoreCapacity(layout.root, MAX_META_BYTES);
    const session = await ensureSession(layout, key, token, { create: true });
    if (!session) throw new StoreError("SESSION_UNAVAILABLE");
    const fence = await readFence(layout, token);
    const index = await readIndex(layout);
    const previous = index?.entries.find(
      (entry) =>
        entry.sessionToken === token &&
        entry.checkpointId === checkpoint &&
        entry.kind === "report" &&
        isCurrentGeneration(entry, fence),
    );
    if (previous) return { role: "join", runId: previous.runId };

    const existing = await readClaimRecord(layout, token);
    if (existing) {
      if (
        existing.state !== "canceled" &&
        !isCurrentGeneration(existing, fence)
      )
        throw new StoreError(
          "CLAIM_REVOKED",
          "This run was revoked by a deletion or cancellation; re-run deletion or cancel explicitly to recover.",
        );
      const committed = findCommittedRun(index, token, existing.runId, fence);
      if (committed) {
        await reconcileCommittedClaim(layout, token, existing, committed).catch(
          () => undefined,
        );
        if (existing.checkpointId === checkpoint)
          throw publishedGenerationError(
            "This checkpoint already produced a published generation.",
            committed.generationId,
          );
      } else if (existing.state === "active") {
        if (Date.now() - Date.parse(existing.heartbeatAt) > CLAIM_STALE_MS)
          throw new StoreError("STALE_CLAIM");
        if (existing.checkpointId !== checkpoint)
          throw new StoreError("RUN_ACTIVE");
        return { role: "join", runId: existing.runId };
      }
    }

    const now = new Date().toISOString();
    const record: ClaimRecord = {
      schemaVersion: 1,
      state: "active",
      runId: randomUUID(),
      claimToken: randomHex(32),
      main: { ...key },
      checkpointId: checkpoint,
      generation: session.meta.generationCount + 1,
      fence: fence?.tombstone ?? null,
      createdAt: now,
      heartbeatAt: now,
    };
    await assertStoreCapacity(layout.root, MAX_RECORD_BYTES);
    await writePrivateFileAtomic(
      path.join(layout.claimsDir, `${token}.json`),
      JSON.stringify(record),
    );
    return { role: "owner", claim: toPublicClaim(record, layout.root) };
  });
}
/** Resolve only a report entry committed by the indexed run generation. */
export async function resolvePublishedPreparation(
  root: string,
  main: NodeKey,
  checkpointId: string,
  bound?: ObservationBound,
): Promise<PreparationResolution> {
  const checkpoint = parseIdentifier(checkpointId, "INVALID_CHECKPOINT_ID");
  const key = parseNodeKey(main, "INVALID_NODE_KEY");
  return await withSessionLock(
    root,
    key,
    async (layout, token) => {
      assertObservationBound(bound);
      const fence = await readFence(layout, token, bound);
      assertObservationBound(bound);
      const index = await readIndex(layout, bound);
      const report = index?.entries.find(
        (entry) =>
          entry.sessionToken === token &&
          entry.checkpointId === checkpoint &&
          entry.kind === "report" &&
          isCurrentGeneration(entry, fence),
      );
      assertObservationBound(bound);
      if (report)
        return {
          status: "published",
          receipt: receiptFromRun(
            (index?.entries ?? []).filter(
              (entry) =>
                entry.sessionToken === token &&
                isCurrentGeneration(entry, fence),
            ),
            report.runId,
          ),
        };
      const claim = await readClaimRecord(layout, token, bound);
      assertObservationBound(bound);
      if (!claim) throw new StoreError("RUN_NOT_FOUND");
      if (claim.checkpointId !== checkpoint)
        throw new StoreError("RUN_NOT_FOUND");
      if (!isCurrentGeneration(claim, fence))
        throw new StoreError(
          "CLAIM_REVOKED",
          "This run was revoked by a deletion or cancellation; re-run deletion or cancel explicitly to recover.",
        );
      if (claim.state !== "published") {
        const committed = findCommittedRun(index, token, claim.runId, fence);
        if (committed) throw new StoreError("PREPARATION_RECEIPT_UNAVAILABLE");
      }
      if (claim.state === "canceled") throw new StoreError("CLAIM_REVOKED");
      if (claim.state === "published")
        throw new StoreError("PREPARATION_RECEIPT_UNAVAILABLE");
      if (Date.now() - Date.parse(claim.heartbeatAt) > CLAIM_STALE_MS)
        throw new StoreError("STALE_CLAIM");
      assertObservationBound(bound);
      return { status: "in-progress", runId: claim.runId };
    },
    bound,
  );
}

/**
 * Settle one observation at the caller's absolute deadline or abort while the
 * started operation keeps ownership of anything it acquires. The operation is
 * not abandoned: its own bound checks stop it at the first late await, and its
 * `finally` blocks close file handles and release locks. A late settlement is
 * discarded, so it can never return a receipt.
 *
 * ES2022 target: `Promise.withResolvers` is not available.
 */
async function settleObservation<T>(
  bound: ObservationBound,
  start: () => Promise<T>,
): Promise<T> {
  assertObservationBound(bound);
  const operation = start();
  const remaining = bound.deadline - performance.now();
  if (remaining <= 0) {
    operation.catch(() => undefined);
    throw new StoreError("DEADLINE_EXCEEDED");
  }
  let timer: NodeJS.Timeout | undefined;
  let onAbort: (() => void) | undefined;
  const guard = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new StoreError("DEADLINE_EXCEEDED")),
      remaining,
    );
    timer.unref?.();
    onAbort = () => reject(new StoreError("ABORTED"));
    if (bound.signal.aborted) onAbort();
    else bound.signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    return await Promise.race([operation, guard]);
  } finally {
    clearTimeout(timer);
    if (onAbort) bound.signal.removeEventListener("abort", onAbort);
  }
}

/** Observe an existing local run without holding a lock while waiting or restarting it. */
export async function waitForPublishedPreparation(
  root: string,
  main: NodeKey,
  checkpointId: string,
  options: PreparationWaitOptions,
): Promise<ArtifactReceipt> {
  const validateOptions = (): void => {
    if (
      !options ||
      !options.signal ||
      typeof options.signal.aborted !== "boolean" ||
      !Number.isFinite(options.deadline) ||
      options.deadline <= performance.now() ||
      options.deadline - performance.now() > PREPARATION_WAIT_MAX_MS
    )
      throw new StoreError("PREPARATION_WAIT_DEADLINE");
    if (options.signal.aborted)
      throw new StoreError("PREPARATION_WAIT_ABORTED");
  };
  validateOptions();
  const expectedRunId = parseIdentifier(
    options.expectedRunId,
    "INVALID_RUN_ID",
  );
  const bound: ObservationBound = {
    deadline: options.deadline,
    signal: options.signal,
  };
  const mapObservationError = (error: unknown): never => {
    if (error instanceof StoreError) {
      if (error.code === "RUN_NOT_FOUND") throw new StoreError("CLAIM_REVOKED");
      if (error.code === "DEADLINE_EXCEEDED")
        throw new StoreError("PREPARATION_WAIT_DEADLINE");
      if (error.code === "ABORTED")
        throw new StoreError("PREPARATION_WAIT_ABORTED");
    }
    throw error;
  };
  const observeOnce = async (): Promise<PreparationResolution> => {
    try {
      return await settleObservation(bound, () =>
        resolvePublishedPreparation(root, main, checkpointId, bound),
      );
    } catch (error) {
      return mapObservationError(error);
    }
  };
  const initial = await observeOnce();
  validateOptions();
  if (initial.status === "published") {
    if (initial.receipt.runId !== expectedRunId)
      throw new StoreError("CLAIM_REVOKED");
    return initial.receipt;
  }
  if (initial.runId !== expectedRunId) throw new StoreError("CLAIM_REVOKED");
  for (let read = 1; read < PREPARATION_WAIT_READS; read += 1) {
    validateOptions();
    if (options.deadline - performance.now() < PREPARATION_WAIT_INTERVAL_MS)
      throw new StoreError("PREPARATION_WAIT_DEADLINE");
    try {
      await delay(PREPARATION_WAIT_INTERVAL_MS, undefined, {
        signal: options.signal,
      });
    } catch {
      throw new StoreError("PREPARATION_WAIT_ABORTED");
    }
    validateOptions();
    const result = await observeOnce();
    validateOptions();
    const resultRunId =
      result.status === "published" ? result.receipt.runId : result.runId;
    if (expectedRunId !== resultRunId) throw new StoreError("CLAIM_REVOKED");
    if (result.status === "published") return result.receipt;
  }
  throw new StoreError("PREPARATION_WAIT_READ_LIMIT");
}

function prepareArtifacts(artifacts: PublishArtifact[]): PreparedArtifact[] {
  if (!Array.isArray(artifacts) || artifacts.length === 0)
    throw new StoreError("INVALID_ARTIFACTS");
  const prepared: PreparedArtifact[] = [];
  const seenIds = new Set<string>();
  const seenKinds = new Set<string>();
  let totalBytes = 0;
  for (const artifact of artifacts) {
    if (artifact === null || typeof artifact !== "object")
      throw new StoreError("INVALID_ARTIFACTS");
    const artifactId = parseIdentifier(
      artifact.artifactId,
      "INVALID_ARTIFACT_ID",
    );
    const kind = artifact.kind;
    if (
      typeof kind !== "string" ||
      !Object.prototype.hasOwnProperty.call(ARTIFACT_FILES, kind)
    )
      throw new StoreError("INVALID_ARTIFACTS");
    if (seenIds.has(artifactId) || seenKinds.has(kind))
      throw new StoreError("INVALID_ARTIFACTS");
    let data: Buffer;
    if (typeof artifact.content === "string")
      data = Buffer.from(artifact.content, "utf8");
    else if (artifact.content instanceof Uint8Array)
      data = Buffer.from(artifact.content);
    else throw new StoreError("INVALID_ARTIFACTS");
    totalBytes += data.length;
    if (totalBytes > DEFAULT_LIMITS.outputBytes)
      throw new StoreError("ARTIFACT_TOO_LARGE");
    seenIds.add(artifactId);
    seenKinds.add(kind);
    prepared.push({
      artifactId,
      kind: kind as ArtifactKind,
      fileName: ARTIFACT_FILES[kind as ArtifactKind],
      data,
    });
  }
  return prepared;
}

function validateLabels(labels: PublishOptions["labels"]): void {
  if (labels === undefined) return;
  if (labels === null || typeof labels !== "object" || Array.isArray(labels))
    throw new StoreError("INVALID_LABELS");
  for (const key of Object.keys(labels)) {
    if (key !== "title" && key !== "project")
      throw new StoreError("INVALID_LABELS");
  }
  for (const value of [labels.title, labels.project]) {
    if (value !== undefined && !labelSchema.safeParse(value).success)
      throw new StoreError("INVALID_LABELS");
  }
}

/**
 * Publish a complete generation for the claimed run.
 *
 * Ordering inside the session lock: recheck claim/fence, stage artifacts
 * privately on the same filesystem, flush and close, rename the staging
 * directory, then atomically replace the neutral index pointer. A failure
 * before the pointer swap removes its own generation so nothing partial is
 * advertised. Only this claim can publish; canceled/deleted claims cannot.
 */
export async function publishRun(
  claim: RunClaim,
  artifacts: PublishArtifact[],
  options: PublishOptions = {},
): Promise<PublishResult> {
  const identity = validateClaim(claim);
  const key = identity.main;
  return await withSessionLock(claim.root, key, async (layout, token) => {
    const session = await ensureSession(layout, key, token, { create: false });
    if (!session) throw new StoreError("CLAIM_REVOKED");
    const record = await readClaimRecord(layout, token);
    if (
      !record ||
      record.runId !== identity.runId ||
      record.claimToken !== identity.claimToken ||
      record.checkpointId !== identity.checkpointId ||
      record.generation !== identity.generation
    )
      throw new StoreError("CLAIM_REVOKED");
    const fence = await readFence(layout, token);
    if (!isCurrentGeneration(record, fence))
      throw new StoreError("CLAIM_REVOKED");
    if (record.state === "canceled") throw new StoreError("CLAIM_REVOKED");
    if (record.state === "published") throw new StoreError("CLAIM_CONSUMED");
    const committedIndex = await readIndex(layout);
    const committedRun = findCommittedRun(
      committedIndex,
      token,
      record.runId,
      fence,
    );
    if (committedRun) {
      await reconcileCommittedClaim(layout, token, record, committedRun);
      throw new StoreError("CLAIM_CONSUMED");
    }
    if (Date.now() - Date.parse(record.heartbeatAt) > CLAIM_STALE_MS)
      throw new StoreError("CLAIM_STALE");

    const prepared = prepareArtifacts(artifacts);
    validateLabels(options.labels);
    const status = resolveStatus(options.status);
    const publishedAt = resolveTimestamp(options.publishedAt);
    const artifactBytes = prepared.reduce(
      (total, artifact) => total + artifact.data.length,
      0,
    );
    // Uniqueness is checked against every persisted entry before anything is
    // staged. IDs are run-derived, so stale rows cannot collide with a fresh
    // run; this avoids reading other sessions' fences inside the commit window.
    const artifactIds = new Set(
      (committedIndex?.entries ?? []).map((entry) => entry.artifactId),
    );
    await removeRunStaging(session.stagingDir, claim.runId);

    const measured = await measureStore(layout.root);
    if (measured.generations + 1 > STORE_LIMITS.generations)
      throw new StoreError("STORE_GENERATION_LIMIT");

    const stageDir = path.join(
      session.stagingDir,
      `${claim.runId}-${randomHex(4)}`,
    );
    const generationId = `${String(session.meta.generationCount + 1).padStart(
      6,
      "0",
    )}-${randomHex(6)}`;
    const generationDir = path.join(session.generationsDir, generationId);
    const publicationReserve =
      artifactBytes +
      MAX_INDEX_BYTES +
      MAX_META_BYTES +
      MAX_RECORD_BYTES +
      2 * MAX_INDEX_POINTER_BYTES;
    if (measured.bytes + publicationReserve > STORE_LIMITS.bytes)
      throw new StoreError("STORE_BYTE_LIMIT");
    let published = false;
    await createPrivateDirectory(stageDir);
    try {
      for (const artifact of prepared)
        await writePrivateFileExclusive(
          path.join(stageDir, artifact.fileName),
          artifact.data,
        );
      await syncDirectory(stageDir);
      await fsp.rename(stageDir, generationDir);
      await syncDirectory(session.generationsDir);

      const index = committedIndex;
      const entries: IndexEntry[] = [...(index?.entries ?? [])];
      for (const artifact of prepared) {
        if (artifactIds.has(artifact.artifactId))
          throw new StoreError("ARTIFACT_ID_EXISTS");
        artifactIds.add(artifact.artifactId);
        entries.push({
          artifactId: artifact.artifactId,
          sessionToken: token,
          generationId,
          runId: record.runId,
          checkpointId: record.checkpointId,
          kind: artifact.kind,
          status,
          publishedAt,
          bytes: artifact.data.length,
          fence: record.fence ?? null,
        });
      }
      const nextIndex: IndexGeneration = {
        schemaVersion: 1,
        generation: (index?.generation ?? 0) + 1,
        updatedAt: publishedAt,
        counts: countEntries(entries),
        entries,
      };
      const indexBytes = Buffer.byteLength(JSON.stringify(nextIndex), "utf8");
      if (indexBytes > MAX_INDEX_BYTES) throw new StoreError("INDEX_TOO_LARGE");
      const afterStaging = await measureStore(layout.root);
      const metadataReserve =
        MAX_INDEX_POINTER_BYTES * 2 + MAX_META_BYTES + MAX_RECORD_BYTES;
      if (
        afterStaging.bytes + indexBytes + metadataReserve >
        STORE_LIMITS.bytes
      )
        throw new StoreError("STORE_BYTE_LIMIT");
      await writeIndexGeneration(layout, nextIndex);
      published = true;

      const nextMeta: SessionMeta = {
        ...session.meta,
        updatedAt: publishedAt,
        generationCount: session.meta.generationCount + 1,
        lastGenerationId: generationId,
        ...(options.labels
          ? { labels: { ...(session.meta.labels ?? {}), ...options.labels } }
          : {}),
      };
      await writePrivateFileAtomic(session.metaPath, JSON.stringify(nextMeta));
      await writePrivateFileAtomic(
        path.join(session.dir, "current"),
        generationId,
      );
      const consumed: ClaimRecord = {
        ...record,
        state: "published",
        heartbeatAt: publishedAt,
        publishedGenerationId: generationId,
      };
      await writePrivateFileAtomic(
        path.join(layout.claimsDir, `${token}.json`),
        JSON.stringify(consumed),
      );
      return {
        generationId,
        status,
        artifactIds: prepared.map((artifact) => artifact.artifactId),
        publishedAt,
        bytes: artifactBytes,
      };
    } finally {
      await removePrivateTree(stageDir).catch(() => undefined);
      let visible = published;
      if (!visible) {
        try {
          visible =
            (await readIndex(layout))?.entries.some(
              (entry) =>
                entry.runId === record.runId &&
                entry.generationId === generationId,
            ) ?? false;
        } catch {
          visible = true;
        }
      }
      if (!visible)
        await removePrivateTree(generationDir).catch(() => undefined);
    }
  });
}

/** Cancel an active claim. Published generations are not cancellable. */
export async function cancelRun(claim: RunClaim): Promise<void> {
  const identity = validateClaim(claim);
  const key = identity.main;
  await withSessionLock(claim.root, key, async (layout, token) => {
    const record = await readClaimRecord(layout, token);
    if (!record) return;
    if (
      record.runId !== identity.runId ||
      record.claimToken !== identity.claimToken
    )
      throw new StoreError("CLAIM_REVOKED");
    const fence = await readFence(layout, token);
    const committed = findCommittedRun(
      await readIndex(layout),
      token,
      record.runId,
      fence,
    );
    if (committed) {
      await reconcileCommittedClaim(layout, token, record, committed).catch(
        () => undefined,
      );
      throw new StoreError("CLAIM_CONSUMED");
    }
    if (record.state === "published" && isCurrentGeneration(record, fence))
      throw new StoreError("CLAIM_CONSUMED");
    if (record.state === "active" || record.state === "published") {
      const now = new Date().toISOString();
      const canceled: ClaimRecord = {
        ...record,
        state: "canceled",
        heartbeatAt: now,
        canceledAt: now,
        cancelReason: "user",
      };
      await assertStoreCapacity(layout.root, MAX_RECORD_BYTES);
      await writePrivateFileAtomic(
        path.join(layout.claimsDir, `${token}.json`),
        JSON.stringify(canceled),
      );
    }
    const session = await ensureSession(layout, key, token, { create: false });
    if (session) await removeRunStaging(session.stagingDir, record.runId);
  });
}

/**
 * Manual retention deletion. Writes the tombstone first so every claim issued
 * before this point is invalid, then removes managed artifacts and index
 * entries. Source transcripts and unrelated files are untouched.
 */
export async function deleteSession(
  root: string,
  main: NodeKey,
): Promise<DeleteResult> {
  const key = parseNodeKey(main, "INVALID_NODE_KEY");
  return await withSessionLock(root, key, async (layout, token) => {
    const index = await readIndex(layout);
    const remaining = index
      ? index.entries.filter((entry) => entry.sessionToken !== token)
      : [];
    const removedArtifacts = index
      ? index.entries.length - remaining.length
      : 0;
    const meta = await readMeta(layout, token);
    const sessionDir = path.join(layout.sessionsDir, token);
    const now = new Date().toISOString();
    const fence: FenceRecord = {
      schemaVersion: 1,
      tombstone: randomHex(16),
      deletedAt: now,
    };
    const fenceBody = JSON.stringify(fence);
    // Retention deletion must start near the byte cap. Reserve only the
    // control writes that precede freeing managed data; the index rewrite
    // happens after the session tree is removed.
    await assertStoreCapacity(
      layout.root,
      Buffer.byteLength(fenceBody, "utf8") +
        MAX_RECORD_BYTES +
        MAX_INDEX_POINTER_BYTES,
    );
    await writePrivateFileAtomic(
      path.join(layout.fencesDir, `${token}.json`),
      fenceBody,
    );
    const claimPath = path.join(layout.claimsDir, `${token}.json`);
    const claimBuffer = await readPrivateFileOptional(
      claimPath,
      MAX_RECORD_BYTES,
    );
    if (claimBuffer) {
      const record = parseRecord(
        claimRecordSchema,
        claimBuffer,
        "INVALID_CLAIM_RECORD",
      );
      if (record.state === "active")
        await writePrivateFileAtomic(
          claimPath,
          JSON.stringify({
            ...record,
            state: "canceled",
            heartbeatAt: now,
            canceledAt: now,
            cancelReason: "deleted",
          }),
        );
      await removePrivateFile(claimPath, MAX_RECORD_BYTES);
    }
    const nextIndex: IndexGeneration | null =
      index && removedArtifacts > 0
        ? {
            schemaVersion: 1,
            generation: index.generation + 1,
            updatedAt: now,
            counts: countEntries(remaining),
            entries: remaining,
          }
        : null;
    // Prefer dropping the entries before removing data so deleted artifacts
    // are never listed. Near the cap this reservation can fail; then freeing
    // the session first makes the same bounded rewrite fit.
    let indexed = false;
    if (nextIndex) {
      try {
        await writeIndexGeneration(layout, nextIndex);
        indexed = true;
      } catch (error) {
        if (!(error instanceof StoreError && error.code === "STORE_BYTE_LIMIT"))
          throw error;
      }
    }

    if (meta) {
      await removePrivateTree(sessionDir, {
        dev: meta.dev,
        ino: meta.ino,
      });
    } else {
      const remnant = await lstatOrNull(sessionDir);
      if (remnant) {
        if (remnant.isSymbolicLink() || !remnant.isDirectory())
          throw new StoreError("UNSAFE_PATH");
        await removePrivateTree(sessionDir);
      }
    }

    if (nextIndex && !indexed) await writeIndexGeneration(layout, nextIndex);

    await removePrivateFile(
      path.join(layout.stateDir, `${token}.json`),
      MAX_META_BYTES,
    );
    try {
      await pruneIndexHistory(layout);
    } catch {
      throw new StoreError(
        "DELETE_INDEX_HISTORY_INCOMPLETE",
        "Session data removed; re-run delete to finish index history cleanup.",
      );
    }
    return {
      deleted: meta !== null,
      removedArtifacts,
      tombstone: fence.tombstone,
    };
  });
}

/**
 * Drop every retained index snapshot except the pointer target. Deletion uses
 * this so older generations cannot keep listing a removed session's neutral
 * IDs/timestamps; the current generation is authoritative and already rebuilt
 * without that session. Fence records persist by design as opaque residue.
 */
async function pruneIndexHistory(layout: StoreLayout): Promise<void> {
  const pointer = await readPrivateFileOptional(
    layout.indexPointer,
    MAX_INDEX_POINTER_BYTES,
  );
  if (!pointer) return;
  const keep = pointer.toString("utf8").trim();
  // Only a genuinely absent directory means there is nothing to prune; any
  // other enumeration failure is unknown history state and must reach the
  // delete wrapper so it reports DELETE_INDEX_HISTORY_INCOMPLETE.
  let files: string[];
  try {
    files = await fsp.readdir(layout.indexGenerationsDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  for (const file of files) {
    if (file === keep) continue;
    await removePrivateFile(
      path.join(layout.indexGenerationsDir, file),
      MAX_INDEX_BYTES,
    );
  }
}

/** Resolve one neutral artifact ID to a validated owner-private path. */
export async function resolveArtifact(
  root: string,
  artifactId: string,
): Promise<ResolvedArtifact> {
  const id = parseIdentifier(artifactId, "INVALID_ARTIFACT_ID");
  const layout = storeLayout(await verifyPrivateRoot(root));
  const index = await readIndex(layout);
  let entry: IndexEntry | null = null;
  for (const candidate of index?.entries ?? []) {
    if (candidate.artifactId !== id) continue;
    const fence = await readFence(layout, candidate.sessionToken);
    if (isCurrentGeneration(candidate, fence)) {
      entry = candidate;
      break;
    }
  }
  if (!entry) throw new StoreError("ARTIFACT_NOT_FOUND");
  const sessionDir = path.join(layout.sessionsDir, entry.sessionToken);
  const meta = await readMeta(layout, entry.sessionToken);
  if (!meta) throw new StoreError("ARTIFACT_MISSING");
  await assertDirectoryIdentity(sessionDir, {
    dev: meta.dev,
    ino: meta.ino,
  });
  await assertDirectoryIdentity(
    path.join(sessionDir, "generations"),
    meta.generations,
  );
  const generationDir = path.join(
    sessionDir,
    "generations",
    entry.generationId,
  );
  const generationStats = await lstatOrNull(generationDir);
  if (!generationStats) throw new StoreError("ARTIFACT_MISSING");
  assertPrivateDirectory(generationDir, generationStats);
  if (process.platform === "win32")
    await verifyWindowsPrivatePath(generationDir);
  const absolutePath = path.join(generationDir, ARTIFACT_FILES[entry.kind]);
  const stats = await lstatOrNull(absolutePath);
  if (!stats) throw new StoreError("ARTIFACT_MISSING");
  assertPrivateFile(absolutePath, stats);
  if (process.platform === "win32")
    await verifyWindowsPrivatePath(absolutePath);
  if (Number(stats.size) !== entry.bytes)
    throw new StoreError("ARTIFACT_CHANGED");
  return {
    artifactId: entry.artifactId,
    kind: entry.kind,
    status: entry.status,
    sessionToken: entry.sessionToken,
    generationId: entry.generationId,
    absolutePath,
    bytes: entry.bytes,
    publishedAt: entry.publishedAt,
  };
}

/** Bounded neutral index page; page size is fixed at 100. */
export async function listPublished(
  root: string,
  options: { limit?: number; cursor?: string } = {},
): Promise<PublishedPage> {
  const layout = storeLayout(await verifyPrivateRoot(root));
  const index = await readIndex(layout);
  if (!index) return { entries: [], nextCursor: null };
  // Filter before pagination so invalidated entries cannot occupy page slots
  // or cursor positions.
  const entries = await currentIndexEntries(layout, index.entries);
  const requested = options.limit ?? INDEX_PAGE_SIZE;
  const limit = Math.min(
    Math.max(
      Number.isFinite(requested) ? Math.trunc(requested) : INDEX_PAGE_SIZE,
      1,
    ),
    INDEX_PAGE_SIZE,
  );
  let start = 0;
  if (options.cursor !== undefined) {
    const cursor = parseIdentifier(options.cursor, "INVALID_CURSOR");
    const found = entries.findIndex((entry) => entry.artifactId === cursor);
    if (found < 0) throw new StoreError("INVALID_CURSOR");
    start = found + 1;
  }
  const page = entries.slice(start, start + limit).map((entry) => ({
    artifactId: entry.artifactId,
    kind: entry.kind,
    status: entry.status,
    publishedAt: entry.publishedAt,
    bytes: entry.bytes,
  }));
  const nextCursor =
    start + limit < entries.length && page.length > 0
      ? page[page.length - 1].artifactId
      : null;
  return { entries: page, nextCursor };
}
