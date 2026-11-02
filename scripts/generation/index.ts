#!/usr/bin/env node
import path from "path";
import { runIsolatedGeneration } from "./isolated-stage";

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  const adoptIndex = args.indexOf("--adopt-base");
  const adoptBase = adoptIndex < 0 ? undefined : args[adoptIndex + 1];
  const recoverIndex = args.indexOf("--recover-provenance");
  const recoverProvenance =
    recoverIndex < 0 ? undefined : args[recoverIndex + 1];
  if (
    args.filter((arg) => arg === "--check").length > 1 ||
    args.filter((arg) => arg === "--adopt-base").length > 1 ||
    args.filter((arg) => arg === "--recover-provenance").length > 1 ||
    (adoptIndex >= 0 &&
      (!adoptBase ||
        !/^[0-9a-f]{40,64}$/i.test(adoptBase) ||
        adoptBase.startsWith("--")))
  ) {
    throw new Error("--adopt-base requires one full commit SHA.");
  }
  if (
    recoverIndex >= 0 &&
    (!recoverProvenance ||
      !/^[0-9a-f]{40,64}$/i.test(recoverProvenance) ||
      recoverProvenance.startsWith("--"))
  ) {
    throw new Error("--recover-provenance requires one full commit SHA.");
  }
  if (recoverIndex >= 0 && (adoptIndex >= 0 || checkOnly)) {
    throw new Error(
      "--recover-provenance cannot be combined with --adopt-base or --check.",
    );
  }
  const allowed = new Set([
    "--check",
    "--adopt-base",
    adoptBase,
    "--recover-provenance",
    recoverProvenance,
  ]);
  if (args.some((arg) => !allowed.has(arg))) {
    throw new Error(
      "Usage: generate-indices [--check] [--adopt-base <fullsha>] [--recover-provenance <fullsha>]",
    );
  }
  // scripts/generation/index.ts -> two levels up is the authoring root.
  const repoRoot = path.resolve(__dirname, "..", "..");

  const result = await runIsolatedGeneration({
    repoRoot,
    checkOnly,
    adoptBase,
    recoverProvenance,
  });

  if (!result.success) {
    console.error(
      `❌ Isolated generation ${checkOnly ? "check" : "apply"} failed: ${result.error}`,
    );
    console.error(`See log at: ${result.logPath}`);
    process.exit(1);
  }

  if (checkOnly) {
    console.log(
      `✅ Isolated generation check passed: prepared outputs match declared targets. Receipt: ${result.receiptPath}`,
    );
  } else {
    console.log(
      `✅ Isolated generation completed successfully. Copied back: ${result.copiedBackFiles.join(", ") || "none (up to date)"}. Receipt: ${result.receiptPath}`,
    );
  }
}

main().catch((err: unknown) => {
  console.error("❌ Unexpected error in isolated generation CLI:", err);
  process.exit(1);
});
