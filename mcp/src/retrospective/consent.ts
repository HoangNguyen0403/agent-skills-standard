import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import {
  StoreError,
  ensurePrivateRoot,
  lstatOrNull,
  verifyWindowsPrivatePath,
  writePrivateFileAtomic,
} from "./platform-private";

export const CONSENT_TEXT_VERSION = "1";

export const CONSENT_TEXT = `Retrospective collection runs entirely on your local machine.
Zero model calls and zero network requests are made.
All report files are stored with owner-only private permissions on disk.
Transcripts and session events are read only from the explicitly listed source roots.
You can revoke this consent and remove the record at any time by running:
  ags-retrospective disable`;

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

export async function readConsent(filePath?: string): Promise<ConsentRead> {
  const target = filePath ?? consentFilePath();
  try {
    const parentDir = path.dirname(target);
    const parentStats = await lstatOrNull(parentDir);
    if (parentStats?.isSymbolicLink()) {
      return { state: "disabled", reason: "symlink" };
    }
    const fileStats = await lstatOrNull(target);
    if (fileStats === null) {
      return { state: "disabled", reason: "missing" };
    }
    if (fileStats.isSymbolicLink()) {
      return { state: "disabled", reason: "symlink" };
    }
    if (process.platform !== "win32") {
      if ((fileStats.mode & 0o077n) !== 0n) {
        return { state: "disabled", reason: "permissive" };
      }
      const uid =
        typeof process.getuid === "function" ? process.getuid() : null;
      if (uid !== null && fileStats.uid !== BigInt(uid)) {
        return { state: "disabled", reason: "permissive" };
      }
    } else {
      try {
        await verifyWindowsPrivatePath(target);
      } catch {
        return { state: "disabled", reason: "permissive" };
      }
    }
    if (fileStats.size === 0n || fileStats.size > 65_536n) {
      return { state: "disabled", reason: "invalid" };
    }
    let raw: string;
    try {
      raw = await fsp.readFile(target, "utf8");
    } catch {
      return { state: "disabled", reason: "invalid" };
    }
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
