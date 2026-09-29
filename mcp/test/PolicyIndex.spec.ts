import fs from "fs-extra";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadPolicyView } from "../src/services/PolicyIndex";

describe("PolicyIndex", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ags-mcp-policy-"));
  });

  afterEach(async () => {
    if (tmpDir && (await fs.pathExists(tmpDir))) {
      await fs.remove(tmpDir);
    }
  });

  it("handles missing policy file gracefully", () => {
    const view = loadPolicyView(tmpDir);
    expect(view.loaded).toBe(false);
    expect(view.problem).toBeNull();
    expect(view.pathRules("src/index.ts")).toEqual([]);
    expect(view.requiredChecks(["src/index.ts"])).toEqual([]);
  });

  it("loads a valid policy file and matches protected paths and required checks", async () => {
    const agsDir = path.join(tmpDir, ".ags");
    await fs.mkdirp(agsDir);
    const policy = {
      schema_version: 1,
      rules: [
        {
          id: "no-generated-edits",
          kind: "protected_path",
          paths: ["internal/gen/**"],
          action: "block",
          reason: "Generated code; edit the .proto instead",
          source: { origin: "declared" },
        },
        {
          id: "use-pnpm",
          kind: "command",
          executables: ["npm"],
          action: "rewrite",
          rewrite_to: "pnpm",
          reason: "Repo uses pnpm",
          source: {
            origin: "compiled",
            file: "AGENTS.md",
            line: 12,
            text: "Use pnpm instead of npm.",
            digest: "abcdef123456",
          },
        },
        {
          id: "cli-tests",
          kind: "required_check",
          when_changed: ["cli/src/**"],
          checks: ["pnpm --filter ./cli test"],
          action: "warn",
          reason: "CLI changes need tests",
          source: { origin: "declared" },
        },
      ],
    };
    await fs.writeJson(path.join(agsDir, "policy.json"), policy);

    const view = loadPolicyView(tmpDir);
    expect(view.loaded).toBe(true);
    expect(view.problem).toBeNull();

    // Matching protected_path
    const matches = view.pathRules("internal/gen/foo.ts");
    expect(matches).toEqual([
      {
        id: "no-generated-edits",
        action: "block",
        reason: "Generated code; edit the .proto instead",
      },
    ]);

    // Non-matching path
    expect(view.pathRules("src/foo.ts")).toEqual([]);

    // Matching required_check
    const checks = view.requiredChecks(["cli/src/services/policy.ts"]);
    expect(checks).toEqual([
      {
        id: "cli-tests",
        action: "warn",
        checks: ["pnpm --filter ./cli test"],
        reason: "CLI changes need tests",
      },
    ]);

    // Non-matching required_check
    expect(view.requiredChecks(["docs/readme.md"])).toEqual([]);
  });

  it("defaults action to warn when action is omitted", async () => {
    const agsDir = path.join(tmpDir, ".ags");
    await fs.mkdirp(agsDir);
    const policy = {
      schema_version: 1,
      rules: [
        {
          id: "protect-docs",
          kind: "protected_path",
          paths: ["docs/**"],
          reason: "Docs are managed",
          source: { origin: "declared" },
        },
      ],
    };
    await fs.writeJson(path.join(agsDir, "policy.json"), policy);

    const view = loadPolicyView(tmpDir);
    expect(view.loaded).toBe(true);
    expect(view.pathRules("docs/intro.md")).toEqual([
      {
        id: "protect-docs",
        action: "warn",
        reason: "Docs are managed",
      },
    ]);
  });

  describe("glob matching semantics", () => {
    it("matches basename patterns without slash in any directory", async () => {
      const agsDir = path.join(tmpDir, ".ags");
      await fs.mkdirp(agsDir);
      await fs.writeJson(path.join(agsDir, "policy.json"), {
        schema_version: 1,
        rules: [
          {
            id: "protect-env",
            kind: "protected_path",
            paths: [".env*"],
            action: "block",
            reason: "Secrets",
            source: { origin: "declared" },
          },
        ],
      });

      const view = loadPolicyView(tmpDir);
      expect(view.loaded).toBe(true);
      expect(view.pathRules(".env").length).toBe(1);
      expect(view.pathRules(".env.local").length).toBe(1);
      expect(view.pathRules("nested/.env").length).toBe(1);
      expect(view.pathRules("a/b/c/.env.secret").length).toBe(1);
      expect(view.pathRules("a/b/c/other.txt").length).toBe(0);
    });

    it("evaluates single-segment wildcard vs deep wildcard accurately", async () => {
      const agsDir = path.join(tmpDir, ".ags");
      await fs.mkdirp(agsDir);
      await fs.writeJson(path.join(agsDir, "policy.json"), {
        schema_version: 1,
        rules: [
          {
            id: "src-shallow",
            kind: "protected_path",
            paths: ["src/*.ts"],
            action: "warn",
            reason: "Shallow",
            source: { origin: "declared" },
          },
          {
            id: "src-deep",
            kind: "protected_path",
            paths: ["deep/**/*.ts"],
            action: "block",
            reason: "Deep",
            source: { origin: "declared" },
          },
        ],
      });

      const view = loadPolicyView(tmpDir);
      expect(view.loaded).toBe(true);

      // Single segment * does not match across /
      expect(view.pathRules("src/foo.ts").map((r) => r.id)).toEqual([
        "src-shallow",
      ]);
      expect(view.pathRules("src/nested/foo.ts")).toEqual([]);

      // Deep ** matches single and nested
      expect(view.pathRules("deep/foo.ts").map((r) => r.id)).toEqual([
        "src-deep",
      ]);
      expect(view.pathRules("deep/a/b/foo.ts").map((r) => r.id)).toEqual([
        "src-deep",
      ]);
    });

    it("normalizes leading ./ and Windows backslashes", async () => {
      const agsDir = path.join(tmpDir, ".ags");
      await fs.mkdirp(agsDir);
      await fs.writeJson(path.join(agsDir, "policy.json"), {
        schema_version: 1,
        rules: [
          {
            id: "norm-rule",
            kind: "protected_path",
            paths: ["./src/app/**"],
            action: "warn",
            reason: "Normalized",
            source: { origin: "declared" },
          },
        ],
      });

      const view = loadPolicyView(tmpDir);
      expect(view.loaded).toBe(true);
      expect(view.pathRules("src/app/main.ts").length).toBe(1);
      expect(view.pathRules("./src/app/main.ts").length).toBe(1);
      expect(view.pathRules("src\\app\\main.ts").length).toBe(1);
    });

    it("handles single-character ? and case-sensitivity", async () => {
      const agsDir = path.join(tmpDir, ".ags");
      await fs.mkdirp(agsDir);
      await fs.writeJson(path.join(agsDir, "policy.json"), {
        schema_version: 1,
        rules: [
          {
            id: "char-match",
            kind: "protected_path",
            paths: ["test/file.?"],
            action: "warn",
            reason: "Single char",
            source: { origin: "declared" },
          },
        ],
      });

      const view = loadPolicyView(tmpDir);
      expect(view.loaded).toBe(true);
      expect(view.pathRules("test/file.c").length).toBe(1);
      expect(view.pathRules("test/file.ts").length).toBe(0);
      expect(view.pathRules("Test/file.c").length).toBe(0);
    });

    it("handles ** alone matching everything", async () => {
      const agsDir = path.join(tmpDir, ".ags");
      await fs.mkdirp(agsDir);
      await fs.writeJson(path.join(agsDir, "policy.json"), {
        schema_version: 1,
        rules: [
          {
            id: "catch-all",
            kind: "protected_path",
            paths: ["**"],
            action: "warn",
            reason: "Everything",
            source: { origin: "declared" },
          },
        ],
      });

      const view = loadPolicyView(tmpDir);
      expect(view.loaded).toBe(true);
      expect(view.pathRules("any.txt").length).toBe(1);
      expect(view.pathRules("deep/nested/path/file.go").length).toBe(1);
    });
  });

  describe("invalid policy files and conflict handling", () => {
    it("reports problem when JSON is invalid", async () => {
      const agsDir = path.join(tmpDir, ".ags");
      await fs.mkdirp(agsDir);
      await fs.writeFile(path.join(agsDir, "policy.json"), "{ invalid-json ");

      const view = loadPolicyView(tmpDir);
      expect(view.loaded).toBe(false);
      expect(view.problem).toMatch(/JSON|syntax/i);
      expect(view.pathRules("any.ts")).toEqual([]);
    });

    it("reports problem when schema_version is unsupported", async () => {
      const agsDir = path.join(tmpDir, ".ags");
      await fs.mkdirp(agsDir);
      await fs.writeJson(path.join(agsDir, "policy.json"), {
        schema_version: 2,
        rules: [],
      });

      const view = loadPolicyView(tmpDir);
      expect(view.loaded).toBe(false);
      expect(view.problem).toBeTruthy();
    });

    it("reports problem when foreign fields are present on a rule", async () => {
      const agsDir = path.join(tmpDir, ".ags");
      await fs.mkdirp(agsDir);
      await fs.writeJson(path.join(agsDir, "policy.json"), {
        schema_version: 1,
        rules: [
          {
            id: "bad-cmd",
            kind: "command",
            executables: ["npm"],
            paths: ["not-allowed-here/**"],
            action: "warn",
            reason: "Illegal foreign field",
            source: { origin: "declared" },
          },
        ],
      });

      const view = loadPolicyView(tmpDir);
      expect(view.loaded).toBe(false);
      expect(view.problem).toBeTruthy();
    });

    it("reports problem when rewrite action lacks rewrite_to", async () => {
      const agsDir = path.join(tmpDir, ".ags");
      await fs.mkdirp(agsDir);
      await fs.writeJson(path.join(agsDir, "policy.json"), {
        schema_version: 1,
        rules: [
          {
            id: "rewrite-no-to",
            kind: "command",
            executables: ["npm"],
            action: "rewrite",
            reason: "Missing rewrite_to",
            source: { origin: "declared" },
          },
        ],
      });

      const view = loadPolicyView(tmpDir);
      expect(view.loaded).toBe(false);
      expect(view.problem).toBeTruthy();
    });

    it("reports problem when compiled rule has block action", async () => {
      const agsDir = path.join(tmpDir, ".ags");
      await fs.mkdirp(agsDir);
      await fs.writeJson(path.join(agsDir, "policy.json"), {
        schema_version: 1,
        rules: [
          {
            id: "compiled-block",
            kind: "protected_path",
            paths: ["src/**"],
            action: "block",
            reason: "Compiled cannot block",
            source: { origin: "compiled" },
          },
        ],
      });

      const view = loadPolicyView(tmpDir);
      expect(view.loaded).toBe(false);
      expect(view.problem).toMatch(/compiled.*block/i);
    });

    it("reports problem when rule IDs are duplicated", async () => {
      const agsDir = path.join(tmpDir, ".ags");
      await fs.mkdirp(agsDir);
      await fs.writeJson(path.join(agsDir, "policy.json"), {
        schema_version: 1,
        rules: [
          {
            id: "dup-id",
            kind: "protected_path",
            paths: ["src/**"],
            action: "warn",
            reason: "First",
            source: { origin: "declared" },
          },
          {
            id: "dup-id",
            kind: "protected_path",
            paths: ["lib/**"],
            action: "warn",
            reason: "Second",
            source: { origin: "declared" },
          },
        ],
      });

      const view = loadPolicyView(tmpDir);
      expect(view.loaded).toBe(false);
      expect(view.problem).toMatch(/duplicate.*id/i);
    });

    it("reports conflict when same protected_path pattern has different actions", async () => {
      const agsDir = path.join(tmpDir, ".ags");
      await fs.mkdirp(agsDir);
      await fs.writeJson(path.join(agsDir, "policy.json"), {
        schema_version: 1,
        rules: [
          {
            id: "rule-warn",
            kind: "protected_path",
            paths: ["secret/**"],
            action: "warn",
            reason: "Warn",
            source: { origin: "declared" },
          },
          {
            id: "rule-block",
            kind: "protected_path",
            paths: ["secret/**"],
            action: "block",
            reason: "Block",
            source: { origin: "declared" },
          },
        ],
      });

      const view = loadPolicyView(tmpDir);
      expect(view.loaded).toBe(false);
      expect(view.problem).toMatch(/conflict/i);
    });

    it("reports conflict when same executable has different actions or rewrite_to", async () => {
      const agsDir = path.join(tmpDir, ".ags");
      await fs.mkdirp(agsDir);
      await fs.writeJson(path.join(agsDir, "policy.json"), {
        schema_version: 1,
        rules: [
          {
            id: "exe-block",
            kind: "command",
            executables: ["npm"],
            action: "block",
            reason: "Block npm",
            source: { origin: "declared" },
          },
          {
            id: "exe-warn",
            kind: "command",
            executables: ["npm"],
            action: "warn",
            reason: "Warn npm",
            source: { origin: "declared" },
          },
        ],
      });

      const view = loadPolicyView(tmpDir);
      expect(view.loaded).toBe(false);
      expect(view.problem).toMatch(/conflict/i);
    });
  });

  describe("mtime reload", () => {
    it("re-reads policy when file mtime changes and handles deletion", async () => {
      const agsDir = path.join(tmpDir, ".ags");
      await fs.mkdirp(agsDir);
      const policyPath = path.join(agsDir, "policy.json");

      await fs.writeJson(policyPath, {
        schema_version: 1,
        rules: [
          {
            id: "v1-rule",
            kind: "protected_path",
            paths: ["v1/**"],
            action: "warn",
            reason: "Version 1",
            source: { origin: "declared" },
          },
        ],
      });

      const view = loadPolicyView(tmpDir);
      expect(view.loaded).toBe(true);
      expect(view.pathRules("v1/foo.ts").length).toBe(1);
      expect(view.pathRules("v2/foo.ts").length).toBe(0);

      // Sleep a bit or explicitly touch mtime
      const future = new Date(Date.now() + 2000);
      await fs.writeJson(policyPath, {
        schema_version: 1,
        rules: [
          {
            id: "v2-rule",
            kind: "protected_path",
            paths: ["v2/**"],
            action: "block",
            reason: "Version 2",
            source: { origin: "declared" },
          },
        ],
      });
      await fs.utimes(policyPath, future, future);

      expect(view.pathRules("v1/foo.ts").length).toBe(0);
      expect(view.pathRules("v2/foo.ts").length).toBe(1);

      // Delete file
      await fs.remove(policyPath);
      expect(view.loaded).toBe(false);
      expect(view.problem).toBeNull();
      expect(view.pathRules("v2/foo.ts").length).toBe(0);
    });
  });
});
