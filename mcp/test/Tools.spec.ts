import fs from "fs-extra";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SetupHint } from "../src/config";
import { SessionTracker } from "../src/services/SessionTracker";
import { SkillIndex } from "../src/services/SkillIndex";
import {
  auditSessionCompliance,
  getSkill,
  listCategories,
  loadSkillsForFiles,
  loadSkillsForKeywords,
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
  // Canonical ids frequently include the category prefix; get_skill should allow
  // callers to omit it (compatibility with varied runtime naming conventions).
  await writeSkill(skills, "quality-engineering", "quality-engineering-playwright-cli", {
    keywords: ["playwright-cli", "browser automation"],
  });
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
  return { projectRoot, index, tracker: new SessionTracker(), setup };
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

  it("suggests close matches when name is wrong but category is right", async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));
    const out = await getSkill({ category: "flutter", name: "bloc" }, ctx);
    const t = text(out);
    expect(t).toContain("Closest matches");
    expect(t).toContain("flutter/flutter-bloc");
  });

  it("resolves prefixless ids to canonical prefixed ids", async () => {
    const ctx = await makeCtx(path.join(f.root, "skills"));
    const out = await getSkill(
      { category: "quality-engineering", name: "playwright-cli" },
      ctx,
    );
    const t = text(out);
    expect(t).toContain("quality-engineering/quality-engineering-playwright-cli");
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
});

describe("server — instructions & best practices (RTK inspiration)", () => {
  it("server provides rich instructions with specific sub-agent guidance", async () => {
    const { SERVER_INSTRUCTIONS } = await import("../src/server");
    expect(SERVER_INSTRUCTIONS).toContain("agent-skills-standard MCP server");
    expect(SERVER_INSTRUCTIONS).toContain("WHEN TO CALL THIS SERVER");
    expect(SERVER_INSTRUCTIONS).toContain("SUB-AGENTS");
    expect(SERVER_INSTRUCTIONS).toContain("authoritative project rules");
    expect(SERVER_INSTRUCTIONS).toContain(
      "OVERRIDE your pre-training defaults",
    );
  });
});
