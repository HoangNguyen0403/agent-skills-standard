/**
 * scripts/evals/l3/runtime/guest/collector-main.ts
 *
 * Executable entrypoint of the fresh collector guest.
 *
 * Init mounts the host-preserved evidence device read-only at `/evidence`. The
 * collector reads only the fixed artifact allowlist from that mount and emits
 * strictly ordered frames over the one-way serial console, followed by an
 * explicit completion frame. A failure exits nonzero without a completion frame,
 * so the host records unavailable evidence rather than a partial success.
 */

import { pathToFileURL } from "node:url";
import { collectorMain } from "./collector.js";

export async function collectorEntrypoint(): Promise<void> {
  await collectorMain();
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await collectorEntrypoint();
}
