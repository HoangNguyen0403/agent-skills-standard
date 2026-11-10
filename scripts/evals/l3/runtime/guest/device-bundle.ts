/**
 * scripts/evals/l3/runtime/guest/device-bundle.ts
 *
 * Reads the `l3bundle-v1` image from the read-only block device exactly, without
 * relying on device EOF: a block device is zero-padded to its full size, and the
 * bundle reader correctly rejects trailing bytes. This reader walks the framing
 * first to learn the exact byte length, then reads only those bytes.
 */

import { open } from "node:fs/promises";
import {
  BUNDLE_MAGIC,
  BUNDLE_VERSION,
  MAX_BUNDLE_ENTRY_BYTES,
  MAX_BUNDLE_ENTRIES,
  MAX_BUNDLE_NAME_BYTES,
  MAX_BUNDLE_TOTAL_BYTES,
} from "../bundle.js";

const HEADER_BYTES = 16;
const ENTRY_HEADER_BYTES = 38;

export async function readBundleDevice(devicePath: string): Promise<Buffer> {
  const handle = await open(devicePath, "r");
  try {
    const header = Buffer.alloc(HEADER_BYTES);
    const headerRead = await handle.read(header, 0, HEADER_BYTES, 0);
    if (headerRead.bytesRead !== HEADER_BYTES) throw new Error("bundle device is too small for its header");
    if (header.subarray(0, 8).toString("binary") !== BUNDLE_MAGIC) {
      throw new Error("input device does not carry an l3bundle-v1 image");
    }
    if (header.readUInt32LE(8) !== BUNDLE_VERSION) throw new Error("unsupported bundle version on the input device");
    const count = header.readUInt32LE(12);
    if (count === 0 || count > MAX_BUNDLE_ENTRIES) throw new Error(`invalid bundle entry count on the input device`);

    let offset = HEADER_BYTES;
    for (let index = 0; index < count; index += 1) {
      const entryHeader = Buffer.alloc(ENTRY_HEADER_BYTES);
      const read = await handle.read(entryHeader, 0, ENTRY_HEADER_BYTES, offset);
      if (read.bytesRead !== ENTRY_HEADER_BYTES) throw new Error(`bundle entry ${index} header is truncated`);
      const nameLength = entryHeader.readUInt16LE(0);
      const dataLength = entryHeader.readUInt32LE(2);
      if (nameLength === 0 || nameLength > MAX_BUNDLE_NAME_BYTES) {
        throw new Error(`bundle entry ${index} has an invalid name length`);
      }
      if (dataLength > MAX_BUNDLE_ENTRY_BYTES) throw new Error(`bundle entry ${index} exceeds the entry ceiling`);
      offset += ENTRY_HEADER_BYTES + nameLength + dataLength;
      if (offset > MAX_BUNDLE_TOTAL_BYTES) throw new Error("bundle exceeds its total byte ceiling");
    }

    const image = Buffer.alloc(offset);
    const full = await handle.read(image, 0, offset, 0);
    if (full.bytesRead !== offset) throw new Error("bundle device ended before the declared bundle length");
    return image;
  } finally {
    await handle.close();
  }
}
