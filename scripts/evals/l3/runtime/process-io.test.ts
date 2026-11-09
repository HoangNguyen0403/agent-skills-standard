/**
 * scripts/evals/l3/runtime/process-io.test.ts
 *
 * Real process-bound tests: this Node binary with inline scripts. No VM, no
 * candidate code, no network.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NodeProcessIO } from "./process-io";

const NODE = process.execPath;

function inline(script: string): readonly string[] {
  return [NODE, "-e", script];
}

describe("NodeProcessIO.run enforces real process bounds", () => {
  const io = new NodeProcessIO();

  it("kills a child that exceeds its wall-clock ceiling", async () => {
    const result = await io.run({
      argv: inline("setTimeout(() => {}, 30_000)"),
      timeoutMs: 300,
      maxStdoutBytes: 1024,
      maxStderrBytes: 1024,
    });
    assert.equal(result.timedOut, true);
    assert.equal(result.exitCode, null);
    assert.equal(result.signal, "SIGKILL");
  });

  it("terminates on stdout overflow and stops counting past the cap", async () => {
    const result = await io.run({
      argv: inline("process.stdout.write('x'.repeat(10_000_000))"),
      timeoutMs: 20_000,
      maxStdoutBytes: 128,
      maxStderrBytes: 1024,
    });
    assert.equal(result.stdoutTruncated, true);
    assert.equal(result.stdout.length, 128);
    assert.equal(result.exitCode, null);
    // Observed bytes are bounded by the cap plus at most one chunk.
    assert.ok(result.observedBytes < 200_000, `observed ${result.observedBytes}`);
  });

  it("reports cancellation distinctly from timeout", async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 100);
    const result = await io.run({
      argv: inline("setTimeout(() => {}, 30_000)"),
      timeoutMs: 20_000,
      maxStdoutBytes: 1024,
      maxStderrBytes: 1024,
      signal: controller.signal,
    });
    assert.equal(result.cancelled, true);
    assert.equal(result.timedOut, false);
  });

  it("kills descendants when the parent is terminated", async () => {
    const result = await io.run({
      argv: inline(
        [
          "const { spawn } = require('node:child_process');",
          "const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 30000)'], { stdio: 'ignore' });",
          "process.stdout.write(String(child.pid));",
          "setTimeout(() => {}, 30000);",
        ].join("\n"),
      ),
      timeoutMs: 400,
      maxStdoutBytes: 128,
      maxStderrBytes: 128,
    });
    assert.equal(result.timedOut, true);
    const descendant = Number(result.stdout.trim());
    assert.ok(Number.isSafeInteger(descendant) && descendant > 0);
    // The process group kill must have reaped the descendant as well.
    assert.throws(() => process.kill(descendant, 0), /ESRCH/);
  });
});

describe("NodeProcessIO.openSerialCapture is one-way and bounded", () => {
  const io = new NodeProcessIO();

  it("reads serialized frames from an inherited descriptor", async () => {
    const capture = await io.openSerialCapture({
      argv: inline(
        [
          "const fs = require('node:fs');",
          "fs.writeSync(3, JSON.stringify({ hello: 1 }) + '\\n');",
          "fs.writeSync(3, JSON.stringify({ hello: 2 }) + '\\n');",
        ].join("\n"),
      ),
      timeoutMs: 10_000,
      maxFrames: 10,
      maxFrameBytes: 1024,
      maxTotalBytes: 4096,
      maxStderrBytes: 1024,
    });

    const first = await capture.readFrame(Date.now() + 5_000);
    const second = await capture.readFrame(Date.now() + 5_000);
    assert.deepEqual(JSON.parse(first), { hello: 1 });
    assert.deepEqual(JSON.parse(second), { hello: 2 });
    assert.equal(capture.stats().frames, 2);
    const exit = await capture.wait(Date.now() + 5_000);
    assert.equal(exit.exitCode, 0);
  });

  it("terminates the runner when the serial byte ceiling is exceeded", async () => {
    const capture = await io.openSerialCapture({
      argv: inline(
        [
          "const fs = require('node:fs');",
          "for (let i = 0; i < 200; i += 1) fs.writeSync(3, 'x'.repeat(1024));",
          "setTimeout(() => {}, 30000);",
        ].join("\n"),
      ),
      timeoutMs: 20_000,
      maxFrames: 10_000,
      maxFrameBytes: 4096,
      maxTotalBytes: 4096,
      maxStderrBytes: 1024,
    });

    await assert.rejects(async () => {
      for (;;) await capture.readFrame(Date.now() + 2_000);
    });
    assert.equal(capture.stats().truncated, true);
    assert.equal(capture.stats().killed, true);
  });

  it("rejects a frame larger than the per-frame cap", async () => {
    const capture = await io.openSerialCapture({
      argv: inline(
        [
          "const fs = require('node:fs');",
          "fs.writeSync(3, JSON.stringify({ big: 'y'.repeat(5000) }) + '\\n');",
        ].join("\n"),
      ),
      timeoutMs: 10_000,
      maxFrames: 10,
      maxFrameBytes: 1024,
      maxTotalBytes: 65536,
      maxStderrBytes: 1024,
    });
    await assert.rejects(async () => capture.readFrame(Date.now() + 3_000), /exceeded|Frame size/i);
  });

  it("honours one absolute deadline across the whole read loop", async () => {
    const capture = await io.openSerialCapture({
      argv: inline("setTimeout(() => {}, 30000)"),
      timeoutMs: 20_000,
      maxFrames: 10,
      maxFrameBytes: 1024,
      maxTotalBytes: 4096,
      maxStderrBytes: 1024,
    });
    const deadline = Date.now() + 250;
    const started = Date.now();
    await assert.rejects(async () => capture.readFrame(deadline));
    const elapsed = Date.now() - started;
    assert.ok(elapsed < 3_000, `deadline took ${elapsed} ms`);
    await capture.kill();
  });
});
