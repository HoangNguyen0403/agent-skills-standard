/**
 * scripts/evals/l3/runtime/guest/build/supervisor.mjs
 *
 * Trusted pre-start supervisor for the offline builder container.
 *
 * The container is started with this program as its entrypoint. It *blocks*
 * before doing anything else until the host writes the control token, which the
 * host only does after it has verified the running container's configuration and
 * cgroup limits. No candidate-controlled byte is executed before that point.
 *
 * After the token appears the supervisor runs one fixed recipe and nothing else:
 *
 *   1. copy the read-only source tree into the bounded writable `/work`;
 *   2. materialize frozen offline dependencies with `npm ci --offline
 *      --ignore-scripts --no-audit --no-fund` against a bounded cache;
 *   3. run the fixed compiler — the TypeScript compiler from those frozen
 *      dependencies — over the fixed project file, into `/output`;
 *   4. verify the required executable entrypoint exists.
 *
 * There is no candidate Dockerfile, no `npm run build`, no lifecycle script and
 * no network. A missing prerequisite fails the build instead of guessing.
 */

import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const [, , tokenPath, sourceDir, depsDir, workDir, outputDir] = process.argv;
if (!tokenPath || !sourceDir || !depsDir || !workDir || !outputDir) {
  process.stderr.write("supervisor: missing fixed argument\n");
  process.exit(70);
}

const REQUIRED_ENTRYPOINT = path.join(outputDir, "app", "index.js");
const WAIT_STEP_MS = 25;

function log(message) {
  process.stdout.write(`supervisor: ${message}\n`);
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function awaitControlToken() {
  for (;;) {
    if (await exists(tokenPath)) return;
    await new Promise((resolve) => setTimeout(resolve, WAIT_STEP_MS));
  }
}

function run(argv, options = {}) {
  const result = spawnSync(argv[0], argv.slice(1), {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    // The fixed toolchain lives where the interpreter does; nothing is resolved
    // from a caller-supplied environment.
    env: {
      PATH: `${path.dirname(process.execPath)}:/usr/local/bin:/usr/bin:/bin`,
      HOME: workDir,
    },
    ...options,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result.status ?? 1;
}

await awaitControlToken();
log("control token observed; starting fixed offline recipe");

await mkdir(workDir, { recursive: true });
await mkdir(outputDir, { recursive: true });

const workspaceSource = path.join(workDir, "package-source");
await cp(sourceDir, workspaceSource, { recursive: true, force: true });

const lockfile = path.join(workspaceSource, "package-lock.json");
if (!(await exists(lockfile))) {
  process.stderr.write("supervisor: the frozen workspace has no package-lock.json; offline materialization refused\n");
  process.exit(71);
}

// Two frozen offline shapes are supported, both read-only inputs: an npm cache
// (copied into the bounded writable /tmp before use) or a prepared node_modules
// tree. Anything else fails rather than reaching for the network.
const frozenCache = path.join(depsDir, "npm-cache");
const frozenModules = path.join(depsDir, "node_modules");
let install = 0;
if (await exists(frozenCache)) {
  const writableCache = "/tmp/npm-cache";
  await cp(frozenCache, writableCache, { recursive: true, force: true });
  install = run(
    [
      "npm",
      "ci",
      "--offline",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      `--cache=${writableCache}`,
    ],
    { cwd: workspaceSource },
  );
} else if (await exists(frozenModules)) {
  await cp(frozenModules, path.join(workspaceSource, "node_modules"), { recursive: true, force: true });
} else {
  process.stderr.write("supervisor: frozen offline dependencies are neither an npm cache nor a node_modules tree\n");
  process.exit(72);
}
if (install !== 0) {
  process.stderr.write(`supervisor: frozen offline dependency materialization failed (${install})\n`);
  process.exit(72);
}

const compiler = path.join(workspaceSource, "node_modules", "typescript", "bin", "tsc");
const project = path.join(workspaceSource, "tsconfig.json");
if (!(await exists(compiler)) || !(await exists(project))) {
  process.stderr.write("supervisor: frozen offline dependencies do not contain the fixed compiler and project\n");
  process.exit(73);
}

const compiled = run(["node", compiler, "--project", project, "--outDir", outputDir]);
if (compiled !== 0) {
  process.stderr.write(`supervisor: fixed compiler invocation failed (${compiled})\n`);
  process.exit(74);
}

const manifestRaw = await readFile(path.join(workspaceSource, "package.json"), "utf8");
// Package only the production dependency closure recorded by npm's lockfile,
// preserving nested install paths. The compiler and development dependencies
// stay out of the immutable runtime image.
let manifest;
let lock;
try {
  manifest = JSON.parse(manifestRaw);
  lock = JSON.parse(await readFile(lockfile, "utf8"));
} catch {
  process.stderr.write("supervisor: workspace package or lock metadata is not valid JSON\n");
  process.exit(76);
}
if (manifest.type !== "module" || typeof lock.packages !== "object" || lock.packages === null) {
  process.stderr.write("supervisor: runtime module metadata or npm lock package map is missing\n");
  process.exit(76);
}
const rootLock = lock.packages[""];
if (typeof rootLock !== "object" || rootLock === null) {
  process.stderr.write("supervisor: npm lockfile has no root package record\n");
  process.exit(76);
}
const declared = manifest.dependencies ?? {};
const lockedRootDependencies = rootLock.dependencies ?? {};
if (
  typeof declared !== "object" ||
  declared === null ||
  Array.isArray(declared) ||
  typeof lockedRootDependencies !== "object" ||
  lockedRootDependencies === null ||
  Array.isArray(lockedRootDependencies) ||
  JSON.stringify(Object.keys(declared).sort()) !== JSON.stringify(Object.keys(lockedRootDependencies).sort())
) {
  process.stderr.write("supervisor: runtime dependencies differ from the frozen npm lockfile\n");
  process.exit(76);
}
for (const [name, version] of Object.entries(declared)) {
  if (typeof version !== "string" || lockedRootDependencies[name] !== version) {
    process.stderr.write(`supervisor: runtime dependency '${name}' differs from the frozen npm lockfile\n`);
    process.exit(76);
  }
}

const lockedPackages = lock.packages;
const resolveLockedPackage = (from, name) => {
  let parent = from;
  for (;;) {
    const candidate = parent ? `${parent}/node_modules/${name}` : `node_modules/${name}`;
    if (Object.hasOwn(lockedPackages, candidate)) return candidate;
    if (parent.length === 0) return null;
    const ancestor = parent.lastIndexOf("/node_modules/");
    parent = ancestor >= 0 ? parent.slice(0, ancestor) : "";
  }
};
const closure = new Set();
const pending = Object.keys(declared).map((name) => resolveLockedPackage("", name));
for (const packagePath of pending) {
  if (packagePath === null) {
    process.stderr.write("supervisor: a declared runtime dependency is absent from the frozen npm lockfile\n");
    process.exit(77);
  }
  const segments = packagePath.split("/");
  if (
    !packagePath.startsWith("node_modules/") ||
    packagePath.includes("\\") ||
    segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")
  ) {
    process.stderr.write(`supervisor: unsafe locked runtime package path '${packagePath}'\n`);
    process.exit(77);
  }
  if (closure.has(packagePath)) continue;
  const locked = lockedPackages[packagePath];
  if (typeof locked !== "object" || locked === null || locked.link === true) {
    process.stderr.write(`supervisor: locked runtime dependency '${packagePath}' is not a packageable directory\n`);
    process.exit(77);
  }
  closure.add(packagePath);
  for (const field of ["dependencies", "optionalDependencies", "peerDependencies"]) {
    const dependencies = locked[field] ?? {};
    if (typeof dependencies !== "object" || dependencies === null || Array.isArray(dependencies)) {
      process.stderr.write(`supervisor: lock metadata for '${packagePath}' has invalid ${field}\n`);
      process.exit(76);
    }
    for (const name of Object.keys(dependencies)) {
      const resolved = resolveLockedPackage(packagePath, name);
      const peerMeta = locked.peerDependenciesMeta;
      const optionalPeer =
        field === "peerDependencies" &&
        typeof peerMeta === "object" &&
        peerMeta !== null &&
        peerMeta[name]?.optional === true;
      if (resolved === null) {
        if (field === "optionalDependencies" || optionalPeer) continue;
        process.stderr.write(`supervisor: locked runtime dependency '${name}' of '${packagePath}' is missing\n`);
        process.exit(77);
      }
      pending.push(resolved);
    }
  }
}

for (const packagePath of closure) {
  const from = path.join(workspaceSource, packagePath);
  if (!(await exists(from))) {
    process.stderr.write(`supervisor: locked runtime package '${packagePath}' is absent from the frozen tree\n`);
    process.exit(77);
  }
  const destination = path.join(outputDir, packagePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(from, destination, { recursive: true, force: true });
  if (!(await exists(destination))) {
    process.stderr.write(`supervisor: locked runtime package '${packagePath}' could not be packaged\n`);
    process.exit(78);
  }
}
await writeFile(path.join(outputDir, "package.json"), `${JSON.stringify({ type: manifest.type })}\n`);

if (!(await exists(REQUIRED_ENTRYPOINT))) {
  process.stderr.write(`supervisor: compiled output is missing the required entrypoint ${REQUIRED_ENTRYPOINT}\n`);
  process.exit(75);
}

log("fixed recipe completed");
process.exit(0);
