import fs from "node:fs";
import fsp from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import {
  NOFOLLOW_FLAG,
  StoreError,
  ensurePrivateRoot,
  lstatOrNull,
  verifyWindowsPrivatePath,
  writePrivateFileAtomic,
} from "./platform-private";

/**
 * Version 4: the consent text now states that source-root and unsupported-store
 * paths are canonicalized (symlinks resolved, path metadata only) to refuse
 * aliases that would make an unsupported store readable. Version 3 added the
 * presence-only disclosure of unsupported provider stores. Every older record
 * fails closed and must be granted again.
 */
export const CONSENT_TEXT_VERSION = "4";

export const CONSENT_TEXT = `Retrospective collection runs entirely on your local machine.
Zero model calls and zero network requests are made.
All report files are stored with owner-only private permissions on disk.
Transcripts and session events are read only from the explicitly listed source roots.
Source root and unsupported-store paths are canonicalized (symlinks resolved) before consent, to refuse aliases that would make an unsupported store readable. This uses path metadata only; the check reads no transcript content.
Reports include the commands agents asked permission to run, with secrets removed on a best-effort basis. Check them before sharing a report.
Reports also read commit and file counts from git in each session's working folder, which is outside the listed source roots. Commit messages, file names and file contents are not stored.
You can revoke this consent and remove the record at any time by running:
  ags retrospective disable`;

export type ConsentRecord = {
  schemaVersion: 1;
  consentTextVersion: string;
  grantedAt: string;
  storeRoot: string;
  allowedSourceRoots: string[];
  storageRiskAcknowledged: true;
};

export type ConsentRead =
  | { state: "enabled"; record: ConsentRecord }
  | {
      state: "disabled";
      reason: "missing" | "invalid" | "permissive" | "symlink" | "version";
    };

const ISO_8601_WITH_TIMEZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;

/**
 * A consent record is a handful of JSON keys. Anything larger is not a record
 * this server wrote, and the cap bounds the bytes pulled from a descriptor
 * that a third party may be rewriting.
 */
const MAX_CONSENT_BYTES = 65_536;

/**
 * `O_NOFOLLOW` refuses a symlink swapped in after the path checks (ELOOP);
 * `O_NONBLOCK` keeps a FIFO swap from blocking the open/read. All trust
 * decisions are made against the OPEN descriptor, never the path.
 */
const CONSENT_READ_FLAGS =
  fs.constants.O_RDONLY | NOFOLLOW_FLAG | (fs.constants.O_NONBLOCK ?? 0);

function isAbsolutePath(candidate: string): boolean {
  if (typeof candidate !== "string" || candidate.length === 0) return false;
  if (candidate.includes("\0")) return false;
  return path.isAbsolute(candidate);
}

export const consentRecordSchema = z.strictObject({
  schemaVersion: z.literal(1),
  consentTextVersion: z.string().min(1),
  grantedAt: z
    .string()
    .regex(ISO_8601_WITH_TIMEZONE)
    .refine((val) => !Number.isNaN(Date.parse(val))),
  storeRoot: z.string().refine(isAbsolutePath),
  allowedSourceRoots: z
    .array(z.string().refine(isAbsolutePath))
    .min(1)
    .refine((roots) => new Set(roots).size === roots.length),
  storageRiskAcknowledged: z.literal(true),
});

export function consentFilePath(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  home: string = os.homedir(),
): string {
  if (platform === "win32") {
    const appData = env.APPDATA;
    const baseDir =
      appData && path.win32.isAbsolute(appData)
        ? appData
        : path.win32.join(home, "AppData", "Roaming");
    return path.win32.join(
      baseDir,
      "agent-skills-standard",
      "retrospective-consent.json",
    );
  }
  const xdg = env.XDG_CONFIG_HOME;
  const baseDir =
    xdg && path.posix.isAbsolute(xdg) ? xdg : path.posix.join(home, ".config");
  return path.posix.join(
    baseDir,
    "agent-skills-standard",
    "retrospective-consent.json",
  );
}

function parseConsentText(raw: string): ConsentRead {
  if (raw.trim().length === 0) {
    return { state: "disabled", reason: "invalid" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { state: "disabled", reason: "invalid" };
  }
  const parsedResult = consentRecordSchema.safeParse(parsed);
  if (!parsedResult.success) {
    return { state: "disabled", reason: "invalid" };
  }
  const record = parsedResult.data;
  if (record.consentTextVersion !== CONSENT_TEXT_VERSION) {
    return { state: "disabled", reason: "version" };
  }
  return { state: "enabled", record };
}

function openFailure(error: unknown): ConsentRead {
  const code = (error as NodeJS.ErrnoException | null | undefined)?.code;
  if (code === "ELOOP") return { state: "disabled", reason: "symlink" };
  if (code === "ENOENT") return { state: "disabled", reason: "missing" };
  return { state: "disabled", reason: "invalid" };
}

/**
 * Read and validate a consent record through a single open descriptor, so the
 * regular-file, ownership, mode, size, and content checks all describe the
 * exact bytes returned. A path swapped between the checks and the read fails
 * closed instead of substituting content.
 */
async function readConsentDescriptor(target: string): Promise<ConsentRead> {
  let handle: FileHandle | undefined;
  try {
    try {
      handle = await fsp.open(target, CONSENT_READ_FLAGS);
    } catch (error) {
      return openFailure(error);
    }
    const stats = await handle.stat({ bigint: true });
    if (stats.isSymbolicLink() || !stats.isFile()) {
      return { state: "disabled", reason: "invalid" };
    }
    if (process.platform === "win32") {
      try {
        await verifyWindowsPrivatePath(target);
      } catch {
        return { state: "disabled", reason: "permissive" };
      }
    } else {
      if ((stats.mode & 0o077n) !== 0n) {
        return { state: "disabled", reason: "permissive" };
      }
      const uid =
        typeof process.getuid === "function" ? process.getuid() : null;
      if (uid !== null && stats.uid !== BigInt(uid)) {
        return { state: "disabled", reason: "permissive" };
      }
    }
    if (stats.size === 0n || stats.size > BigInt(MAX_CONSENT_BYTES)) {
      return { state: "disabled", reason: "invalid" };
    }
    const buffer = Buffer.alloc(Number(stats.size));
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(
        buffer,
        offset,
        buffer.length - offset,
        offset,
      );
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    return parseConsentText(buffer.subarray(0, offset).toString("utf8"));
  } catch {
    return { state: "disabled", reason: "invalid" };
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

export async function readConsent(filePath?: string): Promise<ConsentRead> {
  const target = filePath ?? consentFilePath();
  try {
    const parentStats = await lstatOrNull(path.dirname(target));
    if (parentStats?.isSymbolicLink()) {
      return { state: "disabled", reason: "symlink" };
    }
    // Path-level absence/symlink checks first so the reason codes stay stable on
    // every platform (Windows cannot refuse a symlink at open time).
    const fileStats = await lstatOrNull(target);
    if (fileStats === null) {
      return { state: "disabled", reason: "missing" };
    }
    if (fileStats.isSymbolicLink()) {
      return { state: "disabled", reason: "symlink" };
    }
    return await readConsentDescriptor(target);
  } catch {
    return { state: "disabled", reason: "invalid" };
  }
}

export async function writeConsent(
  record: ConsentRecord,
  filePath?: string,
): Promise<void> {
  const parsedResult = consentRecordSchema.safeParse(record);
  if (
    !parsedResult.success ||
    record.consentTextVersion !== CONSENT_TEXT_VERSION
  ) {
    throw new StoreError("INVALID_CONSENT", "Invalid consent record.");
  }
  const target = filePath ?? consentFilePath();
  const dir = path.dirname(target);
  await ensurePrivateRoot(dir);
  const serialized = JSON.stringify(record, null, 2) + "\n";
  await writePrivateFileAtomic(target, serialized);
}

export async function removeConsent(filePath?: string): Promise<boolean> {
  const target = filePath ?? consentFilePath();
  const stats = await lstatOrNull(target);
  if (!stats) return false;
  if (stats.isDirectory() && !stats.isSymbolicLink()) {
    throw new StoreError("UNSAFE_PATH", "Refusing to unlink a directory.");
  }
  await fsp.rm(target, { force: true });
  return true;
}
