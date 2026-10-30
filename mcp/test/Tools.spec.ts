import fs from "fs-extra";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../src/server";
import { SetupHint } from "../src/config";
import { SessionTracker } from "../src/services/SessionTracker";
import { loadPolicyView } from "../src/services/PolicyIndex";
import { SkillIndex } from "../src/services/SkillIndex";
import {
  auditSessionCompliance,
  getCategoryGuide,
  getSessionCost,
  getSkill,
  listCategories,
  loadSkillsForFiles,
  loadSkillsForKeywords,
  getWorkflow,
  listWorkflows,
} from "../src/tools";

async function fixture(): Promise<{
  root: string;
  cleanup: () => Promise<void>;
}> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ags-tools-fixture-"));
  const skills = path.join(root, "skills");
  await fs.ensureDir(skills);
  await fs.writeJson(path.join(skills, "metadata.json"), {
    file_routing: { dart: ["flutter"] },
    broad_globs: ["**/*.dart"],
    base_language_skills: { flutter: "flutter-language" },
  });
  await writeSkill(skills, "flutter", "flutter-language", {
    files: ["**/*.dart"],
    keywords: ["dart"],
  });
  await writeSkill(skills, "flutter", "flutter-bloc", {
    files: ["**_bloc.dart"],
    keywords: ["bloc", "state"],
  });
  await fs.ensureDir(path.join(skills, "flutter", "references"));
  await fs.writeFile(
    path.join(skills, "flutter", "references", "framework-map.md"),
    "# Flutter Framework Map\n\nReviewed: fixture\n",
  );
  // Canonical ids frequently include the category prefix; get_skill should allow
  // callers to omit it (compatibility with varied runtime naming conventions).
  await writeSkill(
    skills,
    "quality-engineering",
    "quality-engineering-playwright-cli",
    {
      keywords: ["playwright-cli", "browser automation"],
    },
  );
  await fs.writeFile(path.join(root, "AGENTS.md"), "# fixture\n");
  return { root, cleanup: () => fs.remove(root) };
}

async function writeSkill(
  dir: string,
  cat: string,
  id: string,
  triggers: { files?: string[]; keywords?: string[]; exclude?: string[] },
): Promise<void> {
  const target = path.join(dir, cat, id);
  await fs.ensureDir(target);
  const content = `---\nname: ${id}\ndescription: ${id}\nmetadata:\n  triggers:\n    files: ${JSON.stringify(triggers.files ?? [])}\n    keywords: ${JSON.stringify(triggers.keywords ?? [])}\n    exclude: ${JSON.stringify(triggers.exclude ?? [])}\n---\n# ${id}\n`;
  await fs.writeFile(path.join(target, "SKILL.md"), content);
}

async function makeCtx(
  skillsDir: string | null,
  setup: SetupHint = { kind: "ready" },
  projectRoot = "/tmp/x",
) {
  const index = new SkillIndex(
    skillsDir,
    skillsDir ? path.join(skillsDir, "metadata.json") : undefined,
  );
  await index.load();
  return {
    projectRoot,
    index,
    tracker: new SessionTracker(),
    setup,
    policy: loadPolicyView(projectRoot),
  };
}

function text(result: { content: Array<{ text: string }> }): string {
  return result.content.map((c) => c.text).join("\n");
}

describe("tools — graceful start", () => {
  it("returns setup guidance when skillsDir is null and setup is no-skills-dir", async () => {
    const ctx = await makeCtx(null, {
      kind: "no-skills-dir",
      projectRoot: "/tmp/x",
      candidates: ["skills"],
    });
    const out = await loadSkillsForFiles({ files: ["lib/foo.dart"] }, ctx);
    expect(text(out)).toContain("No skills are installed");
    expect(text(out)).toContain("agent-skills-standard@latest sync");
  });

  it("returns setup guidance for no-agents-md", async () => {
    const ctx = await makeCtx(null, {
      kind: "no-agents-md",
      searchedFrom: "/tmp",
    });
    const out = await listCategories({}, ctx);
    expect(text(out)).toContain("No `AGENTS.md`");
    expect(text(out)).toContain("init");
  });
});

describe("tools — positive guidance on no match", () => {
  let f: { root: string; cleanup: () => Promise<void> };
  beforeEach(async () => {
    f = await fixture();
  });
  afterEach(async () => {
    await f.cleanup();
  });

  it("returns category list when load_skills_for_files matches nothing", async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));
    const out = await loadSkillsForFiles({ files: ["readme.txt"] }, ctx);
    const t = text(out);
    expect(t).toContain("No skills are routed");
    expect(t).toContain("Available categories");
    expect(t).toContain("flutter");
  });

  it("returns category list when load_skills_for_keywords matches nothing", async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));
    const out = await loadSkillsForKeywords({ keywords: ["nonexistent"] }, ctx);
    expect(text(out)).toContain("Available categories");
  });

  it('does NOT use the phrase "not found"', async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));
    const out = await loadSkillsForFiles({ files: ["x.txt"] }, ctx);
    expect(text(out)).not.toMatch(/not found/i);
  });
});

describe("tools — get_skill suggestions", () => {
  let f: { root: string; cleanup: () => Promise<void> };
  beforeEach(async () => {
    f = await fixture();
  });
  afterEach(async () => {
    await f.cleanup();
  });

  it("resolves close category-local matches before falling back to suggestions", async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));
    const out = await getSkill({ category: "flutter", name: "bloc" }, ctx);
    const t = text(out);
    expect(t).not.toContain("Closest matches");
    expect(t).toContain("flutter/flutter-bloc");
  });

  it("getSkill records estimatedTokens on full body return", async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));
    await getSkill({ category: "flutter", name: "flutter-bloc" }, ctx);
    const event = ctx.tracker.events_().find((e) => e.via === "get_skill");
    expect(event?.loaded).toEqual(["flutter/flutter-bloc"]);
    expect(event?.estimatedTokens).toBeGreaterThan(0);
    expect(ctx.tracker.skillContextCost().totalEstimatedTokens).toBeGreaterThan(
      0,
    );
  });

  it("getSkill records loaded: [] when skill file body is absent", async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));
    const skillPath = path.join(
      f.root,
      "skills",
      "flutter",
      "flutter-bloc",
      "SKILL.md",
    );
    await fs.remove(skillPath);
    const out = await getSkill(
      { category: "flutter", name: "flutter-bloc" },
      ctx,
    );
    expect(text(out)).toContain("SKILL.md is missing");
    const event = ctx.tracker.events_().find((e) => e.via === "get_skill");
    expect(event?.loaded).toEqual([]);
    expect(event?.estimatedTokens).toBeUndefined();
    expect(ctx.tracker.summary().skillsLoaded).toBe(0);
  });

  it("resolves prefixless ids to canonical prefixed ids", async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));
    const out = await getSkill(
      { category: "quality-engineering", name: "playwright-cli" },
      ctx,
    );
    const t = text(out);
    expect(t).toContain(
      "quality-engineering/quality-engineering-playwright-cli",
    );
  });

  it("lists all categories when category is wrong", async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));
    const out = await getSkill({ category: "rust", name: "whatever" }, ctx);
    expect(text(out)).toContain("Available categories");
    expect(text(out)).toContain("flutter");
  });

  it("does not leak filesystem paths in error responses", async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));
    const out = await getSkill({ category: "rust", name: "whatever" }, ctx);
    expect(text(out)).not.toMatch(/\/var\/folders|\/tmp|\/Users\//);
  });

  it("load_skills_for_files guidance for files without extension", async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));
    const out = await loadSkillsForFiles({ files: ["Dockerfile"] }, ctx);
    expect(text(out)).toContain("Files have no extensions");
  });

  it("auditSessionCompliance returns no skills loaded (none yet) if tracker is empty", async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));
    const out = await auditSessionCompliance({}, ctx);
    expect(text(out)).toContain("_(none yet)_");
  });

  it("loads a category guide when framework-map exists", async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));
    const out = await getCategoryGuide({ category: "flutter" }, ctx);
    const t = text(out);
    expect(t).toContain("Category Guide: flutter");
    expect(t).toContain("flutter/flutter-language");
    expect(t).toContain("Flutter Framework Map");
  });

  it("returns friendly guidance when a category guide is absent", async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));
    const out = await getCategoryGuide(
      { category: "quality-engineering" },
      ctx,
    );
    expect(text(out)).toContain("does not provide a category guide yet");
  });
});

describe("tools — happy path tracker", () => {
  let f: { root: string; cleanup: () => Promise<void> };
  beforeEach(async () => {
    f = await fixture();
  });
  afterEach(async () => {
    await f.cleanup();
  });

  it("records a load_skills_for_files call into the audit log", async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));
    await loadSkillsForFiles({ files: ["lib/cart_bloc.dart"] }, ctx);
    const audit = await auditSessionCompliance({}, ctx);
    const t = text(audit);
    expect(t).toContain("flutter/flutter-bloc");
    expect(t).toContain("flutter/flutter-language");
    expect(t).toContain("Skills loaded: 2");
  });

  it("audit log handles zero events without crashing", async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));
    const audit = await auditSessionCompliance({}, ctx);
    expect(text(audit)).toContain("Skills loaded: 0");
    expect(text(audit)).toContain("_(none yet)_");
  });

  it("provenance defaults to unavailable when no host token usage is supplied", async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));
    await loadSkillsForFiles({ files: ["lib/cart_bloc.dart"] }, ctx);

    const cost = await getSessionCost({ workflow: "implement-feature" }, ctx);
    const t = text(cost);

    expect(t).toContain("# Session Telemetry");
    expect(t).toContain("| **Workflow** | implement-feature |");
    expect(t).toContain("| **MCP Tool Calls** | 2 |");
    expect(t).toContain("| **Skills Loaded** | 2 |");
    expect(t).toContain("| **No-Match Calls** | 0 |");
    expect(t).toContain("| **Cost Provenance** | unavailable |");
    expect(t).toContain(
      "| **Cost Status** | Partial - host usage or pricing fields missing |",
    );
    expect(
      t.match(/unavailable \(host did not expose token usage\)/g)?.length,
    ).toBeGreaterThanOrEqual(6);
    expect(t).not.toContain("[Agent: fill");
    expect(t).not.toContain("$0.00");
    expect(t).toContain(
      "| **Missing Host Fields** | promptTokens, completionTokens, inputCostPer1M, outputCostPer1M |",
    );
    expect(t).toContain("load_skills_for_files");
    expect(t).toContain("get_session_cost");
  });

  it("counts discovered workflows only after their bodies are fetched", async () => {
    const workflowsDir = path.join(f.root, ".agents", "workflows");
    await fs.ensureDir(workflowsDir);
    await fs.writeFile(
      path.join(workflowsDir, "dev-fix.md"),
      "---\ndescription: Bug fixing\n---\n# Dev Fix\nReproduce first.",
    );
    const ctx = await makeCtx(
      path.join(f.root, "skills"),
      { kind: "ready" },
      f.root,
    );

    await listWorkflows({}, ctx);
    const discovery = ctx.tracker
      .events_()
      .find((event) => event.via === "list_workflows");
    expect(discovery?.input).toEqual([]);
    expect(discovery?.loaded).toEqual([]);
    expect(discovery?.discovered).toEqual(["workflow/dev-fix"]);
    expect(ctx.tracker.summary().workflowsLoaded).toBe(0);
    expect(ctx.tracker.loadedWorkflows()).toEqual([]);

    await getWorkflow({ name: "dev-fix" }, ctx);
    await getWorkflow({ name: "dev-fix" }, ctx);

    expect(ctx.tracker.summary().workflowsLoaded).toBe(1);
    expect(ctx.tracker.loadedWorkflows()).toEqual(["workflow/dev-fix"]);
  });

  it("does not count category discovery as loaded skill bodies", async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));

    await listCategories({}, ctx);
    const discovery = ctx.tracker
      .events_()
      .find((event) => event.via === "list_categories");
    expect(discovery?.input).toEqual([]);
    expect(discovery?.loaded).toEqual([]);
    expect(discovery?.discovered).toContain("category/flutter");

    expect(ctx.tracker.summary().guidesLoaded).toBe(0);
    expect(ctx.tracker.summary().skillsLoaded).toBe(0);
  });

  it("does not count a missing category guide as a loaded body", async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));

    await getCategoryGuide({ category: "quality-engineering" }, ctx);

    expect(ctx.tracker.summary().skillsLoaded).toBe(0);
    expect(ctx.tracker.loadedSkills()).toEqual([]);
    expect(ctx.tracker.loadedGuides()).toEqual([]);
    expect(ctx.tracker.summary().guidesLoaded).toBe(0);
  });

  it("counts returned category guides separately and uniquely", async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));

    await getCategoryGuide({ category: "flutter" }, ctx);
    await getCategoryGuide({ category: "flutter" }, ctx);

    expect(ctx.tracker.summary().skillsLoaded).toBe(0);
    expect(ctx.tracker.loadedSkills()).toEqual([]);
    expect(ctx.tracker.loadedGuides()).toEqual(["category/flutter"]);
    expect(ctx.tracker.summary().guidesLoaded).toBe(1);
  });

  it("keeps AGS consultation observations local to the tracker session", async () => {
    const workflowsDir = path.join(f.root, ".agents", "workflows");
    await fs.ensureDir(workflowsDir);
    await fs.writeFile(
      path.join(workflowsDir, "dev-fix.md"),
      "---\ndescription: Bug fixing\n---\n# Dev Fix\nReproduce first.",
    );
    const firstSession = await makeCtx(
      path.join(f.root, "skills"),
      { kind: "ready" },
      f.root,
    );
    const nextSession = await makeCtx(
      path.join(f.root, "skills"),
      { kind: "ready" },
      f.root,
    );

    await listWorkflows({}, firstSession);
    await getWorkflow({ name: "dev-fix" }, firstSession);
    expect(firstSession.tracker.loadedWorkflows()).toEqual([
      "workflow/dev-fix",
    ]);
    expect(nextSession.tracker.loadedWorkflows()).toEqual([]);
    expect(nextSession.tracker.events_()).toEqual([]);
    expect(nextSession.tracker.summary().workflowsLoaded).toBe(0);
  });

  it("renders host provenance with real numbers when the request is host-flagged", async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));

    const cost = await getSessionCost(
      {
        workflow: "verify-work",
        model: "example-model",
        promptTokens: 1_000_000,
        completionTokens: 500_000,
        inputCostPer1M: 2,
        outputCostPer1M: 10,
        currency: "USD",
        costSource: "host",
      },
      ctx,
    );
    const t = text(cost);

    expect(t).toContain("| **Prompt Tokens** | 1000000 |");
    expect(t).toContain("| **Cost Provenance** | host |");
    expect(t).not.toContain("$0.00");
  });

  it("surfaces missingHostFields for a partially host-flagged request", async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));

    const cost = await getSessionCost(
      { workflow: "verify-work", promptTokens: 1000, costSource: "host" },
      ctx,
    );
    const t = text(cost);

    expect(t).toContain("| **Cost Provenance** | unavailable |");
    expect(t).toContain(
      "| **Missing Host Fields** | completionTokens, inputCostPer1M, outputCostPer1M |",
    );
  });

  it("reports no coverage gaps when every routed category loads a skill", async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));
    await loadSkillsForFiles({ files: ["lib/cart_bloc.dart"] }, ctx);
    const audit = await auditSessionCompliance({}, ctx);
    const t = text(audit);
    expect(t).toContain("## Coverage gaps");
    expect(t).toContain(
      "none — every routed category loaded at least one skill",
    );
  });

  it("tracks get_skill misses without inflating telemetry no-match counts for cost calls", async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));

    await getSkill({ category: "rust", name: "whatever" }, ctx);
    const cost = await getSessionCost({ workflow: "review-ticket" }, ctx);
    const t = text(cost);

    expect(t).toContain("| **No-Match Calls** | 1 |");
    expect(t).toContain("get_skill");
    expect(t).toContain("get_session_cost");
  });
});

describe("tools — project policy integration", () => {
  let policyFixture: { root: string; cleanup: () => Promise<void> };

  beforeEach(async () => {
    policyFixture = await fixture();
  });

  afterEach(async () => {
    await policyFixture.cleanup();
  });

  it("load_skills_for_files appends matching rules and required checks when policy exists", async () => {
    const agsDir = path.join(policyFixture.root, ".ags");
    await fs.mkdirp(agsDir);
    await fs.writeJson(path.join(agsDir, "policy.json"), {
      schema_version: 1,
      rules: [
        {
          id: "no-edit-cart",
          kind: "protected_path",
          paths: ["lib/cart*.dart"],
          action: "block",
          reason: "Cart is locked",
          source: { origin: "declared" },
        },
        {
          id: "cart-tests",
          kind: "required_check",
          when_changed: ["lib/**"],
          checks: ["pnpm test:cart"],
          action: "warn",
          reason: "Cart changes require tests",
          source: { origin: "declared" },
        },
      ],
    });

    const ctx = await makeCtx(
      path.join(policyFixture.root, "skills"),
      { kind: "ready" },
      policyFixture.root,
    );

    const out = await loadSkillsForFiles(
      { files: ["lib/cart_bloc.dart"] },
      ctx,
    );
    const t = text(out);

    expect(t).toContain("## Project policy for these files");
    expect(t).toContain(
      "- lib/cart_bloc.dart: no-edit-cart (block) — Cart is locked",
    );
    expect(t).toContain("Required checks");
    expect(t).toContain(
      "cart-tests (warn) — Cart changes require tests: pnpm test:cart",
    );
  });

  it("load_skills_for_files appends nothing when no policy file exists", async () => {
    const ctx = await makeCtx(
      path.join(policyFixture.root, "skills"),
      { kind: "ready" },
      policyFixture.root,
    );

    const out = await loadSkillsForFiles(
      { files: ["lib/cart_bloc.dart"] },
      ctx,
    );
    const t = text(out);

    expect(t).not.toContain("Project policy");
    expect(t).not.toContain("Required checks");
  });

  it("load_skills_for_files appends 'Project policy not loaded: <problem>' when policy is invalid", async () => {
    const agsDir = path.join(policyFixture.root, ".ags");
    await fs.mkdirp(agsDir);
    await fs.writeFile(path.join(agsDir, "policy.json"), "{ invalid JSON ");

    const ctx = await makeCtx(
      path.join(policyFixture.root, "skills"),
      { kind: "ready" },
      policyFixture.root,
    );

    const out = await loadSkillsForFiles(
      { files: ["lib/cart_bloc.dart"] },
      ctx,
    );
    const t = text(out);

    expect(t).toContain("Project policy not loaded:");
    expect(t).not.toContain("## Project policy for these files");
  });

  it("buildServer registers tools with advisory sentence in descriptions", async () => {
    const server = await buildServer({
      projectRoot: policyFixture.root,
      skillsDir: path.join(policyFixture.root, "skills"),
      metadataPath: path.join(policyFixture.root, "skills", "metadata.json"),
      setup: { kind: "ready" },
    });
    interface ServerWithTools {
      _registeredTools: Record<string, { description: string }>;
    }
    const registeredTools = (server as unknown as ServerWithTools)
      ._registeredTools;
    const advisory =
      "Also returns matching rules from .ags/policy.json when present (advisory; not a security boundary).";
    expect(registeredTools["load_skills_for_files"].description).toContain(
      advisory,
    );
    expect(registeredTools["audit_session_compliance"].description).toContain(
      advisory,
    );
  });
});

async function productEvidenceToolsFixture(): Promise<{
  root: string;
  cleanup: () => Promise<void>;
}> {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "ags-tools-pe-fixture-"),
  );
  const skills = path.join(root, "skills");
  await fs.ensureDir(skills);
  await fs.writeJson(path.join(skills, "metadata.json"), {
    file_routing: {
      json: ["common", "product-management"],
      md: ["common", "product-management"],
    },
    broad_globs: [],
    base_language_skills: {},
  });
  const realCommon = path.join(
    __dirname,
    "../../skills/common/common-software-requirements",
  );
  await fs.copy(
    realCommon,
    path.join(skills, "common", "common-software-requirements"),
  );

  await writeSkill(skills, "product-management", "product-evidence", {
    files: ["docs/product/*/evidence.json"],
    keywords: [
      "product evidence ledger",
      "product decision authority",
      "product evidence freshness",
    ],
  });

  await writeSkill(skills, "product-management", "product-investment", {
    files: [],
    keywords: ["product investment analysis", "product ROI scenario"],
  });

  await fs.ensureDir(path.join(skills, "product-management", "references"));
  const realFrameworkMap = path.join(
    __dirname,
    "../../skills/product-management/references/framework-map.md",
  );
  await fs.copy(
    realFrameworkMap,
    path.join(skills, "product-management", "references", "framework-map.md"),
  );

  await fs.writeFile(path.join(root, "AGENTS.md"), "# fixture\n");
  return { root, cleanup: () => fs.remove(root) };
}

describe("tools — product evidence & PM routing", () => {
  let peFixture: { root: string; cleanup: () => Promise<void> };

  beforeEach(async () => {
    peFixture = await productEvidenceToolsFixture();
  });

  afterEach(async () => {
    await peFixture.cleanup();
  });

  it("returns exact body and direct provenance for getSkill on installed PM skill", async () => {
    const ctx = await makeCtx(
      path.join(peFixture.root, "skills"),
      { kind: "ready" },
      peFixture.root,
    );
    const out = await getSkill(
      { category: "product-management", name: "product-investment" },
      ctx,
    );
    const body = text(out);
    expect(body).toContain("# product-investment");
    expect(body).toContain("matched: direct");
  });

  it("returns gap guidance when a skill does not exist in installed category", async () => {
    const ctx = await makeCtx(
      path.join(peFixture.root, "skills"),
      { kind: "ready" },
      peFixture.root,
    );
    const out = await getSkill(
      { category: "product-management", name: "missing-skill" },
      ctx,
    );
    expect(text(out)).toContain(
      'it does not contain a skill named "missing-skill"',
    );
  });

  it("routes scoped docs/product/*/evidence.json and rejects unrelated files", async () => {
    const ctx = await makeCtx(
      path.join(peFixture.root, "skills"),
      { kind: "ready" },
      peFixture.root,
    );
    const matched = await loadSkillsForFiles(
      { files: ["docs/product/analytics/evidence.json"] },
      ctx,
    );
    expect(text(matched)).toContain("# product-evidence");
    expect(text(matched)).toContain(
      "matched: file:docs/product/*/evidence.json",
    );

    const unrelated = await loadSkillsForFiles(
      { files: ["README.md", "package.json"] },
      ctx,
    );
    expect(text(unrelated)).not.toContain("product-evidence");
    expect(text(unrelated)).toContain("did not match any tier-eligible skill");
  });

  it("routes qualified PM keywords and rejects bare negative keywords", async () => {
    const ctx = await makeCtx(
      path.join(peFixture.root, "skills"),
      { kind: "ready" },
      peFixture.root,
    );
    const matched = await loadSkillsForKeywords(
      { keywords: ["product investment analysis"] },
      ctx,
    );
    expect(text(matched)).toContain("# product-investment");
    expect(text(matched)).toContain(
      "matched: keyword:product investment analysis",
    );

    const bare = await loadSkillsForKeywords(
      { keywords: ["ROI", "market", "strategy"] },
      ctx,
    );
    expect(text(bare)).not.toContain("product-investment");
    expect(text(bare)).toContain(
      "No skill keyword triggers matched: ROI, market, strategy",
    );
  });

  it("serves category guide for product-management", async () => {
    const ctx = await makeCtx(
      path.join(peFixture.root, "skills"),
      { kind: "ready" },
      peFixture.root,
    );
    const out = await getCategoryGuide({ category: "product-management" }, ctx);
    const body = text(out);
    expect(body).toContain("# Product Management Framework Map");
    expect(body).toContain("Evidence-Based Management");
    expect(body).toContain("validate-product-evidence.mjs");
    expect(body).toContain("evaluate-investment.mjs");
  });

  it("handles absence/exclusion when product-management is removed", async () => {
    await fs.remove(path.join(peFixture.root, "skills", "product-management"));
    const ctx = await makeCtx(
      path.join(peFixture.root, "skills"),
      { kind: "ready" },
      peFixture.root,
    );

    const out = await getSkill(
      { category: "product-management", name: "product-investment" },
      ctx,
    );
    expect(text(out)).toContain(
      'Category "product-management" does not exist in this project.',
    );

    const kw = await loadSkillsForKeywords(
      { keywords: ["product investment analysis"] },
      ctx,
    );
    expect(text(kw)).toContain(
      "No skill keyword triggers matched: product investment analysis",
    );
  });
});
