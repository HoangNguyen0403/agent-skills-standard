import fs from "fs-extra";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scanWorkflows, readWorkflowBody } from "../src/services/WorkflowIndex";
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
});
