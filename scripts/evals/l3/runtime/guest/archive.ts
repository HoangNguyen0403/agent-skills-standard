/**
 * scripts/evals/l3/runtime/guest/archive.ts
 *
 * Minimal, strict ustar reader for the frozen offline build inputs.
 *
 * The guest receives its build context as a deterministic tar entry in the
 * read-only input bundle. There is no network and no host filesystem sharing, so
 * this reader is the only path by which dependency/source bytes reach the build
 * context. It accepts regular files and directories only: links, devices,
 * sparse and GNU extensions are rejected rather than reinterpreted.
 */

const BLOCK_BYTES = 512;
const MAX_ENTRIES = 4_096;
const MAX_PATH_BYTES = 200;

export interface ArchiveEntry {
  readonly path: string;
  readonly directory: boolean;
  readonly data: Buffer;
}

function readString(block: Buffer, offset: number, length: number): string {
  const slice = block.subarray(offset, offset + length);
  const nul = slice.indexOf(0);
  return (nul === -1 ? slice : slice.subarray(0, nul)).toString("utf8");
}

function readOctal(block: Buffer, offset: number, length: number, field: string): number {
  const text = readString(block, offset, length).trim();
  if (text.length === 0) return 0;
  if (!/^[0-7]+$/.test(text)) throw new Error(`tar ${field} is not octal`);
  const value = Number.parseInt(text, 8);
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`tar ${field} is out of range`);
  return value;
}

function assertArchivePath(name: string): string {
  if (name.length === 0 || Buffer.byteLength(name, "utf8") > MAX_PATH_BYTES) {
    throw new Error("tar entry path is empty or too long");
  }
  if (name.startsWith("/") || name.includes("..") || name.includes("\u0000")) {
    throw new Error(`tar entry path is unsafe: ${name}`);
  }
  const canonical = name.endsWith("/") ? name.slice(0, -1) : name;
  if (
    canonical.length === 0 ||
    canonical.split("/").some((segment) => segment.length === 0 || segment === ".")
  ) {
    throw new Error(`tar entry path is not canonical: ${name}`);
  }
  return canonical;
}

/** Parses an uncompressed ustar archive. Any deviation rejects the whole file. */
export function readUstarArchive(image: Buffer): readonly ArchiveEntry[] {
  const entries: ArchiveEntry[] = [];
  let offset = 0;
  let terminated = false;

  while (offset + BLOCK_BYTES <= image.length) {
    const header = image.subarray(offset, offset + BLOCK_BYTES);
    if (header.every((byte) => byte === 0)) {
      terminated = true;
      break;
    }
    if (entries.length >= MAX_ENTRIES) throw new Error("tar archive exceeds its entry ceiling");
    if (!header.subarray(257, 263).equals(Buffer.from("ustar\u0000", "binary"))) {
      throw new Error("tar entry is not ustar format");
    }
    const typeFlag = readString(header, 156, 1) || "0";
    if (typeFlag !== "0" && typeFlag !== "5") {
      throw new Error(`tar entry type '${typeFlag}' is not accepted`);
    }
    const prefix = readString(header, 345, 155);
    const localName = readString(header, 0, 100);
    const name = assertArchivePath(prefix.length > 0 ? `${prefix}/${localName}` : localName);
    const size = readOctal(header, 124, 12, "size");
    offset += BLOCK_BYTES;

    if (typeFlag === "5") {
      if (size !== 0) throw new Error("tar directory entry declares a size");
      entries.push({ path: name, directory: true, data: Buffer.alloc(0) });
      continue;
    }
    const end = offset + size;
    if (end > image.length) throw new Error(`tar entry '${name}' is truncated`);
    entries.push({ path: name, directory: false, data: Buffer.from(image.subarray(offset, end)) });
    offset += Math.ceil(size / BLOCK_BYTES) * BLOCK_BYTES;
  }

  if (!terminated) throw new Error("tar archive has no terminator block");
  return Object.freeze(entries);
}
