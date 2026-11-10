/**
 * scripts/evals/l3/runtime/build-policy.test.ts
 *
 * Enforcement facts for the offline builder container, proven at the boundary
 * that matters: the *actual* container definition Docker stores, the *actual*
 * kernel cgroup limits, and the *actual* bytes the compiler produced.
 *
 * These are pure/bounded checks; no Docker daemon, image, VM or network is used.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  REQUIRED_ENTRYPOINT,
  SUPERVISOR_CMDLINE,
  assertBuildContainerConfig,
  assertCgroupLimits,
  cgroupExpectations,
  partitionScratch,
  verifyCompiledOutput,
  type BuildEnforcement,
} from "./guest/build-policy";

const ENFORCEMENT: BuildEnforcement = {
  builder_digest: `sha256:${"a".repeat(64)}`,
  memory_bytes: 1024 * 1024 * 1024,
  cpu: 1,
  max_processes: 128,
  scratch_mib: 320,
  output_mib: 128,
  tmp_mib: 64,
  source_dir: "/state/build-context",
  deps_dir: "/state/build-context/deps",
  control_dir: "/state/build/control",
};

function containerFixture(): Record<string, unknown> {
  return {
    HostConfig: {
      NetworkMode: "none",
      ReadonlyRootfs: true,
      Memory: ENFORCEMENT.memory_bytes,
      MemorySwap: ENFORCEMENT.memory_bytes,
      NanoCpus: 1_000_000_000,
      PidsLimit: ENFORCEMENT.max_processes,
      CapDrop: ["ALL"],
      CapAdd: null,
      LogConfig: { Type: "none", Config: {} },
      SecurityOpt: ["no-new-privileges"],
      Privileged: false,
      Devices: [],
      PidMode: "",
      Tmpfs: {
        "/tmp": "rw,noexec,nosuid,nodev,size=64m,uid=1000,gid=1000",
        "/work": "rw,nosuid,nodev,size=320m,uid=1000,gid=1000",
        "/output": "rw,nosuid,nodev,size=128m,uid=1000,gid=1000",
      },
    },
    Config: {
      User: "1000:1000",
      Entrypoint: ["node"],
      Cmd: [...SUPERVISOR_CMDLINE],
      Image: ENFORCEMENT.builder_digest,
    },
    Mounts: [
      { Type: "bind", Source: "/opt/l3/build", Destination: "/opt/l3/build", Mode: "", RW: false, Propagation: "rprivate" },
      { Type: "bind", Source: ENFORCEMENT.source_dir, Destination: "/src", Mode: "", RW: false, Propagation: "rprivate" },
      { Type: "bind", Source: ENFORCEMENT.deps_dir, Destination: "/deps", Mode: "", RW: false, Propagation: "rprivate" },
      { Type: "bind", Source: ENFORCEMENT.control_dir, Destination: "/control", Mode: "", RW: false, Propagation: "rprivate" },
    ],
  };
}

function mutate(pathParts: readonly (string | number)[], value: unknown): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(containerFixture())) as Record<string, unknown>;
  let cursor: Record<string, unknown> | unknown[] = clone;
  for (let index = 0; index < pathParts.length - 1; index += 1) {
    const key = pathParts[index];
    cursor = (cursor as Record<string | number, never>)[key as string] as never;
  }
  (cursor as Record<string | number, unknown>)[pathParts[pathParts.length - 1] as string] = value;
  return clone;
}

describe("builder container enforcement", () => {
  it("accepts the exact enforced shape and refuses every weakened control", () => {
    assert.doesNotThrow(() => assertBuildContainerConfig(containerFixture(), ENFORCEMENT));

    const mutations: readonly [readonly (string | number)[], unknown, RegExp][] = [
      [["HostConfig", "NetworkMode"], "bridge", /network mode/],
      [["HostConfig", "LogConfig"], { Type: "json-file", Config: {} }, /unbounded daemon-side logging/],
      [["HostConfig", "ReadonlyRootfs"], false, /root filesystem is writable/],
      [["Config", "User"], "0:0", /uid 1000/],
      [["HostConfig", "Memory"], ENFORCEMENT.memory_bytes * 2, /memory ceiling/],
      [["HostConfig", "MemorySwap"], -1, /swap ceiling/],
      [["HostConfig", "NanoCpus"], 2_000_000_000, /cpu ceiling/],
      [["HostConfig", "PidsLimit"], 4096, /pid ceiling/],
      [["HostConfig", "CapDrop"], [], /drop all capabilities/],
      [["HostConfig", "CapAdd"], ["SYS_ADMIN"], /adds capabilities/],
      [["HostConfig", "SecurityOpt"], [], /no-new-privileges/],
      [["HostConfig", "Privileged"], true, /privileged/],
      [["HostConfig", "PidMode"], "host", /pid namespace/],
      [["HostConfig", "Tmpfs"], { "/tmp": "rw,noexec,nosuid,size=64m,uid=1000,gid=1000", "/work": "rw,nosuid,nodev,size=320m,uid=1000,gid=1000" }, /bounded scratch/],
      [["Config", "Entrypoint"], ["sh"], /fixed supervisor interpreter/],
      [["Config", "Cmd"], ["/bin/sh"], /supervisor invocation/],
      [["Config", "Cmd"], [...SUPERVISOR_CMDLINE.slice(0, -1)], /supervisor invocation/],
      [["Config", "Cmd"], [...SUPERVISOR_CMDLINE.slice(0, -1), "/elsewhere"], /frozen supervisor contract/],
      [["Config", "Image"], "node:22-alpine", /approved digest/],
    ];
    for (const [parts, value, expectation] of mutations) {
      assert.throws(
        () => assertBuildContainerConfig(mutate(parts, value), ENFORCEMENT),
        expectation,
        `mutation ${parts.join(".")} was not refused`,
      );
    }

    // The output scratch is bounded: growing it silently is refused.
    const grownOutput = mutate(
      ["HostConfig", "Tmpfs"],
      {
        "/tmp": "rw,noexec,nosuid,nodev,size=64m,uid=1000,gid=1000",
        "/work": "rw,nosuid,nodev,size=320m,uid=1000,gid=1000",
        "/output": "rw,nosuid,nodev,size=2048m,uid=1000,gid=1000",
      },
    );
    assert.throws(() => assertBuildContainerConfig(grownOutput, ENFORCEMENT), /bounded to 128m/);

    // An extra writable mount is refused.
    const extraMount = JSON.parse(JSON.stringify(containerFixture())) as Record<string, unknown>;
    (extraMount["Mounts"] as Record<string, unknown>[]).push({
      Type: "bind",
      Source: "/",
      Destination: "/host",
      Mode: "",
      RW: true,
      Propagation: "rprivate",
    });
    assert.throws(() => assertBuildContainerConfig(extraMount, ENFORCEMENT), /unexpected extra mount/);
  });

  it("partitions the single manifest workspace allowance across every writable path", () => {
    const split = partitionScratch(512);
    assert.ok(split.tmp_mib + split.work_mib + split.output_mib <= 512);
    assert.deepEqual(split, { tmp_mib: 64, work_mib: 320, output_mib: 128 });
    assert.throws(() => partitionScratch(2), /at least 4 MiB/);
    // Every allowance is fully partitioned; none of it is unaccounted writable space.
    for (const total of [4, 64, 129, 512, 1024]) {
      const parts = partitionScratch(total);
      assert.ok(parts.tmp_mib + parts.work_mib + parts.output_mib <= total);
      assert.ok(parts.tmp_mib >= 1 && parts.work_mib >= 1 && parts.output_mib >= 1);
    }
  });

  it("verifies the kernel cgroup limits that only exist once the container runs", async () => {
    const expected = cgroupExpectations(ENFORCEMENT);
    assert.deepEqual(expected, {
      memory_max_bytes: ENFORCEMENT.memory_bytes,
      pids_max: ENFORCEMENT.max_processes,
      cpu_max: "100000 100000",
    });

    const files = new Map([
      ["memory.max", `${ENFORCEMENT.memory_bytes}\n`],
      ["pids.max", `${ENFORCEMENT.max_processes}\n`],
      ["cpu.max", "100000 100000\n"],
    ]);
    const read = async (file: string): Promise<string | null> => files.get(path.basename(file)) ?? null;
    await assertCgroupLimits("/sys/fs/cgroup/x", expected, read);

    files.set("memory.max", `${ENFORCEMENT.memory_bytes * 4}\n`);
    await assert.rejects(async () => await assertCgroupLimits("/sys/fs/cgroup/x", expected, read), /memory.max/);
    files.set("memory.max", `${ENFORCEMENT.memory_bytes}\n`);
    files.set("pids.max", "max\n");
    await assert.rejects(async () => await assertCgroupLimits("/sys/fs/cgroup/x", expected, read), /pids.max/);
    files.set("pids.max", `${ENFORCEMENT.max_processes}\n`);
    files.set("cpu.max", "200000 100000\n");
    await assert.rejects(async () => await assertCgroupLimits("/sys/fs/cgroup/x", expected, read), /cpu.max/);
    files.delete("cpu.max");
    await assert.rejects(async () => await assertCgroupLimits("/sys/fs/cgroup/x", expected, read), /cpu.max/);
  });

  it("runs the assembled supervisor with a real compiler and produces the packaged layout", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "l3-supervisor-"));
    try {
      const source = path.join(root, "src");
      const deps = path.join(root, "deps");
      const work = path.join(root, "work");
      const output = path.join(root, "output");
      const control = path.join(root, "control");
      await mkdir(path.join(source, "app"), { recursive: true });
      await mkdir(path.join(control), { recursive: true });
      await writeFile(
        path.join(source, "package.json"),
        JSON.stringify({
          name: "l3-fixture",
          version: "1.0.0",
          type: "module",
          dependencies: { "tiny-dep": "1.0.0" },
        }),
      );
      await writeFile(
        path.join(source, "package-lock.json"),
        JSON.stringify({
          lockfileVersion: 3,
          packages: {
            "": { dependencies: { "tiny-dep": "1.0.0" } },
            "node_modules/tiny-dep": { version: "1.0.0", dependencies: { "transitive-dep": "1.0.0" } },
            "node_modules/tiny-dep/node_modules/transitive-dep": { version: "1.0.0" },
          },
        }),
      );
      await writeFile(path.join(source, "tsconfig.json"), JSON.stringify({
        compilerOptions: { rootDir: ".", module: "NodeNext", moduleResolution: "NodeNext", target: "ES2020", strict: true },
        include: ["app/**/*.ts"],
      }));
      await writeFile(path.join(source, "app", "index.ts"), "export const answer: number = 42;\n");

      // A real frozen dependency tree: the installed compiler plus one runtime dep.
      await mkdir(path.join(deps, "node_modules"), { recursive: true });
      await cp(
        path.resolve(process.cwd(), "node_modules", "typescript"),
        path.join(deps, "node_modules", "typescript"),
        { recursive: true },
      );
      await mkdir(path.join(deps, "node_modules", "tiny-dep"), { recursive: true });
      await writeFile(
        path.join(deps, "node_modules", "tiny-dep", "package.json"),
        JSON.stringify({ name: "tiny-dep", version: "1.0.0", main: "index.js" }),
      );
      await writeFile(path.join(deps, "node_modules", "tiny-dep", "index.js"), "module.exports = 1;\n");
      await mkdir(path.join(deps, "node_modules", "tiny-dep", "node_modules", "transitive-dep"), { recursive: true });
      await writeFile(
        path.join(deps, "node_modules", "tiny-dep", "node_modules", "transitive-dep", "package.json"),
        JSON.stringify({ name: "transitive-dep", version: "1.0.0", main: "index.js" }),
      );
      await writeFile(
        path.join(deps, "node_modules", "tiny-dep", "node_modules", "transitive-dep", "index.js"),
        "module.exports = 2;\n",
      );

      // The host releases the trusted supervisor by writing the control token.
      await writeFile(path.join(control, "go"), "released\n");

      const supervisor = path.resolve("scripts/evals/l3/runtime/guest/build/supervisor.mjs");
      const run = spawnSync(
        process.execPath,
        [supervisor, path.join(control, "go"), source, deps, work, output],
        { encoding: "utf8", timeout: 120_000 },
      );
      assert.equal(run.status, 0, `supervisor failed: ${run.stdout}\n${run.stderr}`);

      // The packaged root is the compiled entrypoint plus locked runtime deps.
      const verified = await verifyCompiledOutput(output, 256 * 1024 * 1024);
      assert.equal(verified.entrypoint_sha256.length, 64);
      assert.ok(verified.artifacts.some((artifact) => artifact.path === "node_modules/tiny-dep/index.js"));
      assert.ok(
        verified.artifacts.some((artifact) => artifact.path === "node_modules/tiny-dep/node_modules/transitive-dep/index.js"),
        "the nested locked runtime dependency is included",
      );
      assert.deepEqual(JSON.parse(await readFile(path.join(output, "package.json"), "utf8")), { type: "module" });
      // Exercise Node's runtime package boundary; static test imports cannot
      // validate the generated package.json or its module interpretation.
      const compiledModule = await import(pathToFileURL(path.join(output, "app", "index.js")).href);
      assert.equal(compiledModule.answer, 42, "the compiled output runs under the packaged module mode");
      assert.equal(
        verified.artifacts.some((artifact) => artifact.path.endsWith(".ts")),
        false,
        "the packaged root contains compiled output, not source",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("packages only the compiler's actual produced bytes with a verified entrypoint", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "l3-build-output-"));
    try {
      await mkdir(path.join(root, path.dirname(REQUIRED_ENTRYPOINT)), { recursive: true });
      await writeFile(path.join(root, REQUIRED_ENTRYPOINT), "console.log('compiled');\n");
      await writeFile(path.join(root, "helper.js"), "export const value = 1;\n");

      const verified = await verifyCompiledOutput(root, 1_048_576);
      assert.equal(verified.artifacts.length, 2);
      const entrypoint = verified.artifacts.find((artifact) => artifact.path === REQUIRED_ENTRYPOINT);
      assert.notEqual(entrypoint, undefined);
      assert.equal(verified.entrypoint_sha256, entrypoint?.sha256);

      // A missing entrypoint is not "some files exist".
      await rm(path.join(root, REQUIRED_ENTRYPOINT));
      await assert.rejects(async () => await verifyCompiledOutput(root, 1_048_576), /required entrypoint/);

      // A symlink in the produced tree is refused rather than packaged.
      await symlink(path.join(root, "helper.js"), path.join(root, "link.js"));
      await assert.rejects(async () => await verifyCompiledOutput(root, 1_048_576), /non-regular entry/);
      await rm(path.join(root, "link.js"));

      // The byte ceiling is the manifest's, not the compiler's claim.
      await writeFile(path.join(root, REQUIRED_ENTRYPOINT), "x".repeat(2_048));
      await assert.rejects(async () => await verifyCompiledOutput(root, 1_024), /byte ceiling/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
