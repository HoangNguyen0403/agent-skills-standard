#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { syncGeneratedHooks } from "./sync-generated-hooks";

/** Re-renders the tracked hook copies for the current cli/package.json version. */
async function main(): Promise<void> {
  const rootDir = path.resolve(__dirname, "../..");
  const pkg = JSON.parse(
    fs.readFileSync(path.join(rootDir, "cli/package.json"), "utf8"),
  ) as { version?: unknown };
  if (typeof pkg.version !== "string" || pkg.version.length === 0) {
    throw new Error("cli/package.json has no string version.");
  }

  const result = await syncGeneratedHooks({ rootDir, version: pkg.version });
  console.log(
    `Synchronized generated hooks: ${result.written.length} written, ${result.unchanged.length} unchanged.`,
  );
  for (const file of result.written) {
    console.log(`  updated ${file}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
