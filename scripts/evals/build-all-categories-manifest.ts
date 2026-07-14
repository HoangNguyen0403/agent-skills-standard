#!/usr/bin/env node
import fs from "fs-extra";
import * as path from "path";
import { buildManifest } from "./manifest";
import { ROOT_DIR } from "./constants";

/** Compatibility entry point; all manifest generation lives in manifest.ts. */
function main(): void {
  const pkg = fs.readJSONSync(path.join(ROOT_DIR, "package.json")) as {
    version?: string;
  };
  const { manifest, runDir } = buildManifest("all", pkg.version ?? "0.0.0");
  console.log(`✅ Combined manifest built: ${runDir}`);
  console.log(
    `   ${manifest.skills.length} skills, ${manifest.skills.reduce((sum, skill) => sum + skill.cases.length, 0)} cases`,
  );
  console.log(
    `\nNext: answer prompts under ${path.relative(ROOT_DIR, runDir)}/prompts/ then run: pnpm evals:score -- --run ${manifest.runId}`,
  );
}

try {
  main();
} catch (error) {
  console.error("❌ build-all-manifests failed:", error);
  process.exit(1);
}
