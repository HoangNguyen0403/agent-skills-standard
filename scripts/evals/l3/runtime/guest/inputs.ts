/**
 * scripts/evals/l3/runtime/guest/inputs.ts
 *
 * Materializes the read-only input bundle into the guest's fixed layout and
 * verifies the packaged driver tree.
 *
 * Nothing is fetched, installed or discovered: the bundle is the only input, and
 * every byte is used only after the bundle reader verified its own digest. Tar
 * members are validated by the strict ustar reader; no member may escape its
 * target directory.
 */

import { createHash } from "node:crypto";
import { chmod, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { strictObject } from "../../contracts.js";
import type { BundleEntry } from "../bundle.js";
import { readUstarArchive } from "./archive.js";

const SHA256_HEX = /^[0-9a-f]{64}$/;
const MAX_DRIVER_TREE_FILE_BYTES = 8 * 1024 * 1024;
const FORBIDDEN_BUILD_PATTERNS: readonly RegExp[] = [
  /\bapt-get\b/,
  /\bapt\s+install\b/,
  /\bapk\s+add\b/,
  /\bpip3?\s+install\b/,
  /\bgit\s+clone\b/,
  /\bcurl\b/,
  /\bwget\b/,
];

function checkCommandPolicy(cmd: string): void {
  for (const pattern of FORBIDDEN_BUILD_PATTERNS) {
    if (pattern.test(cmd)) {
      throw new Error(`build Dockerfile contains a forbidden network install command: ${cmd.slice(0, 120)}`);
    }
  }
  // Package manager commands must be strictly offline and disable lifecycle scripts
  const pmPattern = /\b(npm|yarn|pnpm)\s+(install|ci|add)\b/;
  if (pmPattern.test(cmd)) {
    if (!cmd.includes("--offline") && !cmd.includes("deps")) {
      throw new Error(`build Dockerfile contains a forbidden network install command: ${cmd.slice(0, 120)}`);
    }
    if (!cmd.includes("--ignore-scripts")) {
      throw new Error(`package manager install command must disable lifecycle scripts (--ignore-scripts): ${cmd.slice(0, 120)}`);
    }
  }
}

function requireEntry(entries: readonly BundleEntry[], name: string): BundleEntry {
  const entry = entries.find((candidate) => candidate.name === name);
  if (entry === undefined) throw new Error(`input bundle is missing required entry: ${name}`);
  return entry;
}

async function unpackTar(
  entry: BundleEntry,
  targetDir: string,
  directoryMode = 0o700,
  fileMode = 0o600,
): Promise<void> {
  await mkdir(targetDir, { recursive: true, mode: directoryMode });
  for (const member of readUstarArchive(entry.data)) {
    const destination = path.join(targetDir, member.path);
    const relative = path.relative(targetDir, destination);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`tar member escapes its target directory: ${member.path}`);
    }
    if (member.directory) {
      await mkdir(destination, { recursive: true, mode: directoryMode });
      await chmod(destination, directoryMode);
      continue;
    }
    await mkdir(path.dirname(destination), { recursive: true, mode: directoryMode });
    await writeFile(destination, member.data, { mode: fileMode });
    await chmod(destination, fileMode);
  }
}

/**
 * The build context lives on its own size-limited ext4 volume, so the frozen
 * workspace-disk ceiling is enforced by the filesystem rather than trusted to
 * Docker. Any failure to create or mount the quota fails the build closed.
 */
export async function prepareBuildWorkspace(
  command: { run: (argv: readonly string[], options: { timeoutMs: number; maxStdoutBytes: number; maxStderrBytes: number }) => Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean }> },
  quotaImage: string,
  mountDir: string,
  workspaceMib: number,
): Promise<void> {
  if (!Number.isSafeInteger(workspaceMib) || workspaceMib <= 0) {
    throw new Error("workspace_disk_mib must be a positive safe integer");
  }
  await mkdir(mountDir, { recursive: true, mode: 0o700 });
  const mounted = await command.run(["/usr/bin/mountpoint", "-q", mountDir], {
    timeoutMs: 10_000,
    maxStdoutBytes: 1024,
    maxStderrBytes: 1024,
  });
  if (mounted.code === 0) return;

  const bytes = workspaceMib * 1024 * 1024;
  const created = await command.run(
    ["/usr/bin/truncate", "--size", String(bytes), quotaImage],
    { timeoutMs: 60_000, maxStdoutBytes: 1024, maxStderrBytes: 1024 },
  );
  if (created.code !== 0) throw new Error("unable to create the build workspace quota image");
  const formatted = await command.run(["/sbin/mkfs.ext4", "-q", "-F", quotaImage], {
    timeoutMs: 120_000,
    maxStdoutBytes: 4_096,
    maxStderrBytes: 4_096,
  });
  if (formatted.code !== 0) throw new Error("unable to format the build workspace quota image");
  const mountedNow = await command.run(
    ["/usr/bin/mount", "-o", "loop,nodev,nosuid", quotaImage, mountDir],
    { timeoutMs: 60_000, maxStdoutBytes: 4_096, maxStderrBytes: 4_096 },
  );
  if (mountedNow.code !== 0) {
    throw new Error(`unable to mount the build workspace quota: ${mountedNow.stderr.slice(0, 200)}`);
  }
}

/** Static install-script policy: no network-first install commands may run. */
export async function assertOfflineBuildPolicy(contextDir: string): Promise<void> {
  const dockerfile = await readFile(path.join(contextDir, "Dockerfile"), "utf8").catch(() => null);
  if (dockerfile === null) throw new Error("build context has no Dockerfile");
  const rawLines = dockerfile.split("\n");
  const commands: string[] = [];
  let currentCmd = "";
  for (const line of rawLines) {
    const trimmed = line.trim();
    if (trimmed.endsWith("\\")) {
      currentCmd += (currentCmd ? " " : "") + trimmed.slice(0, -1).trim();
    } else {
      currentCmd += (currentCmd ? " " : "") + trimmed;
      if (currentCmd.length > 0) {
        commands.push(currentCmd);
        currentCmd = "";
      }
    }
  }
  if (currentCmd.length > 0) commands.push(currentCmd);

  for (const cmd of commands) {
    if (cmd.toUpperCase().startsWith("RUN ")) {
      checkCommandPolicy(cmd.slice(4).trim());
    }
  }
}

/**
 * Offline build context: the frozen workspace source plus the frozen offline
 * dependency bundle, both from the read-only input image.
 */
export async function materializeBuildContext(
  entries: readonly BundleEntry[],
  contextDir: string,
): Promise<{ workspace_ref: string; offline_bundle_ref: string }> {
  await unpackTar(requireEntry(entries, "workspace.tar"), contextDir);
  const depsDir = path.join(contextDir, "deps");
  await unpackTar(requireEntry(entries, "deps.tar"), depsDir);
  await assertOfflineBuildPolicy(contextDir);
  return { workspace_ref: contextDir, offline_bundle_ref: depsDir };
}

/** Candidate-visible, read-only task inputs staged from `input/...` entries. */
export async function materializeCandidateInputs(
  entries: readonly BundleEntry[],
  inputDir: string,
): Promise<void> {
  await mkdir(inputDir, { recursive: true, mode: 0o755 });
  await chmod(inputDir, 0o755);
  for (const entry of entries) {
    if (!entry.name.startsWith("input/")) continue;
    const relative = entry.name.slice("input/".length);
    if (relative.length === 0 || relative.includes("..")) {
      throw new Error(`invalid candidate input entry: ${entry.name}`);
    }
    const destination = path.join(inputDir, relative);
    const parent = path.dirname(destination);
    await mkdir(parent, { recursive: true, mode: 0o755 });
    await chmod(parent, 0o755);
    await writeFile(destination, entry.data, { mode: 0o444 });
    await chmod(destination, 0o444);
  }
}

async function listTree(root: string): Promise<readonly string[]> {
  const files: string[] = [];
  const walk = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) files.push(path.relative(root, full));
      else throw new Error(`driver tree contains a non-regular entry: ${full}`);
    }
  };
  await walk(root);
  return files.sort();
}

/**
 * Verifies the packaged D3 driver tree against the bundle's digest manifest:
 * exact file set, per-file digest and size, and the aggregate tree digest.
 */
export async function verifyDriverTree(
  entries: readonly BundleEntry[],
  treeRoot: string,
): Promise<string> {
  const manifestEntry = requireEntry(entries, "drivers.json");
  let raw: unknown;
  try {
    raw = JSON.parse(manifestEntry.data.toString("utf8"));
  } catch {
    throw new Error("drivers.json is not valid JSON");
  }
  const record = strictObject(raw, "drivers.json", ["version", "tree_sha256", "files"]);
  if (record.version !== 1) throw new Error("drivers.json version must be 1");
  if (typeof record.tree_sha256 !== "string" || !SHA256_HEX.test(record.tree_sha256)) {
    throw new Error("drivers.json tree_sha256 must be 64 lowercase hex characters");
  }
  if (!Array.isArray(record.files) || record.files.length === 0) {
    throw new Error("drivers.json files must be a non-empty array");
  }
  const declared = record.files.map((item, index) => {
    const file = strictObject(item, `drivers.files[${index}]`, ["path", "sha256", "bytes"]);
    if (typeof file.path !== "string" || file.path.includes("..") || file.path.startsWith("/")) {
      throw new Error(`drivers.files[${index}].path is unsafe`);
    }
    if (typeof file.sha256 !== "string" || !SHA256_HEX.test(file.sha256)) {
      throw new Error(`drivers.files[${index}].sha256 is invalid`);
    }
    if (typeof file.bytes !== "number" || !Number.isSafeInteger(file.bytes) || file.bytes < 0) {
      throw new Error(`drivers.files[${index}].bytes is invalid`);
    }
    if (file.bytes > MAX_DRIVER_TREE_FILE_BYTES) {
      throw new Error(`drivers.files[${index}] exceeds the file ceiling`);
    }
    return { path: file.path, sha256: file.sha256, bytes: file.bytes };
  });

  const observedPaths = await listTree(treeRoot);
  const declaredPaths = declared.map((file) => file.path).sort();
  if (
    observedPaths.length !== declaredPaths.length ||
    observedPaths.some((observed, index) => observed !== declaredPaths[index])
  ) {
    throw new Error("packaged driver tree file set does not match its digest manifest");
  }
  const aggregate = createHash("sha256");
  for (const file of declared) {
    const bytes = await readFile(path.join(treeRoot, file.path));
    if (bytes.length !== file.bytes) {
      throw new Error(`driver file ${file.path} size does not match its digest manifest`);
    }
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== file.sha256) {
      throw new Error(`driver file ${file.path} digest does not match its digest manifest`);
    }
    aggregate.update(`${file.path}:${file.sha256}\n`, "utf8");
  }
  const treeDigest = aggregate.digest("hex");
  if (treeDigest !== record.tree_sha256) {
    throw new Error("packaged driver tree digest does not match its digest manifest");
  }
  return treeDigest;
}
