/**
 * scripts/evals/l3/runtime/bundle.ts
 *
 * `l3bundle-v1` — the frozen input image attached read-only to the attempt guest.
 *
 * The host writes a flat, self-describing byte container; it never creates or
 * parses a guest filesystem. The guest controller parses it from the raw block
 * device or from a pre-mounted path supplied by the image. Every entry carries
 * its own sha256, and the reader rejects unknown, duplicate, traversing or
 * oversized entries.
 */

import { createHash, timingSafeEqual } from "node:crypto";

export const BUNDLE_MAGIC = "L3BND1\u0000\u0000" as const;
export const BUNDLE_VERSION = 1 as const;
export const MAX_BUNDLE_ENTRIES = 16;
export const MAX_BUNDLE_ENTRY_BYTES = 8 * 1024 * 1024;
export const MAX_BUNDLE_TOTAL_BYTES = 16 * 1024 * 1024;
export const MAX_BUNDLE_NAME_BYTES = 96;

const HEADER_BYTES = 8 + 4 + 4;
const ENTRY_HEADER_BYTES = 2 + 4 + 32;
const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,95}$/;

export interface BundleEntryInput {
  readonly name: string;
  readonly data: Buffer;
}

export interface BundleEntry {
  readonly name: string;
  readonly data: Buffer;
  readonly sha256: string;
}

function assertEntryName(name: string): void {
  if (!NAME_PATTERN.test(name) || name.includes("..") || name.startsWith("/")) {
    throw new Error(`Invalid bundle entry name: ${name}`);
  }
}

/** Host-side writer. Deterministic for a given entry list. */
export function buildBundleImage(entries: readonly BundleEntryInput[]): Buffer {
  if (entries.length === 0 || entries.length > MAX_BUNDLE_ENTRIES) {
    throw new Error(`bundle requires 1..${MAX_BUNDLE_ENTRIES} entries`);
  }
  const seen = new Set<string>();
  let total = HEADER_BYTES;
  const prepared = entries.map((entry) => {
    assertEntryName(entry.name);
    if (seen.has(entry.name)) throw new Error(`duplicate bundle entry: ${entry.name}`);
    seen.add(entry.name);
    const nameBytes = Buffer.from(entry.name, "utf8");
    if (nameBytes.length > MAX_BUNDLE_NAME_BYTES) throw new Error(`entry name too long: ${entry.name}`);
    if (entry.data.length > MAX_BUNDLE_ENTRY_BYTES) throw new Error(`entry too large: ${entry.name}`);
    total += ENTRY_HEADER_BYTES + nameBytes.length + entry.data.length;
    return { nameBytes, data: entry.data, digest: createHash("sha256").update(entry.data).digest() };
  });
  if (total > MAX_BUNDLE_TOTAL_BYTES) throw new Error("bundle exceeds its total byte ceiling");

  const header = Buffer.alloc(HEADER_BYTES);
  header.write(BUNDLE_MAGIC, 0, "binary");
  header.writeUInt32LE(BUNDLE_VERSION, 8);
  header.writeUInt32LE(prepared.length, 12);

  const parts: Buffer[] = [header];
  for (const entry of prepared) {
    const entryHeader = Buffer.alloc(ENTRY_HEADER_BYTES);
    entryHeader.writeUInt16LE(entry.nameBytes.length, 0);
    entryHeader.writeUInt32LE(entry.data.length, 2);
    entry.digest.copy(entryHeader, 6);
    parts.push(entryHeader, entry.nameBytes, entry.data);
  }
  return Buffer.concat(parts);
}

/** Guest-side reader. Strict: any deviation rejects the whole bundle. */
export function readBundleImage(image: Buffer): readonly BundleEntry[] {
  if (image.length < HEADER_BYTES) throw new Error("bundle is truncated before its header");
  if (image.subarray(0, 8).toString("binary") !== BUNDLE_MAGIC) throw new Error("bundle magic mismatch");
  const version = image.readUInt32LE(8);
  if (version !== BUNDLE_VERSION) throw new Error(`unsupported bundle version: ${version}`);
  const count = image.readUInt32LE(12);
  if (count === 0 || count > MAX_BUNDLE_ENTRIES) throw new Error(`invalid bundle entry count: ${count}`);

  const entries: BundleEntry[] = [];
  const seen = new Set<string>();
  let offset = HEADER_BYTES;
  let total = HEADER_BYTES;

  for (let index = 0; index < count; index += 1) {
    if (offset + ENTRY_HEADER_BYTES > image.length) throw new Error(`bundle entry ${index} header truncated`);
    const nameLength = image.readUInt16LE(offset);
    const dataLength = image.readUInt32LE(offset + 2);
    if (nameLength === 0 || nameLength > MAX_BUNDLE_NAME_BYTES) throw new Error(`bundle entry ${index} bad name length`);
    if (dataLength > MAX_BUNDLE_ENTRY_BYTES) throw new Error(`bundle entry ${index} exceeds the entry ceiling`);
    const digest = image.subarray(offset + 6, offset + 38);
    offset += ENTRY_HEADER_BYTES;

    if (offset + nameLength + dataLength > image.length) throw new Error(`bundle entry ${index} truncated`);
    const name = image.subarray(offset, offset + nameLength).toString("utf8");
    offset += nameLength;
    assertEntryName(name);
    if (seen.has(name)) throw new Error(`duplicate bundle entry: ${name}`);
    seen.add(name);

    const data = image.subarray(offset, offset + dataLength);
    offset += dataLength;
    total += ENTRY_HEADER_BYTES + nameLength + dataLength;
    if (total > MAX_BUNDLE_TOTAL_BYTES) throw new Error("bundle exceeds its total byte ceiling");

    const observed = createHash("sha256").update(data).digest();
    if (observed.length !== digest.length || !timingSafeEqual(observed, digest)) {
      throw new Error(`bundle entry digest mismatch: ${name}`);
    }
    entries.push({ name, data: Buffer.from(data), sha256: observed.toString("hex") });
  }

  if (offset !== image.length) throw new Error(`bundle has ${image.length - offset} trailing bytes`);
  return Object.freeze(entries);
}

/** Deterministic attempt inputs the controller expects inside the bundle. */
export const BUNDLE_REQUIRED_ENTRIES = [
  "attempt.json",
  "expected.json",
  "manifest.json",
  "drivers.json",
  "workspace.tar",
  "deps.tar",
] as const;

export function assertRequiredBundleEntries(entries: readonly BundleEntry[]): void {
  const names = new Set(entries.map((entry) => entry.name));
  for (const required of BUNDLE_REQUIRED_ENTRIES) {
    if (!names.has(required)) throw new Error(`bundle is missing required entry: ${required}`);
  }
}
