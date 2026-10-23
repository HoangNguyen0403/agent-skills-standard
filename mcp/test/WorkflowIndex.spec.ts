import fs from "fs-extra";
import { createHash } from "node:crypto";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  scanWorkflows,
  readWorkflowBody,
  lookupWorkflow,
} from "../src/services/WorkflowIndex";
import { getWorkflow } from "../src/tools";
import { SessionTracker } from "../src/services/SessionTracker";
import { SkillIndex } from "../src/services/SkillIndex";

describe("WorkflowIndex and Workflow Tools", () => {
  let root: string;
  let workflowsDir: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "ags-workflows-fixture-"));
    workflowsDir = path.join(root, ".agents", "workflows");
    await fs.ensureDir(workflowsDir);

    await fs.writeFile(
      path.join(workflowsDir, "dev-fix.md"),
      "---\ndescription: Unified bug fixing procedure\n---\n# Dev Fix\nStep 1: Reproduce.",
    );
    await fs.writeFile(
      path.join(workflowsDir, "plan-feature.md"),
      "---\ndescription: Feature planning workflow\n---\n# Plan Feature\nStep 1: PRD.",
    );
    await fs.writeFile(
      path.join(workflowsDir, "not-a-md.txt"),
      "Ignore this file",
    );
  });

  afterEach(async () => {
    await fs.remove(root);
  });

  it("scans and parses valid markdown workflows in .agents/workflows", async () => {
    const wfs = await scanWorkflows(root);
    expect(wfs).toHaveLength(2);
    expect(wfs[0].name).toBe("dev-fix");
    expect(wfs[0].description).toBe("Unified bug fixing procedure");
    expect(wfs[1].name).toBe("plan-feature");
    expect(wfs[1].description).toBe("Feature planning workflow");
  });

  it("reads workflow body correctly after frontmatter", async () => {
    const wfs = await scanWorkflows(root);
    const body = await readWorkflowBody(wfs[0].path);
    expect(body).toBe("# Dev Fix\nStep 1: Reproduce.");
  });

  it("getWorkflow tool returns full workflow content and logs to tracker", async () => {
    const tracker = new SessionTracker();
    const index = new SkillIndex(null);
    const ctx = {
      projectRoot: root,
      index,
      tracker,
      setup: { kind: "ready" as const },
    };

    const res = await getWorkflow({ name: "dev-fix" }, ctx);
    const content = res.content[0].text;
    expect(content).toContain(
      "<!-- Provenance: Loaded workflow/dev-fix via get_workflow -->",
    );
    expect(content).toContain("# Workflow: dev-fix");
    expect(content).toContain("> Unified bug fixing procedure");
    expect(content).toContain("# Dev Fix\nStep 1: Reproduce.");

    const events = tracker.events_();
    expect(events).toHaveLength(1);
    expect(events[0].via).toBe("get_workflow");
    expect(events[0].input).toEqual(["dev-fix"]);
    expect(events[0].loaded).toEqual(["workflow/dev-fix"]);
  });

  it("getWorkflow tool handles non-existent workflow gracefully", async () => {
    const tracker = new SessionTracker();
    const index = new SkillIndex(null);
    const ctx = {
      projectRoot: root,
      index,
      tracker,
      setup: { kind: "ready" as const },
    };

    const res = await getWorkflow({ name: "nonexistent" }, ctx);
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("Workflow 'nonexistent' not found.");

    const events = tracker.events_();
    expect(events).toHaveLength(1);
    expect(events[0].via).toBe("get_workflow");
    expect(events[0].loaded).toEqual([]);
  });

  describe("managed workflow catalog lookup", () => {
    const RAW =
      "---\ndescription: Unified bug fixing procedure\n---\n# Dev Fix\nStep 1: Reproduce.\n";
    const BODY = "# Dev Fix\nStep 1: Reproduce.";
    const CANONICAL = ".agents/workflows/dev-fix.md";
    const NATIVE = ".claude/commands/dev-fix.md";
    const NATIVE_OUTPUT = "native command output";

    function digest(value: string | Buffer): string {
      return createHash("sha256").update(value).digest("hex");
    }

    interface CatalogShape {
      version: number;
      workflows: Record<
        string,
        {
          path: string;
          digest: string;
          registry: string;
          requestedRef: string;
          resolvedCommit: string | null;
          nativeBindings: Array<{
            agent: string;
            path: string;
            outputDigest: string;
            canonicalDigest: string;
          }>;
          nativeConflicts?: Array<{ agent: string; path: string }>;
        }
      >;
    }

    function catalogEntry(
      canonicalContent = RAW,
      nativeContent = NATIVE_OUTPUT,
    ) {
      return {
        path: CANONICAL,
        digest: digest(canonicalContent),
        registry: "https://github.com/owner/repo",
        requestedRef: "workflows-v1.0.0",
        resolvedCommit: "abc123",
        nativeBindings: [
          {
            agent: "claude",
            path: NATIVE,
            outputDigest: digest(nativeContent),
            canonicalDigest: digest(canonicalContent),
          },
        ],
        nativeConflicts: [] as Array<{ agent: string; path: string }>,
      };
    }

    function managedCatalog(
      canonicalContent = RAW,
      nativeContent = NATIVE_OUTPUT,
    ): CatalogShape {
      return {
        version: 1,
        workflows: { "dev-fix": catalogEntry(canonicalContent, nativeContent) },
      };
    }

    async function writeInstall(
      targetRoot: string,
      options: {
        canonicalContent?: string;
        nativeContent?: string;
        catalog?: unknown;
        lock?: unknown;
        lockVersion?: number;
      } = {},
    ) {
      const canonicalContent = options.canonicalContent ?? RAW;
      const nativeContent = options.nativeContent ?? NATIVE_OUTPUT;
      await fs.outputFile(path.join(targetRoot, CANONICAL), canonicalContent);
      await fs.outputFile(path.join(targetRoot, NATIVE), nativeContent);

      const lock = options.lock ?? {
        version: options.lockVersion ?? 2,
        registry: "https://github.com/owner/repo",
        generatedAt: "2026-10-23T00:00:00.000Z",
        sources: {},
        entries: {
          [CANONICAL]: {
            owner: "workflow",
            source: "workflow:dev-fix",
            agent: "shared",
            sha256: digest(canonicalContent),
          },
          [NATIVE]: {
            owner: "workflow",
            source: "workflow:dev-fix",
            agent: "claude",
            sha256: digest(nativeContent),
          },
        },
        workflowCatalog: options.catalog ?? managedCatalog(),
      };
      await fs.writeJson(path.join(targetRoot, ".skills-lock.json"), lock);
    }

    it("serves the verified canonical bytes and claims native parity when digests agree", async () => {
      await writeInstall(root);

      const result = await lookupWorkflow(root, "dev-fix");

      expect(result.status).toBe("managed");
      expect(result.body).toBe(BODY);
      expect(result.digest).toBe(digest(RAW));
      expect(result.nativeParity).toBe(true);
      expect(result.parityIssues).toEqual([]);
    });

    it("does not claim native parity when a native export no longer matches its recorded digest", async () => {
      await writeInstall(root);
      await fs.writeFile(path.join(root, NATIVE), "user-edited export");

      const result = await lookupWorkflow(root, "dev-fix");

      expect(result.status).toBe("managed");
      expect(result.body).toBe(BODY);
      expect(result.nativeParity).toBe(false);
      expect(result.parityIssues).toEqual([NATIVE]);
    });

    it("reports a managed entry unavailable when the canonical bytes changed", async () => {
      await writeInstall(root);
      await fs.writeFile(path.join(root, CANONICAL), `${RAW}\nlocal edit`);

      const result = await lookupWorkflow(root, "dev-fix");

      expect(result.status).toBe("unavailable");
      expect(result.body).toBeUndefined();
      expect(result.reason).toMatch(/digest|mismatch/i);
    });

    it("reports a managed entry unavailable when the canonical file is missing", async () => {
      await writeInstall(root);
      await fs.remove(path.join(root, CANONICAL));

      const result = await lookupWorkflow(root, "dev-fix");

      expect(result.status).toBe("unavailable");
      expect(result.body).toBeUndefined();
    });

    it("does not serve unlisted residue as an installed workflow", async () => {
      await writeInstall(root);
      await fs.outputFile(
        path.join(root, ".agents/workflows/plan-feature.md"),
        "---\ndescription: Local residue\n---\n# Plan Feature\n",
      );

      const result = await lookupWorkflow(root, "plan-feature");

      expect(result.status).toBe("unavailable");
      expect(result.body).toBeUndefined();
    });

    it("reads authored local workflows as local_source when no lock exists", async () => {
      await fs.outputFile(path.join(root, CANONICAL), RAW);

      const result = await lookupWorkflow(root, "dev-fix");

      expect(result.status).toBe("local_source");
      expect(result.source).toBe("local_source");
      expect(result.body).toBe(BODY);
      expect(result.digest).toBe(digest(RAW));
      expect(result.nativeParity).toBe(false);
    });

    it("reports a legacy managed lock without catalog metadata as unverified", async () => {
      await fs.outputFile(path.join(root, CANONICAL), RAW);
      await fs.writeJson(path.join(root, ".skills-lock.json"), {
        version: 2,
        registry: "https://github.com/owner/repo",
        generatedAt: "2026-10-23T00:00:00.000Z",
        sources: {},
        entries: {},
      });

      const result = await lookupWorkflow(root, "dev-fix");

      expect(result.status).toBe("unverified");
      expect(result.body).toBeUndefined();
      expect(result.reason).toMatch(/sync/i);
    });

    it("fails closed on malformed managed metadata instead of falling back to local_source", async () => {
      await writeInstall(root, {
        catalog: { version: 2, workflows: {} },
      });

      const result = await lookupWorkflow(root, "dev-fix");

      expect(result.status).toBe("unavailable");
      expect(result.body).toBeUndefined();
    });

    it("rejects a canonical path that escapes the project root", async () => {
      const outside = path.join(root, "..", "outside-dev-fix.md");
      await fs.outputFile(outside, RAW);
      const escaping = managedCatalog();
      escaping.workflows["dev-fix"].path = "../outside-dev-fix.md";

      await writeInstall(root, { catalog: escaping });

      const result = await lookupWorkflow(root, "dev-fix");

      expect(result.status).toBe("unavailable");
      expect(result.body).toBeUndefined();
      await fs.remove(outside);
    });

    it("rejects a canonical path that is a symlink escaping the project root", async () => {
      await writeInstall(root);
      const outside = path.join(root, "..", "outside-dev-fix.md");
      await fs.outputFile(outside, RAW);
      const canonicalPath = path.join(root, CANONICAL);
      await fs.remove(canonicalPath);
      await fs.symlink(outside, canonicalPath);

      const result = await lookupWorkflow(root, "dev-fix");

      expect(result.status).toBe("unavailable");
      expect(result.body).toBeUndefined();
      await fs.remove(outside);
    });

    it("rejects conflicting native bindings for one output path", async () => {
      const conflicting = managedCatalog();
      const [binding] = conflicting.workflows["dev-fix"].nativeBindings;
      conflicting.workflows["dev-fix"].nativeBindings = [
        binding,
        {
          ...binding,
          agent: "kiro",
          outputDigest: digest("different bytes"),
        },
      ];

      await writeInstall(root, { catalog: conflicting });

      const result = await lookupWorkflow(root, "dev-fix");

      expect(result.status).toBe("unavailable");
      expect(result.body).toBeUndefined();
    });

    it("claims parity for aliased providers sharing one verified output path", async () => {
      const aliased = managedCatalog();
      const [binding] = aliased.workflows["dev-fix"].nativeBindings;
      aliased.workflows["dev-fix"].nativeBindings = [
        binding,
        { ...binding, agent: "kiro" },
      ];

      await writeInstall(root, { catalog: aliased });

      const result = await lookupWorkflow(root, "dev-fix");

      expect(result.status).toBe("managed");
      expect(result.nativeParity).toBe(true);
      expect(result.parityIssues).toEqual([]);
    });

    it("denies parity when a recorded provider conflict accompanies verified bindings", async () => {
      const mixed = managedCatalog();
      mixed.workflows["dev-fix"].nativeConflicts = [
        { agent: "codex", path: ".codex/skills/dev-fix/SKILL.md" },
      ];

      await writeInstall(root, { catalog: mixed });

      const result = await lookupWorkflow(root, "dev-fix");

      expect(result.status).toBe("managed");
      expect(result.nativeParity).toBe(false);
      expect(result.parityIssues).toEqual([".codex/skills/dev-fix/SKILL.md"]);
    });

    it("rejects duplicate JSON keys before ordinary parsing", async () => {
      await fs.outputFile(path.join(root, CANONICAL), RAW);
      await fs.outputFile(path.join(root, NATIVE), NATIVE_OUTPUT);
      const entry = JSON.stringify(managedCatalog().workflows["dev-fix"]);
      const lockText = `{"version":2,"registry":"r","generatedAt":"t","sources":{},"entries":{},"workflowCatalog":{"version":1,"workflows":{"dev-fix":${entry},"dev-fix":${entry}}}}`;
      await fs.writeFile(path.join(root, ".skills-lock.json"), lockText);

      const result = await lookupWorkflow(root, "dev-fix");

      expect(result.status).toBe("unavailable");
      expect(result.reason).toMatch(/duplicate/i);
    });

    it("rejects an unsupported enclosing lock version even with a valid catalog", async () => {
      await writeInstall(root, { lockVersion: 999 });

      const result = await lookupWorkflow(root, "dev-fix");

      expect(result.status).toBe("unavailable");
      expect(result.body).toBeUndefined();
      expect(result.reason).toMatch(/version/i);
    });

    it("rejects a lookup name that attempts path traversal", async () => {
      await writeInstall(root);

      const result = await lookupWorkflow(root, "../../etc/passwd");

      expect(result.status).toBe("unavailable");
      expect(result.body).toBeUndefined();
    });
  });
});
