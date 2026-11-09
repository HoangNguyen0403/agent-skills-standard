/**
 * scripts/evals/l3/runtime/guest/build-policy.ts
 *
 * Enforcement facts for the supported offline builder container.
 *
 * The builder is not trusted because its argv *says* the right flags: every
 * control is verified against the actual container definition Docker stored and
 * against the actual cgroup the kernel created, before the trusted supervisor is
 * released to run the fixed compiler over untrusted source. Anything the source
 * could use to escape its budget (extra mounts, writable root, added
 * capabilities, a larger memory or pid ceiling) makes the stage fail closed.
 */

import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

export const SUPERVISOR_GUEST_PATH = "/opt/l3/build/supervisor.mjs";
export const BUILD_TOOLS_GUEST_PATH = "/opt/l3/build";
export const CONTROL_GUEST_PATH = "/control";
export const SOURCE_GUEST_PATH = "/src";
export const DEPS_GUEST_PATH = "/deps";
export const WORK_GUEST_PATH = "/work";
export const OUTPUT_GUEST_PATH = "/output";
export const REQUIRED_ENTRYPOINT = "app/index.js";
/** Container path the verified compiled tree is packaged at; also the run workdir. */
export const PACKAGED_GUEST_ROOT = "/workspace";
/**
 * One frozen supervisor argument vector. The container command, the config
 * validator, the packaging manifest and the local smoke all consume this exact
 * list, so the protocol cannot drift between creation and enforcement.
 */
export const SUPERVISOR_ARGS = Object.freeze([
  `${CONTROL_GUEST_PATH}/go`,
  SOURCE_GUEST_PATH,
  DEPS_GUEST_PATH,
  WORK_GUEST_PATH,
  OUTPUT_GUEST_PATH,
] as const);
export const SUPERVISOR_CMDLINE = Object.freeze([SUPERVISOR_GUEST_PATH, ...SUPERVISOR_ARGS] as const);
export const MAX_OUTPUT_FILES = 4_096;

export interface BuildEnforcement {
  readonly builder_digest: string;
  readonly memory_bytes: number;
  readonly cpu: number;
  readonly max_processes: number;
  readonly scratch_mib: number;
  readonly output_mib: number;
  readonly tmp_mib: number;
  readonly source_dir: string;
  readonly deps_dir: string;
  readonly control_dir: string;
}

export interface CompiledArtifact {
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
}

function tmpfsOption(value: string): Map<string, string | true> {
  const options = new Map<string, string | true>();
  for (const item of value.split(",")) {
    if (item.length === 0) continue;
    const index = item.indexOf("=");
    if (index === -1) options.set(item, true);
    else options.set(item.slice(0, index), item.slice(index + 1));
  }
  return options;
}

/**
 * Docker's inspect shape for a bind mount is `{Type, Source, Destination, Mode,
 * RW, Propagation}` — read-only is `RW === false`, not a `ReadOnly` field. The
 * pinned engine is v27.5.1, so the real shape is what gets validated.
 */
function requireMount(mounts: readonly Record<string, unknown>[], destination: string, source: string): void {
  const mount = mounts.find((entry) => entry["Destination"] === destination);
  if (mount === undefined) throw new Error(`build container is missing the ${destination} mount`);
  if (mount["Type"] !== "bind") throw new Error(`build container mount ${destination} is not a bind mount`);
  if (mount["RW"] !== false) throw new Error(`build container mount ${destination} is writable`);
  if (mount["Source"] !== source) throw new Error(`build container mount ${destination} has an unexpected source`);
}

function requireTmpfs(tmpfs: Record<string, unknown>, target: string, sizeMib: number, exec: boolean): void {
  const raw = tmpfs[target];
  if (typeof raw !== "string") throw new Error(`build container is missing the ${target} bounded scratch`);
  const options = tmpfsOption(raw);
  if (options.get("size") !== `${sizeMib}m`) {
    throw new Error(`build container ${target} is not bounded to ${sizeMib}m`);
  }
  if (options.get("uid") !== "1000" || options.get("gid") !== "1000") {
    throw new Error(`build container ${target} is not owned by the non-privileged builder uid`);
  }
  if (options.get("nosuid") !== true) throw new Error(`build container ${target} permits setuid execution`);
  if (exec && options.get("noexec") === true) throw new Error(`build container ${target} must permit the fixed tools`);
  if (!exec && options.get("noexec") !== true) throw new Error(`build container ${target} must be noexec`);
}

/**
 * Verifies the *actual* container definition Docker stored after `create`. The
 * accepted shape is exact; unknown capabilities or writable paths are refused.
 */
export function assertBuildContainerConfig(container: Record<string, unknown>, expected: BuildEnforcement): void {
  const host = container["HostConfig"];
  const config = container["Config"];
  const mounts = container["Mounts"];
  if (typeof host !== "object" || host === null) throw new Error("build container inspect has no HostConfig");
  if (typeof config !== "object" || config === null) throw new Error("build container inspect has no Config");
  if (!Array.isArray(mounts)) throw new Error("build container inspect has no Mounts");
  const hostConfig = host as Record<string, unknown>;
  const containerConfig = config as Record<string, unknown>;
  const mountList = mounts as Record<string, unknown>[];

  if (hostConfig["NetworkMode"] !== "none") throw new Error("build container has a network mode");
  if (hostConfig["ReadonlyRootfs"] !== true) throw new Error("build container root filesystem is writable");
  const logConfig = hostConfig["LogConfig"];
  if (typeof logConfig !== "object" || logConfig === null) throw new Error("build container has no logging policy");
  const logging = logConfig as Record<string, unknown>;
  if (logging["Type"] !== "none") throw new Error("build container enables unbounded daemon-side logging");
  const logOptions = logging["Config"];
  if (typeof logOptions === "object" && logOptions !== null && Object.keys(logOptions).length > 0) {
    throw new Error("build container has unexpected daemon logging options");
  }
  if (containerConfig["User"] !== "1000:1000") throw new Error("build container does not run as uid 1000");
  if (hostConfig["Memory"] !== expected.memory_bytes) throw new Error("build container memory ceiling differs from the manifest");
  if (hostConfig["MemorySwap"] !== expected.memory_bytes) throw new Error("build container swap ceiling differs from the manifest");
  if (hostConfig["NanoCpus"] !== expected.cpu * 1_000_000_000) throw new Error("build container cpu ceiling differs from the manifest");
  if (hostConfig["PidsLimit"] !== expected.max_processes) throw new Error("build container pid ceiling differs from the manifest");
  const capDrop = hostConfig["CapDrop"];
  if (!Array.isArray(capDrop) || capDrop.length !== 1 || capDrop[0] !== "ALL") {
    throw new Error("build container does not drop all capabilities");
  }
  const capAdd = hostConfig["CapAdd"];
  if (Array.isArray(capAdd) && capAdd.length > 0) throw new Error("build container adds capabilities");
  const securityOpt = hostConfig["SecurityOpt"];
  if (!Array.isArray(securityOpt) || !securityOpt.some((entry) => String(entry).startsWith("no-new-privileges"))) {
    throw new Error("build container does not set no-new-privileges");
  }
  const privileged = hostConfig["Privileged"];
  if (privileged === true) throw new Error("build container is privileged");
  const devices = hostConfig["Devices"];
  if (Array.isArray(devices) && devices.length > 0) throw new Error("build container exposes host devices");
  if (hostConfig["PidMode"] === "host") throw new Error("build container shares the host pid namespace");

  const tmpfs = hostConfig["Tmpfs"];
  if (typeof tmpfs !== "object" || tmpfs === null) throw new Error("build container has no bounded tmpfs scratch");
  const tmpfsRecord = tmpfs as Record<string, unknown>;
  requireTmpfs(tmpfsRecord, "/tmp", expected.tmp_mib, false);
  requireTmpfs(tmpfsRecord, WORK_GUEST_PATH, expected.scratch_mib, true);
  requireTmpfs(tmpfsRecord, OUTPUT_GUEST_PATH, expected.output_mib, true);

  requireMount(mountList, BUILD_TOOLS_GUEST_PATH, BUILD_TOOLS_GUEST_PATH);
  requireMount(mountList, SOURCE_GUEST_PATH, expected.source_dir);
  requireMount(mountList, DEPS_GUEST_PATH, expected.deps_dir);
  requireMount(mountList, CONTROL_GUEST_PATH, expected.control_dir);
  if (mountList.length !== 4) throw new Error("build container has an unexpected extra mount");

  const entrypoint = containerConfig["Entrypoint"];
  if (!Array.isArray(entrypoint) || entrypoint.length !== 1 || entrypoint[0] !== "node") {
    throw new Error("build container entrypoint is not the fixed supervisor interpreter");
  }
  const cmd = containerConfig["Cmd"];
  if (!Array.isArray(cmd) || cmd.length !== SUPERVISOR_CMDLINE.length) {
    throw new Error("build container command is not the fixed trusted supervisor invocation");
  }
  for (let index = 0; index < SUPERVISOR_CMDLINE.length; index += 1) {
    if (cmd[index] !== SUPERVISOR_CMDLINE[index]) {
      throw new Error(`build container command argument ${index} differs from the frozen supervisor contract`);
    }
  }
  const image = containerConfig["Image"];
  if (image !== expected.builder_digest) throw new Error("build container image is not the approved digest");
}

/**
 * Partitions the single manifest workspace allowance across every writable path
 * the builder has. The three ceilings sum to at most `total_mib`; a builder that
 * asks for more than the manifest grants is refused.
 */
export function partitionScratch(totalMib: number): {
  readonly tmp_mib: number;
  readonly work_mib: number;
  readonly output_mib: number;
} {
  if (!Number.isSafeInteger(totalMib) || totalMib < 4) {
    throw new Error(`workspace allowance must be a safe integer of at least 4 MiB, got ${totalMib}`);
  }
  // Deterministic split: an eighth for tmp, a quarter for the packaged output,
  // the remainder for the compilation workspace. Bounded but not guaranteed.
  const tmp = Math.max(1, Math.floor(totalMib / 8));
  const output = Math.max(1, Math.floor(totalMib / 4));
  const work = totalMib - tmp - output;
  if (work < 1) throw new Error("workspace allowance leaves no room for the compilation workspace");
  return { tmp_mib: tmp, work_mib: work, output_mib: output };
}

export interface CgroupExpectations {
  readonly memory_max_bytes: number;
  readonly pids_max: number;
  readonly cpu_max: string;
}

export function cgroupExpectations(expected: BuildEnforcement): CgroupExpectations {
  return {
    memory_max_bytes: expected.memory_bytes,
    pids_max: expected.max_processes,
    cpu_max: `${expected.cpu * 100000} 100000`,
  };
}

/**
 * Verifies the kernel's own limits, read from the container's cgroup. This is the
 * check that only exists once the container is running, which is why the trusted
 * supervisor blocks before any candidate byte is executed.
 */
export async function assertCgroupLimits(
  cgroupDir: string,
  expected: CgroupExpectations,
  read: (file: string) => Promise<string | null>,
): Promise<void> {
  const memory = await read(path.join(cgroupDir, "memory.max"));
  if (memory === null || memory.trim() !== String(expected.memory_max_bytes)) {
    throw new Error(`build cgroup memory.max is ${String(memory).trim()}, expected ${expected.memory_max_bytes}`);
  }
  const pids = await read(path.join(cgroupDir, "pids.max"));
  if (pids === null || pids.trim() !== String(expected.pids_max)) {
    throw new Error(`build cgroup pids.max is ${String(pids).trim()}, expected ${expected.pids_max}`);
  }
  const cpu = await read(path.join(cgroupDir, "cpu.max"));
  if (cpu === null || cpu.trim() !== expected.cpu_max) {
    throw new Error(`build cgroup cpu.max is ${String(cpu).trim()}, expected ${expected.cpu_max}`);
  }
}

/**
 * Verifies the compiler's actual produced bytes: a bounded tree of regular
 * files, with the required executable entrypoint present and every digest
 * recomputed here. Returns the packaged artifact list.
 */
export async function verifyCompiledOutput(
  outputDir: string,
  maxBytes: number,
): Promise<{ readonly artifacts: readonly CompiledArtifact[]; readonly entrypoint_sha256: string }> {
  const artifacts: CompiledArtifact[] = [];
  let total = 0;
  const walk = async (relative: string): Promise<void> => {
    for (const entry of await readdir(path.join(outputDir, relative), { withFileTypes: true })) {
      const next = relative === "" ? entry.name : `${relative}/${entry.name}`;
      if (entry.isDirectory()) {
        await walk(next);
        continue;
      }
      if (!entry.isFile()) throw new Error(`compiled output contains a non-regular entry: ${next}`);
      if (artifacts.length >= MAX_OUTPUT_FILES) throw new Error("compiled output exceeds its file ceiling");
      const body = await readFile(path.join(outputDir, next));
      total += body.length;
      if (total > maxBytes) throw new Error(`compiled output exceeds its ${maxBytes}-byte ceiling`);
      artifacts.push({
        path: next,
        sha256: createHash("sha256").update(body).digest("hex"),
        bytes: body.length,
      });
    }
  };
  await walk("");
  const entrypoint = artifacts.find((artifact) => artifact.path === REQUIRED_ENTRYPOINT);
  if (entrypoint === undefined) {
    throw new Error(`compiled output is missing the required entrypoint ${REQUIRED_ENTRYPOINT}`);
  }
  const entrypointInfo = await stat(path.join(outputDir, REQUIRED_ENTRYPOINT));
  if (!entrypointInfo.isFile() || entrypointInfo.size === 0) {
    throw new Error("compiled entrypoint is not a non-empty regular file");
  }
  return { artifacts: Object.freeze(artifacts), entrypoint_sha256: entrypoint.sha256 };
}
