import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { buildManifest } from "./manifest";

function parseArgs(args: string[]): {
  tag?: string;
  out?: string;
  commit?: string;
  repoRoot?: string;
} {
  const result: {
    tag?: string;
    out?: string;
    commit?: string;
    repoRoot?: string;
  } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--tag" && i + 1 < args.length) {
      result.tag = args[++i];
    } else if (arg === "--out" && i + 1 < args.length) {
      result.out = args[++i];
    } else if (arg === "--commit" && i + 1 < args.length) {
      result.commit = args[++i];
    } else if (arg === "--repo-root" && i + 1 < args.length) {
      result.repoRoot = args[++i];
    }
  }

  return result;
}

function main(): void {
  const {
    tag,
    out = "dist-release/MANIFEST.json",
    commit,
    repoRoot = process.cwd(),
  } = parseArgs(process.argv.slice(2));

  if (!tag) {
    console.error("Error: --tag <tag> is required");
    process.exit(1);
  }

  const resolvedCommit =
    commit ??
    execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();

  const manifest = buildManifest(repoRoot, tag, resolvedCommit);

  const fullOut = path.isAbsolute(out) ? out : path.resolve(repoRoot, out);
  fs.mkdirSync(path.dirname(fullOut), { recursive: true });
  fs.writeFileSync(fullOut, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  console.log(`Wrote ${out} (${Object.keys(manifest.files).length} files)`);
}

main();
