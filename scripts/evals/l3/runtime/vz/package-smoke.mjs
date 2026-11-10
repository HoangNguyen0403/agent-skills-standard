/**
 * scripts/evals/l3/runtime/vz/package-smoke.mjs
 *
 * Loads an actually packaged guest root and proves the ESM import graph
 * resolves, without booting a VM, starting Docker or running any candidate.
 *
 * Usage: node package-smoke.mjs /path/to/guest-root
 */

import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";

const root = process.argv[2];
if (root === undefined) {
  throw new Error("usage: node package-smoke.mjs <guest-root>");
}

const opt = path.join(root, "opt", "l3");
const controller = await import(pathToFileURL(path.join(opt, "controller.mjs")).href);
const collector = await import(pathToFileURL(path.join(opt, "collector.mjs")).href);
assert.equal(typeof controller.controllerMain, "function");
assert.equal(typeof collector.collectorEntrypoint, "function");

const runtime = await import(pathToFileURL(path.join(opt, "runtime", "guest", "controller.js")).href);
assert.equal(typeof runtime.ControllerApp, "function");
const auxiliary = await import(pathToFileURL(path.join(opt, "runtime", "guest", "auxiliary.js")).href);
assert.equal(typeof auxiliary.AuxiliaryChannel, "function");
const invocation = await import(pathToFileURL(path.join(opt, "runtime", "guest", "invocation.js")).href);
assert.equal(typeof invocation.verifyInvocationBinding, "function");

const drivers = await import(pathToFileURL(path.join(opt, "drivers", "cases", "index.js")).href);
for (const name of [
  "PaymentCaseDriver",
  "TenantCaseDriver",
  "OverloadCaseDriver",
  "ProviderStub",
  "SummarizerStub",
  "RealMonotonicScheduler",
]) {
  assert.equal(typeof drivers[name], "function", `driver tree is missing ${name}`);
}

process.stdout.write(
  `${JSON.stringify({
    event: "packaged_smoke_ok",
    controller: "controller.mjs",
    collector: "collector.mjs",
    driver_exports: 6,
  })}\n`,
);
