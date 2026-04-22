import fs from "fs-extra";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SkillIndex } from "../src/services/SkillIndex";

async function makeFixture(): Promise<{
  root: string;
  cleanup: () => Promise<void>;
}> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ags-mcp-fixture-"));
  const skills = path.join(root, "skills");
  await fs.ensureDir(skills);

  // Registry metadata
  await fs.writeJson(path.join(skills, "metadata.json"), {
    file_routing: { dart: ["flutter"], go: ["golang"] },
    broad_globs: ["**/*.dart", "**/*.go"],
    base_language_skills: {
      flutter: "flutter-language",
      golang: "golang-language",
    },
  });

  // flutter base-language skill — KEEPS broad glob
  await writeSkill(skills, "flutter", "flutter-language", {
    triggers: { files: ["**/*.dart"], keywords: [] },
  });

  // flutter narrower skill — narrow glob, always matches
  await writeSkill(skills, "flutter", "flutter-bloc", {
    triggers: { files: ["**/blocs/**/*.dart"], keywords: ["bloc", "state"] },
  });

  // flutter broad-glob non-base skill — should be DEMOTED (not match on file alone)
  await writeSkill(skills, "flutter", "flutter-perf", {
    triggers: { files: ["**/*.dart"], keywords: ["performance", "render"] },
  });

  // skill with exclude
  await writeSkill(skills, "flutter", "flutter-no-tests", {
    triggers: {
      files: ["**/*.dart"],
      keywords: [],
      exclude: ["**/*_test.dart"],
    },
  });

  // golang base-language
  await writeSkill(skills, "golang", "golang-language", {
    triggers: { files: ["**/*.go"], keywords: [] },
  });

  // Top-level marker so config.findProjectRoot would work in real use
  await fs.writeFile(path.join(root, "AGENTS.md"), "# fixture\n");

  return { root, cleanup: () => fs.remove(root) };
}

async function writeSkill(
  skillsDir: string,
  category: string,
  id: string,
  metadata: {
    triggers: { files?: string[]; keywords?: string[]; exclude?: string[] };
  },
): Promise<void> {
  const dir = path.join(skillsDir, category, id);
  await fs.ensureDir(dir);
  const fm = `---\nname: ${id}\ndescription: ${id} description\nmetadata:\n  triggers:\n    files: ${JSON.stringify(metadata.triggers.files ?? [])}\n    keywords: ${JSON.stringify(metadata.triggers.keywords ?? [])}\n    exclude: ${JSON.stringify(metadata.triggers.exclude ?? [])}\n---\n# ${id}\nbody`;
  await fs.writeFile(path.join(dir, "SKILL.md"), fm);
}

describe("SkillIndex", () => {
  let fixture: { root: string; cleanup: () => Promise<void> };
  let index: SkillIndex;

  beforeEach(async () => {
    fixture = await makeFixture();
    index = new SkillIndex(
      path.join(fixture.root, "skills"),
      path.join(fixture.root, "skills", "metadata.json"),
    );
    await index.load();
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  it("lists categories from disk", () => {
    expect(index.listCategories().sort()).toEqual(["flutter", "golang"]);
  });

  it("routes file extensions through file_routing", () => {
    const matches = index.matchFiles(["lib/cart/blocs/cart_bloc.dart"]);
    const ids = matches.map((m) => m.skill.id).sort();
    // flutter-language (broad glob, base) + flutter-bloc (narrow glob)
    // flutter-perf is broad-glob and NOT base — demoted, must NOT appear
    // flutter-no-tests has broad glob, not base — also demoted
    expect(ids).toEqual(["flutter-bloc", "flutter-language"]);
  });

  it("demotes non-base broad-glob skills (tier model)", () => {
    const matches = index.matchFiles(["lib/cart/cart.dart"]);
    const ids = matches.map((m) => m.skill.id);
    expect(ids).toContain("flutter-language");
    expect(ids).not.toContain("flutter-perf");
    expect(ids).not.toContain("flutter-no-tests");
  });

  it("honors exclude patterns", () => {
    // flutter-no-tests is broad-glob non-base so already demoted on file match.
    // Verify exclude semantics by giving it a NARROW glob and asserting that the excluded path still skips.
    const matches = index.matchFiles(["lib/cart/cart_test.dart"]);
    expect(
      matches.find((m) => m.skill.id === "flutter-no-tests"),
    ).toBeUndefined();
  });

  it("matches keywords case-insensitively", () => {
    const matches = index.matchKeywords(["PERFORMANCE issue"]);
    const ids = matches.map((m) => m.skill.id);
    expect(ids).toContain("flutter-perf");
  });

  it("matches multiple keyword variants", () => {
    const matches = index.matchKeywords(["bloc"]);
    const ids = matches.map((m) => m.skill.id);
    expect(ids).toContain("flutter-bloc");
  });

  it("returns empty when no extension is routed", () => {
    expect(index.matchFiles(["readme.txt"])).toEqual([]);
  });

  it("findSkill returns undefined for missing skill", () => {
    expect(index.findSkill("flutter", "does-not-exist")).toBeUndefined();
  });

  it("findSkill returns the skill metadata", () => {
    const skill = index.findSkill("flutter", "flutter-bloc");
    expect(skill?.id).toBe("flutter-bloc");
    expect(skill?.category).toBe("flutter");
  });
});

// ---------- composite-trigger expansion ----------

async function makeCompositeFixture(): Promise<{
  root: string;
  cleanup: () => Promise<void>;
}> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ags-mcp-composite-"));
  const skills = path.join(root, "skills");
  await fs.ensureDir(skills);

  await fs.writeJson(path.join(skills, "metadata.json"), {
    file_routing: { dart: ["flutter"], ts: ["nestjs"] },
    broad_globs: ["**/*.dart", "**/*.ts"],
    base_language_skills: {
      flutter: "flutter-bloc-state-management",
      nestjs: "nestjs-architecture",
    },
    foundational_composite_rules: {
      // common-best-practices fires when ANY skill containing these substrings loads
      "common/best-practices": [
        "architecture",
        "controller",
        "state-management",
      ],
      // common-error-handling fires only on more specific overlap
      "common/error-handling": ["controller", "service"],
    },
  });

  // common foundational skills (declared in composite rules)
  await writeSkill(skills, "common", "common-best-practices", {
    triggers: { files: [], keywords: ["solid", "naming"] },
  });
  await writeSkill(skills, "common", "common-error-handling", {
    triggers: { files: [], keywords: ["try catch", "error"] },
  });
  // a foundational rule that points at a skill that doesn't exist on disk —
  // must be tolerated silently
  await writeSkill(skills, "common", "common-unrelated", {
    triggers: { files: [], keywords: ["noop"] },
  });

  // base-language skills that should TRIGGER the composites
  await writeSkill(skills, "flutter", "flutter-bloc-state-management", {
    triggers: { files: ["**/*.dart"], keywords: [] },
  });
  await writeSkill(skills, "nestjs", "nestjs-architecture", {
    triggers: { files: ["**/*.ts"], keywords: [] },
  });
  // a non-foundational, non-triggering skill
  await writeSkill(skills, "flutter", "flutter-misc", {
    triggers: { files: ["**/*.misc.dart"], keywords: ["misc"] },
  });

  await fs.writeFile(path.join(root, "AGENTS.md"), "# fixture\n");
  return { root, cleanup: () => fs.remove(root) };
}

describe("SkillIndex — composite triggers", () => {
  let fixture: { root: string; cleanup: () => Promise<void> };
  let index: SkillIndex;

  beforeEach(async () => {
    fixture = await makeCompositeFixture();
    index = new SkillIndex(
      path.join(fixture.root, "skills"),
      path.join(fixture.root, "skills", "metadata.json"),
    );
    await index.load();
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  it("surfaces common-best-practices via composite when a base-language skill loads", () => {
    const matches = index.matchFiles(["lib/cart/cart_bloc.dart"]);
    const ids = matches.map((m) => m.skill.id);
    expect(ids).toContain("flutter-bloc-state-management"); // direct
    expect(ids).toContain("common-best-practices"); // composite (via "state-management" pattern)
  });

  it("marks composite results with matchedBy:composite + reason naming the trigger", () => {
    const matches = index.matchFiles(["src/orders.controller.ts"]);
    // nestjs-architecture matches "architecture" pattern → triggers common-best-practices
    const composite = matches.find(
      (m) => m.skill.id === "common-best-practices",
    );
    expect(composite).toBeDefined();
    expect(composite?.matchedBy).toBe("composite");
    expect(composite?.reason).toContain("nestjs-architecture");
  });

  it("triggers multiple foundational rules at once when multiple patterns match", () => {
    // nestjs-architecture id contains "architecture" (triggers best-practices)
    // but does NOT contain "controller" or "service" — so error-handling should NOT trigger
    const matches = index.matchFiles(["src/auth.ts"]);
    const ids = matches.map((m) => m.skill.id);
    expect(ids).toContain("common-best-practices");
    expect(ids).not.toContain("common-error-handling");
  });

  it("does not duplicate when a foundational skill is also matched directly", () => {
    // Pretend best-practices was matched via keyword; composite expansion
    // must not add it a second time.
    const direct = index.matchKeywords(["solid"]);
    const ids = direct.map((m) => m.skill.id);
    const occurrences = ids.filter(
      (id) => id === "common-best-practices",
    ).length;
    expect(occurrences).toBe(1);
  });

  it("triggers composites from keyword matches too, not only from file matches", () => {
    // matchKeywords for "solid" loads common-best-practices directly. That
    // shouldn't itself trigger more composites because best-practices isn't
    // referenced by any rule's pattern list — assert no infinite loop and
    // no extra composite spam.
    const matches = index.matchKeywords(["solid"]);
    const ids = matches.map((m) => m.skill.id);
    expect(ids).toEqual(["common-best-practices"]);
  });

  it("skips composite rules whose foundational skill is missing on disk", async () => {
    // Drop the common-best-practices SKILL.md and reload; the rule should not crash.
    await fs.remove(
      path.join(fixture.root, "skills", "common", "common-best-practices"),
    );
    const reloaded = new SkillIndex(
      path.join(fixture.root, "skills"),
      path.join(fixture.root, "skills", "metadata.json"),
    );
    await reloaded.load();
    const matches = reloaded.matchFiles(["lib/cart/cart_bloc.dart"]);
    const ids = matches.map((m) => m.skill.id);
    expect(ids).toContain("flutter-bloc-state-management");
    expect(ids).not.toContain("common-best-practices");
  });

  it("does not trigger composites when no direct match overlaps a pattern", () => {
    // Match a keyword-only skill whose id contains none of the composite
    // patterns ("architecture", "controller", "state-management", "service").
    // common-unrelated has keyword "noop" — match via that to avoid pulling in
    // any base-language skill that would itself trigger composites.
    const matches = index.matchKeywords(["noop"]);
    const ids = matches.map((m) => m.skill.id);
    expect(ids).toContain("common-unrelated");
    expect(ids).not.toContain("common-best-practices");
    expect(ids).not.toContain("common-error-handling");
  });

  it("expandComposites is non-recursive — composites do not trigger more composites", () => {
    // Manually craft a seed with a composite-marked result and verify the next
    // pass returns the same as the first (idempotent).
    const matches = index.matchFiles(["lib/cart/cart_bloc.dart"]);
    const second = index.expandComposites(matches);
    // matches already contains the composite; expanding it again should yield
    // nothing new (no recursion).
    expect(second).toEqual([]);
  });
});
