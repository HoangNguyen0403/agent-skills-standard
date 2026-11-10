/**
 * scripts/evals/l3/runtime/vz/package.mjs
 *
 * Packaging implementation for the direct-VZ runner and guest applications.
 * Runs with the locally installed toolchain only; no network, no VM, no install
 * and no signing.
 *
 *   node package.mjs [dist-dir]
 *
 * Produces a staged guest root with emitted ESM modules kept at their
 * relative-import locations, thin launchers at /opt/l3, the emitted D3 driver
 * tree plus its digest manifest, and the init wrappers. The Linux-only peer
 * authenticator is compiled only in the Linux guest-image build environment.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { chmod, copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const runtimeRoot = path.resolve(here, "..");
const l3Root = path.resolve(runtimeRoot, "..");
const repoRoot = path.resolve(l3Root, "..", "..", "..");
const distDir = path.resolve(process.argv[2] ?? path.join(runtimeRoot, "dist"));
const stage = path.join(distDir, "guest-root");
const opt = path.join(stage, "opt", "l3");
const tsc = path.join(repoRoot, "node_modules", ".bin", "tsc");

function run(command, args, cwd = repoRoot) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout;
}

async function walk(root, relative = "") {
  const files = [];
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const next = relative === "" ? entry.name : `${relative}/${entry.name}`;
    if (entry.isDirectory()) files.push(...(await walk(root, next)));
    else if (entry.isFile()) files.push(next);
    else throw new Error(`unexpected non-file entry in driver tree: ${next}`);
  }
  return files;
}

async function rewriteEmittedSpecifiers(root) {
  for (const relative of await walk(root)) {
    if (!relative.endsWith(".js")) continue;
    const filePath = path.join(root, relative);
    const source = await readFile(filePath, "utf8");
    const rewritten = source.replace(
      /(\bfrom\s*|\bimport\s*\(\s*)("|')(\.{1,2}\/[^"']+)\2/g,
      (match, prefix, quote, specifier) => {
        if (/\.(js|json|mjs|cjs)$/.test(specifier)) return match;
        const target = path.resolve(path.dirname(filePath), specifier);
        const candidate = target.endsWith(".js") ? target : `${target}.js`;
        return existsSync(candidate) ? `${prefix}${quote}${specifier}.js${quote}` : match;
      },
    );
    if (rewritten !== source) await writeFile(filePath, rewritten);
  }
}

async function writeLaunchers() {
  await writeFile(path.join(opt, "package.json"), '{"type":"module"}\n');
  await writeFile(
    path.join(opt, "controller.mjs"),
    [
      'import { pathToFileURL } from "node:url";',
      'import { controllerMain } from "./runtime/guest/controller-main.js";',
      "export { controllerMain };",
      "if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {",
      "  await controllerMain();",
      "}",
      "",
    ].join("\n"),
  );
  await writeFile(
    path.join(opt, "collector.mjs"),
    [
      'import { pathToFileURL } from "node:url";',
      'import { collectorEntrypoint } from "./runtime/guest/collector-main.js";',
      "export { collectorEntrypoint };",
      "if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {",
      "  await collectorEntrypoint();",
      "}",
      "",
    ].join("\n"),
  );
}

async function writeDriverManifest() {
  const root = path.join(opt, "drivers");
  const files = (await walk(root)).sort();
  const aggregate = createHash("sha256");
  const entries = [];
  for (const relative of files) {
    const bytes = await readFile(path.join(root, relative));
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    aggregate.update(`${relative}:${sha256}\n`, "utf8");
    entries.push({ path: relative, sha256, bytes: (await stat(path.join(root, relative))).size });
  }
  await writeFile(
    path.join(opt, "drivers.json"),
    `${JSON.stringify({ version: 1, tree_sha256: aggregate.digest("hex"), files: entries }, null, 2)}\n`,
  );
}

async function main() {
  await rm(stage, { recursive: true, force: true });
  await mkdir(opt, { recursive: true });

  const common = [
    "--ignoreConfig",
    "--target", "ES2022",
    "--module", "ES2022",
    "--moduleResolution", "Bundler",
    "--strict",
    "--skipLibCheck",
    "--esModuleInterop",
    "--types", "node",
    "--rootDir", l3Root,
  ];
  run(tsc, [
    ...common,
    "--outDir", opt,
    path.join(l3Root, "runtime", "guest", "controller-main.ts"),
    path.join(l3Root, "runtime", "guest", "collector-main.ts"),
  ]);
  run(tsc, [
    ...common,
    "--outDir", path.join(opt, "drivers"),
    path.join(l3Root, "cases", "index.ts"),
  ]);
  await writeLaunchers();
  await rewriteEmittedSpecifiers(opt);
  await writeDriverManifest();
  // Trusted build tools: the pre-start supervisor and the fixed recipe live in the
  // read-only guest image, never in the candidate bundle.
  await mkdir(path.join(opt, "build"), { recursive: true });
  await copyFile(path.join(runtimeRoot, "guest", "build", "supervisor.mjs"), path.join(opt, "build", "supervisor.mjs"));
  await chmod(path.join(opt, "build", "supervisor.mjs"), 0o755);
  await copyFile(path.join(here, "init-controller.sh"), path.join(opt, "init-controller"));
  await copyFile(path.join(here, "init-collector.sh"), path.join(opt, "init-collector"));
  await chmod(path.join(opt, "init-controller"), 0o755);
  await chmod(path.join(opt, "init-collector"), 0o755);

  if (process.platform === "linux") {
    run("cc", [
      "-O2", "-std=c11", "-Wall", "-Wextra", "-D_GNU_SOURCE",
      "-o", path.join(opt, "aux_peercred"),
      path.join(runtimeRoot, "guest", "aux_peercred.c"),
    ]);
  }

  const swift = spawnSync("swiftc", [
    "-O", "-whole-module-optimization",
    "-target", "arm64-apple-macos14.0",
    "-framework", "Virtualization", "-framework", "Foundation",
    path.join(here, "Runner.swift"),
    "-o", path.join(distDir, "l3vz"),
  ], { cwd: repoRoot, encoding: "utf8" });
  if (swift.status !== 0) {
    throw new Error(`swiftc failed:\n${swift.stdout}\n${swift.stderr}`);
  }

  process.stdout.write(`${JSON.stringify({ event: "packaged", stage })}\n`);
}

await main();
