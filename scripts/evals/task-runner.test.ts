/**
 * Comprehensive integration and unit tests for the executable task-evaluation harness.
 *
 * Exercises:
 * - Manifest, worker, and path traversal validation (safe single-component IDs, symlink rejection).
 * - Real child-process execution of passing pagination implementation.
 * - Real child-process execution of passing authorization implementation.
 * - Adversarial verifier rejection of written insecure cross-tenant implementations.
 * - Bounded process execution, timeout enforcement, and owned process-group cleanup.
 * - Fail-closed verifier and prompt integrity checks.
 * - Proper classification of spawn/infrastructure failures.
 * - Exact temporary-workspace cleanup and credential-safe persisted output.
 * - Suite runner aggregation, repetition, and split filtering.
 */

import { describe, it } from "node:test";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import os from "node:os";
import * as path from "node:path";
import fs from "fs-extra";
import {
  executeTaskRun,
  hashDirectory,
  runBoundedProcess,
  runTaskSuite,
  sha256,
  validateManifest,
  validateWorkerConfig,
} from "./task-runner";
import type { WorkerConfig } from "./task-types";

describe("Executable Task-Evaluation Harness", () => {
  const repoRoot = path.resolve(__dirname, "../..");
  const manifestPath = path.resolve(repoRoot, "benchmarks/tasks/pilot.json");
  const manifestDir = path.dirname(manifestPath);

  describe("Validation, Traversal & Security Invariants", () => {
    it("validates a well-formed worker config without guessing", () => {
      const valid = {
        executable: "node",
        args: ["worker.js", "{workspace}"],
        model: "gpt-5.4",
        effort: "high",
        timeoutMs: 15000,
      };

      const validated = validateWorkerConfig(valid);
      assert.equal(validated.executable, "node");
      assert.equal(validated.model, "gpt-5.4");
      assert.equal(validated.effort, "high");
      assert.equal(validated.timeoutMs, 15000);
      assert.deepEqual(validated.args, ["worker.js", "{workspace}"]);
    });

    it("rejects worker configs missing mandatory fields or invalid timeouts", () => {
      assert.throws(
        () => validateWorkerConfig({ args: [], model: "m", effort: "e", timeoutMs: 1000 }),
        /missing or empty required field: 'executable'/,
      );

      assert.throws(
        () => validateWorkerConfig({ executable: "node", args: [], effort: "e", timeoutMs: 1000 }),
        /missing or empty required field: 'model'/,
      );

      assert.throws(
        () => validateWorkerConfig({ executable: "node", args: [], model: "m", timeoutMs: 1000 }),
        /missing or empty required field: 'effort'/,
      );

      assert.throws(
        () => validateWorkerConfig({ executable: "node", args: [], model: "m", effort: "e", timeoutMs: -50 }),
        /positive integer between 100 and 600,000/,
      );

      assert.throws(
        () => validateWorkerConfig({ executable: "node", args: [], model: "m", effort: "e", timeoutMs: 1.5 }),
        /positive integer between 100 and 600,000/,
      );
    });

    it("rejects task IDs with path traversal attempts", async () => {
      const rawManifest = await fs.readJson(manifestPath);
      const malicious = {
        schemaVersion: 1,
        tasks: [
          {
            ...rawManifest.tasks[0],
            id: "../../escaped-task",
          },
        ],
      };

      await assert.rejects(
        () => validateManifest(malicious, manifestDir),
        /Task ID must be a single path component matching \[a-zA-Z0-9_-\]\+/,
      );
    });

    it("rejects fixture directories containing symbolic links", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "symlink-fixture-test-"));
      const targetFile = path.join(tempDir, "real.txt");
      await fs.writeFile(targetFile, "real content", "utf8");
      const symlinkPath = path.join(tempDir, "link.txt");
      await fs.symlink(targetFile, symlinkPath);

      await assert.rejects(
        () => hashDirectory(tempDir),
        /Symbolic links in fixtures are strictly prohibited/,
      );
      const linkParent = await fs.mkdtemp(path.join(os.tmpdir(), "symlink-root-test-"));
      const linkedRoot = path.join(linkParent, "fixture");
      await fs.symlink(tempDir, linkedRoot, "dir");
      await assert.rejects(
        () => hashDirectory(linkedRoot),
        /Fixture root must be a real directory/,
      );
      await fs.remove(linkParent);

      await fs.remove(tempDir);
    });
    it("rejects fixture-contained output and exclusively rejects an existing output directory", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-output-ownership-"));
      const workerConfigPath = path.join(tempDir, "worker.json");
      await fs.writeJson(workerConfigPath, {
        executable: process.execPath,
        args: ["-e", "process.exit(0)", "{workspace}"],
        model: "output-ownership-test",
        effort: "low",
        timeoutMs: 1000,
      });
      const fixtureOutput = path.join(manifestDir, "fixtures", "pagination", "new-output");
      await assert.rejects(
        () => runTaskSuite({
          manifestPath,
          workerConfigPath,
          outputDir: fixtureOutput,
          split: "calibration",
        }),
        /Output directory must not be inside fixture/,
      );
      assert.equal(await fs.pathExists(fixtureOutput), false);

      const existingOutput = path.join(tempDir, "already-exists");
      await fs.mkdir(existingOutput);
      await assert.rejects(
        () => runTaskSuite({
          manifestPath,
          workerConfigPath,
          outputDir: existingOutput,
          split: "calibration",
        }),
        /Unable to exclusively create new output directory/,
      );
      const symlinkTarget = path.join(tempDir, "symlink-target");
      const symlinkOutput = path.join(tempDir, "output-link");
      await fs.mkdir(symlinkTarget);
      await fs.symlink(symlinkTarget, symlinkOutput, "dir");
      await assert.rejects(
        () => runTaskSuite({
          manifestPath,
          workerConfigPath,
          outputDir: symlinkOutput,
          split: "calibration",
        }),
        /Unable to exclusively create new output directory/,
      );
      assert.deepEqual(await fs.readdir(symlinkTarget), []);
      await fs.remove(tempDir);
    });

    it("computes deterministic hashes for files and directories", async () => {
      const hash1 = sha256("test-content");
      const hash2 = sha256("test-content");
      assert.equal(hash1, hash2);

      const fixtureHash = await hashDirectory(
        path.resolve(manifestDir, "fixtures/pagination"),
      );
      assert.equal(typeof fixtureHash, "string");
      assert.equal(fixtureHash.length, 64);
    });
  });
    it("does not count a candidate that exits before completing verification", async () => {
      const manifest = await validateManifest(await fs.readJson(manifestPath), manifestDir);
      const task = manifest.tasks.find((entry) => entry.id === "pagination-boundary");
      assert.ok(task);
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-test-verifier-early-exit-"));
      const workerPath = path.join(tempDir, "write-early-exit.js");
      await fs.writeFile(
        workerPath,
        `const fs = require("node:fs");
const path = require("node:path");
fs.writeFileSync(path.join(process.argv[2], "src", "paginate.js"), "process.exit(0);\\n");
`,
      );

      try {
        const result = await executeTaskRun({
          task,
          arm: "candidate",
          repetition: 1,
          workerConfig: {
            executable: process.execPath,
            args: [workerPath, "{workspace}"],
            model: "early-exit-regression",
            effort: "low",
            timeoutMs: 5000,
          },
          manifestDir,
          outputDir: path.join(tempDir, "results"),
        });
        assert.equal(result.exitOutcomes.workerExitCode, 0);
        assert.equal(result.success, false, "Exit zero without verifier completion must not pass");
        assert.ok(
          result.exitOutcomes.infrastructureError || result.exitOutcomes.verifierExitCode !== 0,
          "Incomplete verifier execution must have a distinct non-success outcome",
        );
      } finally {
        await fs.remove(tempDir);
      }
    });


    it("does not resolve normally while a non-detached ignored-stdio helper remains live", async () => {
      if (process.platform === "win32") return;
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-test-normal-exit-helper-"));
      const pidPath = path.join(tempDir, "helper.pid");
      const workerPath = path.join(tempDir, "leader-exits.js");
      const token = `task-eval-normal-exit-${process.pid}-${Date.now()}`;
      // This real-process integration case must keep the helper alive until the runner proves cleanup.
      const helperCode = `process.title = ${JSON.stringify(token)}; setInterval(() => {}, 1000); setTimeout(() => process.exit(0), 6000);`;
      const workerCode = `
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const helper = spawn(process.execPath, ["-e", ${JSON.stringify(helperCode)}], { stdio: "ignore" });
helper.unref();
fs.writeFileSync(process.argv[2], String(helper.pid));
`;
      await fs.writeFile(workerPath, workerCode, "utf8");
      let helperPid: number | undefined;

      try {
        const result = await runBoundedProcess({
          executable: process.execPath,
          args: [workerPath, pidPath],
          cwd: tempDir,
          timeoutMs: 5000,
        });
        helperPid = Number(await fs.readFile(pidPath, "utf8"));
        const probe = spawnSync("ps", ["-o", "stat=,command=", "-p", String(helperPid)], {
          encoding: "utf8",
          timeout: 1000,
        });
        assert.equal(result.exitCode, 0);
        assert.equal(result.timedOut, false);
        assert.equal(probe.error, undefined, probe.error?.message);
        assert.ok(
          !probe.stdout.trim() || probe.stdout.trimStart().startsWith("Z"),
          `Owned helper remained live after runner resolution: ${probe.stdout}`,
        );
      } finally {
        if (helperPid !== undefined) {
          const probe = spawnSync("ps", ["-o", "command=", "-p", String(helperPid)], {
            encoding: "utf8",
            timeout: 1000,
          });
          if (probe.stdout.includes(token)) {
            try {
              process.kill(helperPid, "SIGKILL");
            } catch {
              // The recorded fixture helper may exit between the process probe and signal.
            }
          }
        }
        await fs.remove(tempDir);
      }
    });

  describe("Passing and Failing Implementation Writes", () => {
    const correctPaginateCode = `
function paginate(items, options) {
  if (!Array.isArray(items)) {
    throw new TypeError("items must be an array");
  }
  options = options || {};
  var page = Number.isInteger(options.page) && options.page > 0 ? options.page : 1;
  var maxPageSize = Number.isInteger(options.maxPageSize) && options.maxPageSize > 0 ? options.maxPageSize : 100;
  var rawPageSize = Number.isInteger(options.pageSize) ? Math.max(1, options.pageSize) : 10;
  var pageSize = Math.min(rawPageSize, maxPageSize);

  var totalItems = items.length;
  var totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

  var data = [];
  if (totalItems > 0 && page <= totalPages) {
    var startIndex = (page - 1) * pageSize;
    var endIndex = startIndex + pageSize;
    data = items.slice(startIndex, endIndex);
  }

  return {
    data: data,
    pagination: {
      page: page,
      pageSize: pageSize,
      totalItems: totalItems,
      totalPages: totalPages,
      hasNextPage: totalPages > 0 && page < totalPages,
      hasPrevPage: totalPages > 0 && page > 1,
    },
  };
}

module.exports = { paginate };
`;

    it("executes passing pagination task when worker writes correct code", async () => {
      const rawManifest = await fs.readJson(manifestPath);
      const manifest = await validateManifest(rawManifest, manifestDir);
      const paginationTask = manifest.tasks.find((t) => t.id === "pagination-boundary")!;
      assert.ok(paginationTask);

      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-test-worker-pass-"));
      const workerScriptPath = path.join(tempDir, "solve-pagination.js");


      const workerCode = `
const fs = require('fs');
const path = require('path');
const targetWorkspace = process.argv[2];
const targetFile = path.join(targetWorkspace, 'src', 'paginate.js');
fs.writeFileSync(targetFile, ${JSON.stringify(correctPaginateCode)}, 'utf8');
`;
      await fs.writeFile(workerScriptPath, workerCode, "utf8");

      const testOutputDir = path.join(tempDir, "eval-out");

      const workerConfig: WorkerConfig = {
        executable: process.execPath,
        args: [workerScriptPath, "{workspace}"],
        model: "deterministic-pass-worker",
        effort: "high",
        timeoutMs: 15000,
      };

      const result = await executeTaskRun({
        task: paginationTask,
        arm: "candidate",
        repetition: 1,
        workerConfig,
        manifestDir,
        outputDir: testOutputDir,
      });

      assert.equal(result.success, true);
      assert.equal(result.exitOutcomes.workerExitCode, 0);
      assert.equal(result.exitOutcomes.verifierExitCode, 0);
      assert.equal(result.exitOutcomes.timedOut, false);
      assert.equal(result.exitOutcomes.verifierTampered, false);
      assert.equal(result.exitOutcomes.promptTampered, false);
      assert.equal(result.usage, null);
      assert.equal(result.cost, null);

      await fs.remove(tempDir);
    });

    it("rejects a finite-only positive pagination page predicate", async () => {
      const manifest = await validateManifest(await fs.readJson(manifestPath), manifestDir);
      const paginationTask = manifest.tasks.find((entry) => entry.id === "pagination-boundary");
      assert.ok(paginationTask);

      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-test-pagination-fraction-page-"));
      const workerScriptPath = path.join(tempDir, "solve-pagination-finite-page.js");
      const finitePageOnlyCode = correctPaginateCode.replace(
        "Number.isInteger(options.page) && options.page > 0",
        "Number.isFinite(options.page) && options.page > 0",
      );
      const workerCode = `
const fs = require("node:fs");
const path = require("node:path");
fs.writeFileSync(path.join(process.argv[2], "src", "paginate.js"), ${JSON.stringify(finitePageOnlyCode)}, "utf8");
`;
      await fs.writeFile(workerScriptPath, workerCode, "utf8");

      try {
        const result = await executeTaskRun({
          task: paginationTask,
          arm: "candidate",
          repetition: 1,
          workerConfig: {
            executable: process.execPath,
            args: [workerScriptPath, "{workspace}"],
            model: "deterministic-finite-page-regression-worker",
            effort: "high",
            timeoutMs: 15000,
          },
          manifestDir,
          outputDir: path.join(tempDir, "eval-out"),
        });

        assert.equal(result.exitOutcomes.workerExitCode, 0);
        assert.equal(result.exitOutcomes.verifierExitCode, 1);
        assert.equal(result.exitOutcomes.infrastructureError, null);
        assert.equal(result.success, false);
        assert.ok(result.verificationResult);
        assert.equal(result.verificationResult.status, "completed");
        assert.ok(result.verificationResult.failedChecks > 0);
        assert.ok(result.verificationResult.checks.some(
          (check) => check.outcome === "failed" && check.evidence.trim() !== "",
        ));
      } finally {
        await fs.remove(tempDir);
      }
    });

    it("authorization behavior regressions", async (t) => {
      const rawManifest = await fs.readJson(manifestPath);
      const manifest = await validateManifest(rawManifest, manifestDir);
      const authTask = manifest.tasks.find((t) => t.id === "cross-tenant-authz")!;
      assert.ok(authTask);

      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-test-auth-pass-"));
      try {

      // Robust compliant DocumentService implementation
      const compliantAuthCode = `
class AuthorizationError extends Error {
  constructor(message) {
    super(message || "Unauthorized access");
    this.name = "AuthorizationError";
  }
}

class DocumentService {
  #documents;

  constructor() {
    this.#documents = new Map();
  }

  seed(docs) {
    for (const doc of docs) {
      this.#documents.set(doc.id, { ...doc });
    }
  }

  getDocument(user, docId) {
    const doc = this.#documents.get(docId);
    if (!doc) return null;
    if (doc.tenantId !== user.tenantId) {
      throw new AuthorizationError("Cross-tenant document access denied");
    }
    if (doc.restricted && (!user.roles || (!user.roles.includes("editor") && !user.roles.includes("admin")))) {
      throw new AuthorizationError("Restricted document access requires editor or admin role");
    }
    return { ...doc };
  }

  createDocument(user, docData) {
    const existing = this.#documents.get(docData.id);
    if (existing && existing.tenantId !== user.tenantId) {
      throw new AuthorizationError("Document ID belongs to another tenant");
    }
    if (!user.roles || (!user.roles.includes("editor") && !user.roles.includes("admin"))) {
      throw new AuthorizationError("Viewer role cannot create documents");
    }
    const doc = {
      id: docData.id || String(Date.now()),
      tenantId: user.tenantId, // Prevent tenant spoofing
      title: docData.title || "",
      content: docData.content || "",
      restricted: Boolean(docData.restricted),
    };
    this.#documents.set(doc.id, doc);
    return { ...doc };
  }

  updateDocument(user, docId, updates) {
    const doc = this.#documents.get(docId);
    if (!doc) throw new Error("Document not found");
    if (doc.tenantId !== user.tenantId) {
      throw new AuthorizationError("Cross-tenant document update denied");
    }
    if (!user.roles || (!user.roles.includes("editor") && !user.roles.includes("admin"))) {
      throw new AuthorizationError("Viewer role cannot update documents");
    }
    // Prevent modifying tenantId
    const safeUpdates = { ...updates };
    delete safeUpdates.tenantId;
    Object.assign(doc, safeUpdates);
    return { ...doc };
  }

  deleteDocument(user, docId) {
    const doc = this.#documents.get(docId);
    if (!doc) return false;
    if (doc.tenantId !== user.tenantId) {
      throw new AuthorizationError("Cross-tenant document delete denied");
    }
    if (!user.roles || !user.roles.includes("admin")) {
      throw new AuthorizationError("Only admin can delete documents");
    }
    return this.#documents.delete(docId);
  }

  listDocuments(user) {
    const results = [];
    for (const doc of this.#documents.values()) {
      if (
        doc.tenantId === user.tenantId &&
        (!doc.restricted || user.roles?.includes("editor") || user.roles?.includes("admin"))
      ) {
        results.push({ ...doc });
      }
    }
    return results;
  }
}

module.exports = { DocumentService, AuthorizationError };
`;

      const runImplementation = async (source: string, outputDir: string) => {
        const implementationWorkerPath = path.join(tempDir, `${path.basename(outputDir)}.js`);
        const implementationWorker = `
const fs = require("node:fs");
const path = require("node:path");
fs.writeFileSync(path.join(process.argv[2], "src", "service.js"), ${JSON.stringify(source)}, "utf8");
`;
        await fs.writeFile(implementationWorkerPath, implementationWorker, "utf8");
        return executeTaskRun({
          task: authTask,
          arm: "candidate",
          repetition: 1,
          workerConfig: {
            executable: process.execPath,
            args: [implementationWorkerPath, "{workspace}"],
            model: "deterministic-auth-regression-worker",
            effort: "high",
            timeoutMs: 15000,
          },
          manifestDir,
          outputDir,
        });
      };

      await t.test("authorization secure baseline", async () => {
        const result = await runImplementation(
          compliantAuthCode,
          path.join(tempDir, "secure-output"),
        );
        assert.equal(result.success, true);
        assert.equal(result.exitOutcomes.workerExitCode, 0);
        assert.equal(result.exitOutcomes.verifierExitCode, 0);
      });

      const collisionGuard = `    const existing = this.#documents.get(docData.id);
    if (existing && existing.tenantId !== user.tenantId) {
      throw new AuthorizationError("Document ID belongs to another tenant");
    }
`;
      const restrictedListingFilter = `      if (
        doc.tenantId === user.tenantId &&
        (!doc.restricted || user.roles?.includes("editor") || user.roles?.includes("admin"))
      ) {`;

      await t.test("authorization foreign-ID collision rejected", async () => {
        const source = compliantAuthCode.replace(collisionGuard, "");
        const result = await runImplementation(
          source,
          path.join(tempDir, "collision-output"),
        );
        assert.equal(result.exitOutcomes.workerExitCode, 0);
        assert.equal(result.exitOutcomes.verifierExitCode, 1);
        assert.equal(result.exitOutcomes.infrastructureError, null);
        assert.ok(result.verificationResult);
        assert.ok(result.verificationResult.failedChecks > 0);
        assert.ok(result.verificationResult.checks.some(
          (check) => check.outcome === "failed" && check.evidence.trim() !== "",
        ));
      });

      await t.test("authorization viewer listing omits restricted documents", async () => {
        const source = compliantAuthCode.replace(
          restrictedListingFilter,
          "      if (doc.tenantId === user.tenantId) {",
        );
        const result = await runImplementation(
          source,
          path.join(tempDir, "viewer-listing-output"),
        );
        assert.equal(result.exitOutcomes.workerExitCode, 0);
        assert.equal(result.exitOutcomes.verifierExitCode, 1);
        assert.equal(result.exitOutcomes.infrastructureError, null);
        assert.ok(result.verificationResult);
        assert.ok(result.verificationResult.failedChecks > 0);
        assert.ok(result.verificationResult.checks.some(
          (check) => check.outcome === "failed" && check.evidence.trim() !== "",
        ));
      });
      await t.test("authorization editors and admins list restricted documents", async () => {
        const source = compliantAuthCode.replace(
          restrictedListingFilter,
          "      if (doc.tenantId === user.tenantId && !doc.restricted) {",
        );
        const result = await runImplementation(
          source,
          path.join(tempDir, "restricted-listing-filter-output"),
        );
        assert.equal(result.exitOutcomes.workerExitCode, 0);
        assert.equal(result.exitOutcomes.verifierExitCode, 1);
        assert.equal(result.exitOutcomes.infrastructureError, null);
        assert.equal(result.success, false);
        assert.ok(result.verificationResult);
        assert.ok(result.verificationResult.failedChecks > 0);
        assert.ok(result.verificationResult.checks.some(
          (check) => check.outcome === "failed" && check.evidence.trim() !== "",
        ));
      });

      await t.test("authorization rejected foreign-ID creation preserves all document state", async () => {
        const mutatedCollisionGuard = collisionGuard.replace(
          '      throw new AuthorizationError("Document ID belongs to another tenant");',
          '      existing.restricted = true;\n      throw new AuthorizationError("Document ID belongs to another tenant");',
        );
        const source = compliantAuthCode.replace(collisionGuard, mutatedCollisionGuard);
        const result = await runImplementation(
          source,
          path.join(tempDir, "collision-mutation-output"),
        );
        assert.equal(result.exitOutcomes.workerExitCode, 0);
        assert.equal(result.exitOutcomes.verifierExitCode, 1);
        assert.equal(result.exitOutcomes.infrastructureError, null);
        assert.equal(result.success, false);
        assert.ok(result.verificationResult);
        assert.ok(result.verificationResult.failedChecks > 0);
        assert.ok(result.verificationResult.checks.some(
          (check) => check.outcome === "failed" && check.evidence.trim() !== "",
        ));
      });

      } finally {
        await fs.remove(tempDir);
      }
    });
    it("verifies adversarial rejection when worker writes insecure tenant spoofing implementation", async () => {
      const rawManifest = await fs.readJson(manifestPath);
      const manifest = await validateManifest(rawManifest, manifestDir);
      const authTask = manifest.tasks.find((t) => t.id === "cross-tenant-authz")!;
      assert.ok(authTask);

      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-test-insecure-write-"));
      const workerScriptPath = path.join(tempDir, "write-insecure-auth.js");

      // Insecure worker code that explicitly writes a cross-tenant leak / spoofing vulnerability
      const insecureAuthCode = `
class AuthorizationError extends Error {
  constructor(message) {
    super(message || "Unauthorized access");
    this.name = "AuthorizationError";
  }
}

class DocumentService {
  constructor() {
    this.documents = new Map();
  }

  seed(docs) {
    for (const doc of docs) {
      this.documents.set(doc.id, { ...doc });
    }
  }

  getDocument(user, docId) {
    // VULNERABILITY: Returns null instead of throwing on cross-tenant read
    return null;
  }

  createDocument(user, docData) {
    // VULNERABILITY: Accepts caller-supplied tenantId
    const doc = {
      id: docData.id || String(Date.now()),
      tenantId: docData.tenantId || user.tenantId,
      title: docData.title || "",
      content: docData.content || "",
      restricted: false,
    };
    this.documents.set(doc.id, doc);
    return { ...doc };
  }

  updateDocument(user, docId, updates) {
    const doc = this.documents.get(docId);
    if (!doc) throw new Error("Document not found");
    Object.assign(doc, updates);
    return { ...doc };
  }

  deleteDocument(user, docId) {
    return this.documents.delete(docId);
  }

  listDocuments(user) {
    return Array.from(this.documents.values());
  }
}

module.exports = { DocumentService, AuthorizationError };
`;

      const workerCode = `
const fs = require('fs');
const path = require('path');
const targetWorkspace = process.argv[2];
const targetFile = path.join(targetWorkspace, 'src', 'service.js');
fs.writeFileSync(targetFile, ${JSON.stringify(insecureAuthCode)}, 'utf8');
`;
      await fs.writeFile(workerScriptPath, workerCode, "utf8");

      const testOutputDir = path.join(tempDir, "eval-out");

      const workerConfig: WorkerConfig = {
        executable: process.execPath,
        args: [workerScriptPath, "{workspace}"],
        model: "deterministic-insecure-write-worker",
        effort: "low",
        timeoutMs: 15000,
      };

      const result = await executeTaskRun({
        task: authTask,
        arm: "minimal",
        repetition: 1,
        workerConfig,
        manifestDir,
        outputDir: testOutputDir,
      });

      assert.equal(result.exitOutcomes.workerExitCode, 0);
      assert.equal(result.exitOutcomes.verifierExitCode, 1, "Verifier must reject insecure code");
      assert.equal(result.success, false);

      await fs.remove(tempDir);
    });
  });

  describe("Process Isolation, Bounds & Cleanup", () => {
    it("waits for SIGTERM-resistant descendants in the owned process group to die", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-test-process-group-"));
      const pidFile = path.join(tempDir, "process-ids.json");
      const readyFile = path.join(tempDir, "descendant-ready");
      const workerPath = path.join(tempDir, "hang-tree.js");
      const descendantToken = `task-eval-descendant-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const descendantCode = `
process.on('SIGTERM', () => {});
process.title = ${JSON.stringify(descendantToken)};
if (process.send) process.send('ready');
setInterval(() => {}, 500);
setTimeout(() => process.exit(0), 6000);
`;
      const workerCode = `
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const fields = 'pid=,ppid=,pgid=,stat=,lstart=,command=';
const child = spawn(process.execPath, ['-e', ${JSON.stringify(descendantCode)}], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
child.on('message', (message) => {
  if (message !== 'ready') return;
  const before = spawnSync('ps', ['-o', fields, '-p', process.pid + ',' + child.pid], { encoding: 'utf8', timeout: 1000 });
  fs.writeFileSync(process.argv[2], JSON.stringify({
    workerPid: process.pid,
    childPid: child.pid,
    baselineRows: before.stdout,
    baselineStatus: before.status,
    baselineError: before.error ? before.error.message : before.stderr
  }));
  fs.writeFileSync(${JSON.stringify(readyFile)}, 'ready');
});
setInterval(() => {}, 500);
`;
      await fs.writeFile(workerPath, workerCode, "utf8");

      type ProcessRow = {
        pid: number;
        ppid: number;
        pgid: number;
        stat: string;
        started: string;
        command: string;
      };
      type ProcessProbe = {
        status: number | null;
        error: string | null;
        rows: Map<number, ProcessRow>;
      };
      const parseProcessRows = (output: string): Map<number, ProcessRow> => {
        const rows = new Map<number, ProcessRow>();
        for (const line of output.split("\n").filter(Boolean)) {
          const columns = line.trim().split(/\s+/);
          if (columns.length < 10) continue;
          const row: ProcessRow = {
            pid: Number(columns[0]),
            ppid: Number(columns[1]),
            pgid: Number(columns[2]),
            stat: columns[3],
            started: columns.slice(4, 9).join(" "),
            command: columns.slice(9).join(" "),
          };
          rows.set(row.pid, row);
        }
        return rows;
      };
      const inspectProcesses = (pids?: number[]): ProcessProbe => {
        const fields = "pid=,ppid=,pgid=,stat=,lstart=,command=";
        const result = spawnSync(
          "ps",
          pids ? ["-o", fields, "-p", pids.join(",")] : ["-A", "-o", fields],
          { encoding: "utf8", timeout: 1000 },
        );
        return {
          status: result.status,
          error: result.error?.message ?? (result.stderr.trim() || null),
          rows: parseProcessRows(result.stdout),
        };
      };
      const sameProcess = (before: ProcessRow | undefined, after: ProcessRow | undefined) =>
        before !== undefined &&
        after !== undefined &&
        before.started === after.started &&
        before.command === after.command;

      const readiness = new Promise<boolean>((resolve) => {
        const watcher = fs.watch(tempDir);
        let settled = false;
        const finish = (isReady: boolean) => {
          if (settled) return;
          settled = true;
          clearTimeout(readinessTimer);
          try {
            watcher.close();
          } catch {
            // Ignore
          }
          resolve(isReady);
        };
        const checkReady = () => {
          if (fs.existsSync(pidFile) && fs.existsSync(readyFile)) finish(true);
        };
        const readinessTimer = setTimeout(() => finish(false), 200);
        watcher.on("change", checkReady);
        watcher.on("error", () => finish(false));
        checkReady();
      });

      let workerPid: number | undefined;
      let childPid: number | undefined;
      let baseline: ProcessProbe | undefined;
      let childBefore: ProcessRow | undefined;
      try {
        const processPromise = runBoundedProcess({
          executable: process.execPath,
          args: [workerPath, pidFile],
          cwd: tempDir,
          timeoutMs: 250,
        });
        const fixtureReady = await readiness;
        if (fixtureReady) {
          const processIds = JSON.parse(await fs.readFile(pidFile, "utf8")) as {
            workerPid: number;
            childPid: number;
            baselineRows: string;
            baselineStatus: number | null;
            baselineError: string;
          };
          workerPid = processIds.workerPid;
          childPid = processIds.childPid;
          baseline = {
            status: processIds.baselineStatus,
            error: processIds.baselineError || null,
            rows: parseProcessRows(processIds.baselineRows),
          };
          childBefore = baseline.rows.get(childPid);
        }

        const processRes = await processPromise;
        const after =
          workerPid === undefined || childPid === undefined
            ? undefined
            : inspectProcesses([workerPid, childPid]);
        const childAfter = childPid === undefined ? undefined : after?.rows.get(childPid);
        const workerBefore = workerPid === undefined ? undefined : baseline?.rows.get(workerPid);
        const workerAfter = workerPid === undefined ? undefined : after?.rows.get(workerPid);
        let groupProbe = "not-run";
        if (workerPid !== undefined) {
          try {
            process.kill(-workerPid, 0);
            groupProbe = "present";
          } catch (err: unknown) {
            groupProbe = (err as NodeJS.ErrnoException).code ?? String(err);
          }
        }
        const processGroupSnapshot =
          workerPid !== undefined && groupProbe !== "ESRCH"
            ? inspectProcesses()
            : undefined;
        const groupRows =
          workerPid === undefined
            ? []
            : Array.from(processGroupSnapshot?.rows.values() ?? []).filter(
                (row) => row.pgid === workerPid,
              );
        const childStillLive =
          sameProcess(childBefore, childAfter) && !childAfter?.stat.toUpperCase().startsWith("Z");
        const workerStillLive =
          sameProcess(workerBefore, workerAfter) && !workerAfter?.stat.toUpperCase().startsWith("Z");

        assert.ok(
          fixtureReady,
          `Fixture did not report its SIGTERM handler ready before the setup deadline; timedOut=${processRes.timedOut}, durationMs=${processRes.durationMs}, infrastructureError=${processRes.infrastructureError}`,
        );
        assert.ok(baseline && childBefore && workerPid !== undefined && childPid !== undefined);
        assert.equal(processRes.timedOut, true);
        assert.equal(
          processRes.infrastructureError,
          null,
          `Cleanup could not confirm owned process-group exit: probe=${groupProbe}, groupRows=${JSON.stringify(groupRows)}`,
        );
        assert.ok(processRes.durationMs >= 1750, "Timeout result must wait for SIGKILL escalation");
        assert.equal(workerBefore?.pgid, workerPid, "Detached worker PID must be its PGID");
        assert.equal(childBefore.pgid, workerPid, "Ready descendant must join the worker's owned PGID");
        assert.equal(
          childStillLive,
          false,
          `Original descendant remains live: before=${JSON.stringify(childBefore)} after=${JSON.stringify(childAfter)}; groupProbe=${groupProbe}; infrastructureError=${processRes.infrastructureError}`,
        );
        assert.equal(
          workerStillLive,
          false,
          `Original worker remains live: before=${JSON.stringify(workerBefore)} after=${JSON.stringify(workerAfter)}; groupProbe=${groupProbe}; infrastructureError=${processRes.infrastructureError}`,
        );
        if (groupProbe !== "ESRCH" && groupRows.length === 0) {
          assert.ok(
            processRes.infrastructureError,
            `Unverifiable group state must fail closed: probe=${groupProbe}, psError=${processGroupSnapshot?.error}`,
          );
        }
      } finally {
        if (childPid !== undefined && childBefore !== undefined) {
          const current = inspectProcesses([childPid]).rows.get(childPid);
          if (sameProcess(childBefore, current) && !current?.stat.toUpperCase().startsWith("Z")) {
            try {
              process.kill(childPid, "SIGKILL");
            } catch {
              // Only the recorded, still-live fixture process is eligible for cleanup.
            }
          }
        }
        await fs.remove(tempDir);
      }
    });
    it("settles timeout after an owned worker exits while a detached helper holds capture pipes", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-test-detached-pipes-"));
      const pidFile = path.join(tempDir, "helper.pid");
      const workerPath = path.join(tempDir, "detached-pipe-worker.js");
      const workerCode = `
const { spawn } = require('child_process');
const fs = require('fs');
const helper = spawn(
  process.execPath,
  ['-e', 'process.on("SIGTERM", () => process.exit(0)); setInterval(() => {}, 500); setTimeout(() => process.exit(0), 6000)'],
  { detached: true, stdio: 'inherit' }
);
fs.writeFileSync(process.argv[2], String(helper.pid));
setInterval(() => {}, 500);
`;
      await fs.writeFile(workerPath, workerCode, "utf8");
      let helperPid: number | undefined;
      try {
        const processRes = await runBoundedProcess({
          executable: process.execPath,
          args: [workerPath, pidFile],
          cwd: tempDir,
          timeoutMs: 250,
        });

        helperPid = Number(await fs.readFile(pidFile, "utf8"));
        assert.equal(processRes.timedOut, true);
        assert.ok(processRes.durationMs >= 1750);
        assert.ok(
          processRes.durationMs < 4500,
          "Timeout must settle after owned-group cleanup instead of waiting for the detached pipe writer",
        );
        assert.doesNotThrow(() => process.kill(helperPid!, 0), "Detached helper is outside owned-group cleanup");
      } finally {
        if (helperPid !== undefined) {
          try {
            process.kill(helperPid, "SIGKILL");
          } catch {
            // The helper may already have exited.
          }
        }
        await fs.remove(tempDir);
      }
    });

    it("classifies spawn ENOENT as infrastructure error", async () => {
      const processRes = await runBoundedProcess({
        executable: "__nonexistent_executable_binary_12345__",
        args: [],
        cwd: os.tmpdir(),
        timeoutMs: 5000,
      });

      assert.equal(processRes.exitCode, null);
      assert.ok(processRes.infrastructureError);
    });
    it("classifies a missing or worker-replaced verifier as infrastructure failure", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-verifier-integrity-"));
      const taskRoot = path.join(tempDir, "tasks");
      await fs.copy(path.resolve(repoRoot, "benchmarks/tasks"), taskRoot);
      const copiedManifestPath = path.join(taskRoot, "pilot.json");
      const manifest = await validateManifest(await fs.readJson(copiedManifestPath), taskRoot);
      const task = manifest.tasks.find((entry) => entry.id === "pagination-boundary");
      assert.ok(task);
      const verifierPath = task.verifier.args[0];
      const originalVerifier = await fs.readFile(verifierPath);
      const workerPath = path.join(tempDir, "worker.js");
      await fs.writeFile(
        workerPath,
        "require('fs').writeFileSync(process.argv[2], 'process.exit(0)');",
        "utf8",
      );
      const outputDir = path.join(tempDir, "replaced-output");
      const workerConfig: WorkerConfig = {
        executable: process.execPath,
        args: [workerPath, verifierPath],
        model: "verifier-tamper-test",
        effort: "low",
        timeoutMs: 5000,
      };

      const replaced = await executeTaskRun({
        task,
        arm: "minimal",
        repetition: 1,
        workerConfig,
        manifestDir: taskRoot,
        outputDir,
      });
      assert.equal(replaced.success, false);
      assert.equal(replaced.exitOutcomes.verifierTampered, true);
      assert.ok(replaced.exitOutcomes.infrastructureError);
      assert.equal(replaced.exitOutcomes.verifierExitCode, null);

      await fs.writeFile(verifierPath, originalVerifier);
      const missingTask = {
        ...task,
        verifier: { ...task.verifier, scriptHash: task.verifier.scriptHash },
      };
      await fs.remove(verifierPath);
      const missing = await executeTaskRun({
        task: missingTask,
        arm: "current",
        repetition: 1,
        workerConfig: { ...workerConfig, args: ["-e", "process.exit(0)"] },
        manifestDir: taskRoot,
        outputDir: path.join(tempDir, "missing-output"),
      });
      assert.equal(missing.success, false);
      assert.equal(missing.exitOutcomes.verifierTampered, true);
      assert.ok(missing.exitOutcomes.infrastructureError);
      assert.equal(missing.exitOutcomes.workerExitCode, null);
      await fs.remove(tempDir);
    });

    it("detects prompt file evidence tampering fail-closed", async () => {
      const rawManifest = await fs.readJson(manifestPath);
      const manifest = await validateManifest(rawManifest, manifestDir);
      const paginationTask = manifest.tasks.find((t) => t.id === "pagination-boundary")!;

      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-test-prompt-tamper-"));
      const workerScriptPath = path.join(tempDir, "tamper-prompt.js");

      // Worker malicious script overwrites the prompt file
      const workerCode = `
const fs = require('fs');
const promptFile = process.argv[2];
fs.writeFileSync(promptFile, 'Malicious prompt content overwrite', 'utf8');
`;
      await fs.writeFile(workerScriptPath, workerCode, "utf8");

      const testOutputDir = path.join(tempDir, "eval-out");

      const workerConfig: WorkerConfig = {
        executable: process.execPath,
        args: [workerScriptPath, "{promptFile}"],
        model: "prompt-tamperer",
        effort: "low",
        timeoutMs: 10000,
      };

      const result = await executeTaskRun({
        task: paginationTask,
        arm: "minimal",
        repetition: 1,
        workerConfig,
        manifestDir,
        outputDir: testOutputDir,
      });

      assert.equal(result.exitOutcomes.promptTampered, true);
      assert.equal(result.success, false);

      await fs.remove(tempDir);
    });

    it("guarantees temporary workspace teardown even on worker failure", async () => {
      const rawManifest = await fs.readJson(manifestPath);
      const manifest = await validateManifest(rawManifest, manifestDir);
      const paginationTask = manifest.tasks.find((t) => t.id === "pagination-boundary")!;

      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-test-teardown-"));
      const workerScriptPath = path.join(tempDir, "failing-worker.js");

      await fs.writeFile(workerScriptPath, "process.stdout.write(process.cwd()); process.exit(2);", "utf8");

      const testOutputDir = path.join(tempDir, "eval-out");

      const workerConfig: WorkerConfig = {
        executable: process.execPath,
        args: [workerScriptPath, "{workspace}"],
        model: "failing-worker",
        effort: "low",
        timeoutMs: 5000,
      };

      const result = await executeTaskRun({
        task: paginationTask,
        arm: "minimal",
        repetition: 1,
        workerConfig,
        manifestDir,
        outputDir: testOutputDir,
      });

      assert.equal(result.exitOutcomes.workerExitCode, 2);
      assert.equal(result.success, false);

      const workspacePath = (await fs.readFile(
        path.join(testOutputDir, result.evidencePaths.workerStdout),
        "utf8",
      )).trim();
      assert.notEqual(workspacePath, "");
      assert.equal(await fs.pathExists(workspacePath), false, "Owned temporary workspace must be removed");

      await fs.remove(tempDir);
    });
  });

  describe("Suite fixture snapshots and infrastructure aggregation", () => {
    async function createSuiteFixture(
      rootDir: string,
      taskId = "snapshot-task",
      receiptMode: "valid" | "missing" | "malformed" | "duplicate" | "incomplete" | "mismatched-counts" = "valid",
    ) {
      const fixtureDir = path.join(rootDir, "fixtures", "task");
      const guidanceDir = path.join(rootDir, "guidance");
      const verifierPath = path.join(rootDir, "verifiers", "verify-starting-file.js");
      const manifestPath = path.join(rootDir, "manifest.json");
      await fs.mkdirp(fixtureDir);
      await fs.mkdirp(guidanceDir);
      await fs.mkdirp(path.dirname(verifierPath));
      await fs.writeFile(path.join(fixtureDir, "starting.txt"), "starting-fixture\n");
      await fs.writeFile(
        verifierPath,
        `const fs = require("node:fs");
const path = require("node:path");
const workspace = process.argv[2];
const passed = fs.readFileSync(path.join(workspace, "starting.txt"), "utf8") === "starting-fixture\\n";
const receiptMode = ${JSON.stringify(receiptMode)};
const validCheck = { id: "starting-fixture-preserved", outcome: "passed", evidence: "Starting fixture was preserved." };
const receipts = {
  valid: { schemaVersion: 1, status: "completed", totalChecks: 1, passedChecks: 1, failedChecks: 0, checks: [validCheck] },
  missing: null,
  malformed: {},
  duplicate: { schemaVersion: 1, status: "completed", totalChecks: 2, passedChecks: 2, failedChecks: 0, checks: [validCheck, validCheck] },
  incomplete: { schemaVersion: 1, status: "completed", totalChecks: 1, passedChecks: 1, failedChecks: 0, checks: [{ id: "starting-fixture-preserved", outcome: "passed" }] },
  "mismatched-counts": { schemaVersion: 1, status: "completed", totalChecks: 2, passedChecks: 1, failedChecks: 0, checks: [validCheck] },
};
const receipt = receipts[receiptMode];
if (receipt !== null) {
  fs.writeFileSync(process.env.TASK_EVAL_VERIFICATION_RESULT_PATH, JSON.stringify(receipt), { flag: "wx" });
}
if (!passed) process.exitCode = 1;
`,
      );
      const guidance: Record<string, string> = {};
      for (const arm of ["minimal", "current", "candidate"]) {
        const relativePath = `guidance/${arm}.md`;
        await fs.writeFile(path.join(rootDir, relativePath), `guidance:${arm}\n`);
        guidance[arm] = relativePath;
      }
      await fs.writeJson(manifestPath, {
        schemaVersion: 1,
        tasks: [
          {
            id: taskId,
            split: "calibration",
            fixtureDir: "fixtures/task",
            prompt: "Preserve the starting fixture file.",
            guidance,
            verifier: {
              executable: process.execPath,
              args: ["verifiers/verify-starting-file.js", "{workspace}"],
              timeoutMs: 5000,
            },
          },
        ],
      });
      return {
        fixtureDir,
        manifestPath,
        verifierPath,
        currentGuidancePath: path.join(guidanceDir, "current.md"),
      };
    }

    it("rejects missing, malformed, duplicate, and incomplete verifier receipts", async (t) => {
      const invalidModes = [
        "missing",
        "malformed",
        "duplicate",
        "incomplete",
        "mismatched-counts",
      ] as const;
      for (const mode of invalidModes) {
        await t.test(`verifier receipt ${mode} is infrastructure failure`, async () => {
          const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `task-receipt-${mode}-`));
          const suite = await createSuiteFixture(tempDir, "receipt-contract", mode);
          const manifestDir = path.dirname(suite.manifestPath);

          try {
            const manifest = await validateManifest(
              await fs.readJson(suite.manifestPath),
              manifestDir,
            );
            const task = manifest.tasks[0];
            assert.ok(task);
            const result = await executeTaskRun({
              task,
              arm: "candidate",
              repetition: 1,
              workerConfig: {
                executable: process.execPath,
                args: ["-e", "process.exit(0)"],
                model: "invalid-verifier-receipt-test",
                effort: "low",
                timeoutMs: 5000,
              },
              manifestDir,
              outputDir: path.join(tempDir, "output"),
            });

            assert.equal(result.exitOutcomes.workerExitCode, 0);
            assert.equal(result.exitOutcomes.verifierExitCode, 0);
            assert.equal(result.success, false);
            assert.ok(result.exitOutcomes.infrastructureError);
            assert.equal(result.verificationResult, null);
          } finally {
            await fs.remove(tempDir);
          }
        });
      }
    });

    it("preserves valid __proto__ task IDs in aggregation and persisted JSON", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-suite-proto-id-"));
      const suite = await createSuiteFixture(tempDir, "__proto__");
      const workerConfigPath = path.join(tempDir, "worker.json");
      const outputDir = path.join(tempDir, "results");
      await fs.writeJson(workerConfigPath, {
        executable: process.execPath,
        args: ["-e", "process.exit(0)"],
        model: "proto-task-id-regression",
        effort: "low",
        timeoutMs: 5000,
      });

      try {
        const summary = await runTaskSuite({
          manifestPath: suite.manifestPath,
          workerConfigPath,
          outputDir,
          repeat: 1,
          split: "calibration",
        });
        const persisted = await fs.readJson(path.join(outputDir, "results.json"));

        assert.equal(Object.hasOwn(summary.byTask, "__proto__"), true);
        assert.equal(summary.byTask["__proto__"].total, 3);
        assert.equal(Object.hasOwn(persisted.byTask, "__proto__"), true);
        assert.equal(persisted.byTask["__proto__"].total, 3);
        assert.equal(summary.runs.length, 3);
      } finally {
        await fs.remove(tempDir);
      }
    });

    function snapshotPrefix(outputDir: string): string {
      return `task-eval-fixture-snapshots-${path.basename(outputDir)}-`;
    }

    async function assertNoStagedSnapshots(outputDir: string): Promise<void> {
      const leftovers = (await fs.readdir(os.tmpdir())).filter((entry) =>
        entry.startsWith(snapshotPrefix(outputDir)),
      );
      assert.deepEqual(leftovers, [], "Staged fixture snapshots must be removed after suite exit");
    }

    it("uses one staged fixture when a worker mutates the live source between arms", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-suite-snapshot-invariant-"));
      const suite = await createSuiteFixture(tempDir);
      const observedPath = path.join(tempDir, "observed-starting-files.txt");
      const workerConfigPath = path.join(tempDir, "worker.json");
      const outputDir = path.join(tempDir, `snapshot-output-${path.basename(tempDir)}`);
      const workerCode = `
const fs = require("node:fs");
const path = require("node:path");
const sourceMarker = process.argv[1];
const workspace = process.argv[2];
const observations = process.argv[3];
const startingFile = path.join(workspace, "starting.txt");
fs.appendFileSync(observations, fs.readFileSync(startingFile, "utf8"));
fs.writeFileSync(sourceMarker, "mutated-by-worker\\n");
`;
      await fs.writeJson(workerConfigPath, {
        executable: process.execPath,
        args: ["-e", workerCode, path.join(suite.fixtureDir, "starting.txt"), "{workspace}", observedPath],
        model: "snapshot-mutation-test",
        effort: "low",
        timeoutMs: 5000,
      });

      try {
        const summary = await runTaskSuite({
          manifestPath: suite.manifestPath,
          workerConfigPath,
          outputDir,
          repeat: 1,
          split: "calibration",
        });

        assert.equal(
          await fs.readFile(path.join(suite.fixtureDir, "starting.txt"), "utf8"),
          "mutated-by-worker\n",
          "The real worker must mutate the live fixture source",
        );
        assert.deepEqual(
          (await fs.readFile(observedPath, "utf8")).trimEnd().split("\n"),
          Array(3).fill("starting-fixture"),
          "Every arm must receive the same staged starting file",
        );
        assert.equal(new Set(summary.runs.map((run) => run.fixtureHash)).size, 1);
        assert.ok(summary.runs.every((run) => run.success));
        assert.ok(
          summary.runs.every((run) => run.exitOutcomes.infrastructureError === null),
          "The suite must either preserve the invariant or fail closed",
        );
        await assertNoStagedSnapshots(outputDir);
      } finally {
        await fs.remove(tempDir);
      }
    });

    it("removes staged fixtures when a later arm setup throws", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-suite-snapshot-cleanup-"));
      const suite = await createSuiteFixture(tempDir);
      const workerConfigPath = path.join(tempDir, "worker.json");
      const outputDir = path.join(tempDir, `cleanup-output-${path.basename(tempDir)}`);
      const workerCode = `require("node:fs").unlinkSync(process.argv[1]);`;
      await fs.writeJson(workerConfigPath, {
        executable: process.execPath,
        args: ["-e", workerCode, suite.currentGuidancePath],
        model: "snapshot-cleanup-test",
        effort: "low",
        timeoutMs: 5000,
      });

      try {
        await assert.rejects(
          () =>
            runTaskSuite({
              manifestPath: suite.manifestPath,
              workerConfigPath,
              outputDir,
              repeat: 1,
              split: "calibration",
            }),
          /ENOENT|no such file/i,
        );
        await assertNoStagedSnapshots(outputDir);
      } finally {
        await fs.remove(tempDir);
      }
    });

    it("classifies tampered or unreadable prompt evidence as infrastructure in suite aggregation", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-suite-prompt-evidence-"));
      const suite = await createSuiteFixture(tempDir);

      try {
        for (const mode of ["rewrite", "delete"] as const) {
          const workerConfigPath = path.join(tempDir, `worker-${mode}.json`);
          const outputDir = path.join(
            tempDir,
            `prompt-${mode}-${path.basename(tempDir)}`,
          );
          const workerCode = `
const fs = require("node:fs");
const promptFile = process.argv[1];
const mode = process.argv[2];
if (fs.readFileSync(promptFile, "utf8").includes("guidance:candidate")) {
  if (mode === "delete") fs.unlinkSync(promptFile);
  else fs.writeFileSync(promptFile, "tampered prompt evidence");
}
`;
          await fs.writeJson(workerConfigPath, {
            executable: process.execPath,
            args: ["-e", workerCode, "{promptFile}", mode],
            model: "prompt-evidence-test",
            effort: "low",
            timeoutMs: 5000,
          });

          const summary = await runTaskSuite({
            manifestPath: suite.manifestPath,
            workerConfigPath,
            outputDir,
            repeat: 1,
            split: "calibration",
          });
          const candidate = summary.runs[2];

          assert.equal(candidate.exitOutcomes.promptTampered, true);
          assert.ok(candidate.exitOutcomes.infrastructureError);
          assert.equal(candidate.success, false);
          assert.equal(summary.evaluatedRuns, 2);
          assert.equal(summary.infrastructureErrorRuns, 1);
          assert.equal(summary.failedRuns, 0);
          assert.equal(summary.overallPassRate, 100);
          assert.equal(summary.byArm.candidate.evaluated, 0);
          assert.equal(summary.byArm.candidate.infrastructureErrors, 1);
          assert.equal(summary.byArm.candidate.passRate, null);
          await assertNoStagedSnapshots(outputDir);
        }
      } finally {
        await fs.remove(tempDir);
      }
    });

    it("counts timeout independently when the timed-out run also tampers with the verifier", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-suite-timeout-integrity-"));
      const suite = await createSuiteFixture(tempDir);
      const workerConfigPath = path.join(tempDir, "worker.json");
      const outputDir = path.join(tempDir, `timeout-integrity-${path.basename(tempDir)}`);
      const workerCode = `
const fs = require("node:fs");
const verifier = process.argv[1];
const prompt = fs.readFileSync(process.argv[2], "utf8");
if (prompt.includes("guidance:candidate")) {
  fs.writeFileSync(verifier, "process.exit(1);\\\\n");
  setInterval(() => {}, 1000);
}
`;
      await fs.writeJson(workerConfigPath, {
        executable: process.execPath,
        args: ["-e", workerCode, suite.verifierPath, "{promptFile}"],
        model: "timeout-integrity-test",
        effort: "low",
        timeoutMs: 250,
      });

      try {
        const cli = spawnSync(
          process.execPath,
          [
            "--import",
            "tsx",
            path.resolve(repoRoot, "scripts/evals/task-index.ts"),
            "--manifest",
            suite.manifestPath,
            "--worker",
            workerConfigPath,
            "--output",
            outputDir,
            "--repeat",
            "1",
            "--split",
            "calibration",
          ],
          { cwd: repoRoot, encoding: "utf8" },
        );
        assert.equal(cli.error, undefined, cli.error?.message);
        assert.equal(cli.status, 1);
        assert.match(cli.stdout, /Timed Out:\s+1/);
        assert.match(cli.stdout, /candidate\s+: Runs 1 \| Evaluated 0 \| Pass 0\/0 \(N\/A\).*Timed Out 1/);

        const summary = await fs.readJson(path.join(outputDir, "results.json"));
        assert.equal(summary.evaluatedRuns, 2);
        assert.equal(summary.infrastructureErrorRuns, 1);
        assert.equal(summary.failedRuns, 0);
        assert.equal(summary.timedOutRuns, 1);
        assert.equal(summary.overallPassRate, 100);
        assert.equal(summary.byArm.candidate.infrastructureErrors, 1);
        assert.equal(summary.byArm.candidate.evaluated, 0);
        assert.equal(summary.byArm.candidate.timedOut, 1);
        assert.equal(summary.byTask["snapshot-task"].infrastructureErrors, 1);
        assert.equal(summary.byTask["snapshot-task"].timedOut, 1);
        assert.equal(summary.runs[2].exitOutcomes.timedOut, true);
        assert.equal(summary.runs[2].exitOutcomes.verifierTampered, true);
        assert.ok(summary.runs[2].exitOutcomes.infrastructureError);
        assert.equal(summary.runs[2].success, false);
        await assertNoStagedSnapshots(outputDir);
      } finally {
        await fs.remove(tempDir);
      }
    });

    it("excludes verifier infrastructure failures from efficacy and exits nonzero", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-suite-infrastructure-"));
      const suite = await createSuiteFixture(tempDir);
      const workerConfigPath = path.join(tempDir, "worker.json");
      const outputDir = path.join(tempDir, `cli-results-${path.basename(tempDir)}`);
      const workerCode = `
const fs = require("node:fs");
const verifier = process.argv[1];
const prompt = fs.readFileSync(process.argv[2], "utf8");
if (prompt.includes("guidance:candidate")) {
  fs.writeFileSync(verifier, "process.exit(1);\\n");
}
`;
      await fs.writeJson(workerConfigPath, {
        executable: process.execPath,
        args: ["-e", workerCode, suite.verifierPath, "{promptFile}"],
        model: "verifier-infrastructure-test",
        effort: "low",
        timeoutMs: 5000,
      });

      try {
        const cli = spawnSync(
          process.execPath,
          [
            "--import",
            "tsx",
            path.resolve(repoRoot, "scripts/evals/task-index.ts"),
            "--manifest",
            suite.manifestPath,
            "--worker",
            workerConfigPath,
            "--output",
            outputDir,
            "--repeat",
            "1",
            "--split",
            "calibration",
          ],
          { cwd: repoRoot, encoding: "utf8", timeout: 15000 },
        );
        assert.equal(cli.error, undefined, cli.error?.message);
        assert.equal(cli.status, 1, `CLI must fail on infrastructure errors:\n${cli.stdout}\n${cli.stderr}`);

        const summary = await fs.readJson(path.join(outputDir, "results.json"));
        assert.equal(summary.totalRuns, 3);
        assert.equal(summary.evaluatedRuns, 2);
        assert.equal(summary.infrastructureErrorRuns, 1);
        assert.equal(summary.successfulRuns, 2);
        assert.equal(summary.failedRuns, 0);
        assert.equal(summary.overallPassRate, 100);
        assert.equal(summary.byArm.minimal.passRate, 100);
        assert.equal(summary.byArm.current.passRate, 100);
        assert.equal(summary.byArm.candidate.total, 1);
        assert.equal(summary.byArm.candidate.evaluated, 0);
        assert.equal(summary.byArm.candidate.infrastructureErrors, 1);
        assert.equal(summary.byArm.candidate.passRate, null);
        assert.equal(summary.byTask["snapshot-task"].evaluated, 2);
        assert.equal(summary.byTask["snapshot-task"].infrastructureErrors, 1);
        assert.equal(summary.byTask["snapshot-task"].passRate, 100);
        assert.ok(summary.runs[2].exitOutcomes.infrastructureError);
        assert.equal(summary.runs[2].success, false);
        await assertNoStagedSnapshots(outputDir);

        const missingWorkerConfigPath = path.join(tempDir, "missing-worker.json");
        const noEvidenceOutputDir = path.join(tempDir, `no-evidence-${path.basename(tempDir)}`);
        await fs.writeJson(missingWorkerConfigPath, {
          executable: "__task-eval-missing-worker__",
          args: [],
          model: "missing-worker-test",
          effort: "low",
          timeoutMs: 5000,
        });
        const noEvidenceCli = spawnSync(
          process.execPath,
          [
            "--import",
            "tsx",
            path.resolve(repoRoot, "scripts/evals/task-index.ts"),
            "--manifest",
            suite.manifestPath,
            "--worker",
            missingWorkerConfigPath,
            "--output",
            noEvidenceOutputDir,
            "--repeat",
            "1",
            "--split",
            "calibration",
          ],
          { cwd: repoRoot, encoding: "utf8", timeout: 15000 },
        );
        assert.equal(noEvidenceCli.error, undefined, noEvidenceCli.error?.message);
        assert.equal(noEvidenceCli.status, 1);
        assert.match(noEvidenceCli.stdout, /Evaluated Product Runs:\s+0/);
        assert.match(noEvidenceCli.stdout, /Infrastructure Errors:\s+3/);
        assert.match(noEvidenceCli.stdout, /Overall Pass Rate:\s+N\/A \(no evaluated runs\)/);
        assert.match(
          noEvidenceCli.stdout,
          /candidate\s+: Runs 1 \| Evaluated 0 \| Pass 0\/0 \(N\/A\)/,
        );
        const noEvidence = await fs.readJson(path.join(noEvidenceOutputDir, "results.json"));
        assert.equal(noEvidence.evaluatedRuns, 0);
        assert.equal(noEvidence.infrastructureErrorRuns, 3);
        assert.equal(noEvidence.failedRuns, 0);
        assert.equal(noEvidence.overallPassRate, null);
        assert.ok(
          Object.values(noEvidence.byArm).every(
            (arm) =>
              arm.evaluated === 0 &&
              arm.infrastructureErrors === 1 &&
              arm.passRate === null &&
              arm.avgWallMs === null,
          ),
        );
        assert.equal(noEvidence.byTask["snapshot-task"].evaluated, 0);
        assert.equal(noEvidence.byTask["snapshot-task"].infrastructureErrors, 3);
        assert.equal(noEvidence.byTask["snapshot-task"].passRate, null);
        await assertNoStagedSnapshots(noEvidenceOutputDir);
      } finally {
        await fs.remove(tempDir);
      }
    });
  });

  describe("Credential-safe persisted output", () => {
    it("omits raw argv and redacts recognized credential values across report and evidence files", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-suite-secrets-"));
      const sentinel = "SECRET_SENTINEL_TOKEN_XYZ_99999";
      const workerConfigFile = path.join(tempDir, "worker.json");
      await fs.writeJson(workerConfigFile, {
        executable: process.execPath,
        args: [
          "-e",
          "process.stdout.write(process.argv.join(' '))",
          "{workspace}",
          "--credential",
          sentinel,
        ],
        model: "secret-model",
        effort: "low",
        timeoutMs: 5000,
      });
      const suiteOutputDir = path.join(tempDir, "results");
      await runTaskSuite({
        manifestPath,
        workerConfigPath: workerConfigFile,
        outputDir: suiteOutputDir,
        repeat: 1,
        split: "calibration",
      });

      async function readAllFiles(directory: string): Promise<string[]> {
        const contents: string[] = [];
        for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
          const entryPath = path.join(directory, entry.name);
          if (entry.isDirectory()) contents.push(...(await readAllFiles(entryPath)));
          else contents.push(await fs.readFile(entryPath, "utf8"));
        }
        return contents;
      }

      async function assertPrivateTree(directory: string): Promise<void> {
        const directoryStat = await fs.stat(directory);
        assert.equal(
          directoryStat.mode & 0o077,
          0,
          `Directory is accessible to group or other users: ${directory}`,
        );
        for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
          const entryPath = path.join(directory, entry.name);
          const stat = await fs.stat(entryPath);
          assert.equal(
            stat.mode & 0o077,
            0,
            `Evidence artifact is accessible to group or other users: ${entryPath}`,
          );
          if (entry.isDirectory()) await assertPrivateTree(entryPath);
        }
      }

      await assertPrivateTree(suiteOutputDir);
      const persisted = (await readAllFiles(suiteOutputDir)).join("\n");
      assert.equal(persisted.includes(sentinel), false);
      assert.equal(persisted.includes('"args"'), false, "Raw argv must not be stored in results");
      await fs.remove(tempDir);
    });
  });
});
