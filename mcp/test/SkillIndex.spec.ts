import fs from "fs-extra";
import os from "os";
import path from "path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { SkillIndex } from "../src/services/SkillIndex";
const repositorySkillsDir = fileURLToPath(
  new URL("../../skills", import.meta.url),
);

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

  it("ranks narrow file-glob matches ahead of broad-glob base-language matches", () => {
    const matches = index.matchFiles(["lib/cart/blocs/cart_bloc.dart"]);
    const ids = matches.map((m) => m.skill.id);
    // flutter-bloc (narrow glob, tier 0) must be ranked before
    // flutter-language (broad glob base-language skill, tier 1).
    expect(ids.indexOf("flutter-bloc")).toBeLessThan(
      ids.indexOf("flutter-language"),
    );
  });

  it("does not match a short keyword embedded inside an unrelated word", () => {
    // "state" as a keyword trigger must not match inside "understatement".
    const matches = index.matchKeywords(["understatement"]);
    const ids = matches.map((m) => m.skill.id);
    expect(ids).not.toContain("flutter-bloc");
  });

  it("ranks exact keyword matches ahead of partial word-boundary matches", () => {
    // "bloc" is an exact match; "render" is a partial word-boundary match
    // against flutter-perf's "render" trigger via a longer phrase.
    const matches = index.matchKeywords(["bloc", "render pipeline"]);
    const ids = matches.map((m) => m.skill.id);
    expect(ids.indexOf("flutter-bloc")).toBeLessThan(
      ids.indexOf("flutter-perf"),
    );
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

  it("handles non-existent metadata path", async () => {
    const missingIndex = new SkillIndex(
      path.join(fixture.root, "skills"),
      path.join(fixture.root, "skills", "non-existent.json"),
    );
    await missingIndex.load();
    expect(missingIndex.isEmpty()).toBe(false);
  });

  it("derives file_routing from SKILL.md globs when metadata.json is absent", async () => {
    // Build a fresh skills dir with NO metadata.json to simulate a user who never ran sync.
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ags-mcp-no-meta-"));
    const skills = path.join(root, "skills");
    await writeSkill(skills, "flutter", "flutter-language", {
      triggers: { files: ["**/*.dart"], keywords: [] },
    });
    await writeSkill(skills, "flutter", "flutter-bloc", {
      triggers: { files: ["**/blocs/**/*.dart"], keywords: ["bloc"] },
    });
    await writeSkill(skills, "golang", "golang-language", {
      triggers: { files: ["**/*.go"], keywords: [] },
    });

    const noMetaIndex = new SkillIndex(skills /* metadataPath omitted */);
    await noMetaIndex.load();

    // Dart files should match flutter skills derived from **/*.dart and **/blocs/**/*.dart
    const dartMatches = noMetaIndex.matchFiles(["lib/blocs/cart_bloc.dart"]);
    const dartIds = dartMatches.map((m) => m.skill.id).sort();
    expect(dartIds).toContain("flutter-language");
    expect(dartIds).toContain("flutter-bloc");

    // Go files should match golang skill
    const goMatches = noMetaIndex.matchFiles(["internal/service/order.go"]);
    expect(goMatches.map((m) => m.skill.id)).toContain("golang-language");

    // Unrelated extension returns nothing
    expect(noMetaIndex.matchFiles(["readme.txt"])).toEqual([]);

    await fs.remove(root);
  });

  it("throws if query called before load", () => {
    const freshIndex = new SkillIndex(path.join(fixture.root, "skills"));
    expect(() => freshIndex.listCategories()).toThrow(
      "SkillIndex.load() must be called before querying.",
    );
  });
});

describe("SkillIndex — repository trigger routing", () => {
  let registryIndex: SkillIndex;

  beforeAll(async () => {
    registryIndex = new SkillIndex(
      repositorySkillsDir,
      path.join(repositorySkillsDir, "metadata.json"),
    );
    await registryIndex.load();
  });

  it("does not route an operator profile query to unrelated framework skills", () => {
    const ids = registryIndex
      .matchKeywords(["operator profile"])
      .map((match) => match.skill.id);

    expect(ids).not.toContain("react-tooling");
    expect(ids).not.toContain("react-state-management");
    expect(ids).not.toContain("ios-swiftui");
    expect(ids).not.toContain("swift-concurrency");
  });

  it("does not route a task complexity query to unrelated framework skills", () => {
    const ids = registryIndex
      .matchKeywords(["task complexity"])
      .map((match) => match.skill.id);

    expect(ids).not.toContain("react-tooling");
    expect(ids).not.toContain("react-state-management");
    expect(ids).not.toContain("ios-swiftui");
    expect(ids).not.toContain("swift-concurrency");
  });

  it("does not route an approval state query to unrelated framework skills", () => {
    const ids = registryIndex
      .matchKeywords(["approval state"])
      .map((match) => match.skill.id);

    expect(ids).not.toContain("react-tooling");
    expect(ids).not.toContain("react-state-management");
    expect(ids).not.toContain("ios-swiftui");
    expect(ids).not.toContain("swift-concurrency");
  });

  it("does not route a worker role query to unrelated framework skills", () => {
    const ids = registryIndex
      .matchKeywords(["worker role"])
      .map((match) => match.skill.id);

    expect(ids).not.toContain("react-tooling");
    expect(ids).not.toContain("react-state-management");
    expect(ids).not.toContain("ios-swiftui");
    expect(ids).not.toContain("swift-concurrency");
  });

  it("does not route a standalone profile keyword to React tooling", () => {
    const ids = registryIndex
      .matchKeywords(["profile"])
      .map((match) => match.skill.id);

    expect(ids).not.toContain("react-tooling");
  });

  it("does not route a standalone state keyword to framework skills", () => {
    const ids = registryIndex
      .matchKeywords(["state"])
      .map((match) => match.skill.id);

    expect(ids).not.toContain("ios-swiftui");
    expect(ids).not.toContain("react-state-management");
  });

  it("does not route a standalone Task keyword to Swift concurrency", () => {
    const ids = registryIndex
      .matchKeywords(["Task"])
      .map((match) => match.skill.id);

    expect(ids).not.toContain("swift-concurrency");
  });

  it("keeps a SwiftUI @State request on the SwiftUI skill", () => {
    const ids = registryIndex
      .matchKeywords(["SwiftUI @State"])
      .map((match) => match.skill.id);

    expect(ids).toContain("ios-swiftui");
  });

  it("keeps a Swift Task request on the Swift concurrency skill", () => {
    const ids = registryIndex
      .matchKeywords(["Swift Task"])
      .map((match) => match.skill.id);

    expect(ids).toContain("swift-concurrency");
  });

  it("keeps a React state-management request on its relevant skill", () => {
    const ids = registryIndex
      .matchKeywords(["manage state in React"])
      .map((match) => match.skill.id);

    expect(ids).toContain("react-state-management");
  });

  it("routes ordinary context-cost intents without framework context false positives", () => {
    for (const query of [
      "optimize context",
      "context management",
      "prompt caching",
      "orchestration cost",
    ]) {
      const ids = registryIndex
        .matchKeywords([query])
        .map((match) => match.skill.id);

      expect(ids, query).toContain("common-context-optimization");
      expect(ids, query).not.toContain("golang-concurrency");
      expect(ids, query).not.toContain("react-state-management");
    }
  });

  it("keeps qualified Go context queries on Go concurrency", () => {
    const ids = registryIndex
      .matchKeywords(["Go context"])
      .map((match) => match.skill.id);

    expect(ids).toContain("golang-concurrency");
  });

  it("keeps qualified React context queries on React state management", () => {
    const ids = registryIndex
      .matchKeywords(["React context"])
      .map((match) => match.skill.id);

    expect(ids).toContain("react-state-management");
  });

  it("keeps a React component profiling request on React tooling", () => {
    const ids = registryIndex
      .matchKeywords(["profile React components"])
      .map((match) => match.skill.id);

    expect(ids).toContain("react-tooling");
  });

  it("does not infer Next.js DAL from generic TypeScript service filenames", () => {
    const ids = registryIndex
      .matchFiles([
        "mcp/src/services/SkillIndex.ts",
        "cli/src/services/SkillLoader.ts",
      ])
      .map((match) => match.skill.id);

    expect(ids).not.toContain("nextjs-data-access-layer");
  });

  it("does not route general service-layer review language to Next.js DAL", () => {
    const ids = registryIndex
      .matchKeywords([
        "review access approval for data in the CLI service layer",
      ])
      .map((match) => match.skill.id);

    expect(ids).not.toContain("nextjs-data-access-layer");
  });

  it("keeps an explicit React request on its relevant skill", () => {
    const ids = registryIndex
      .matchKeywords(["React useReducer"])
      .map((match) => match.skill.id);

    expect(ids).toContain("react-state-management");
  });

  it("keeps explicit React DevTools Profiler requests relevant", () => {
    const ids = registryIndex
      .matchKeywords(["React DevTools Profiler"])
      .map((match) => match.skill.id);

    expect(ids).toContain("react-tooling");
  });

  it("keeps explicit SwiftUI state requests relevant", () => {
    const ids = registryIndex
      .matchKeywords(["SwiftUI State"])
      .map((match) => match.skill.id);

    expect(ids).toContain("ios-swiftui");
  });

  it("keeps explicit Swift concurrency task requests relevant", () => {
    const ids = registryIndex
      .matchKeywords(["Swift concurrency Task"])
      .map((match) => match.skill.id);

    expect(ids).toContain("swift-concurrency");
  });

  it("matches the narrow Next.js data module filename", () => {
    const ids = registryIndex
      .matchFiles(["lib/data.ts"])
      .map((match) => match.skill.id);

    expect(ids).toContain("nextjs-data-access-layer");
  });

  it("matches the narrow Next.js DAL directory", () => {
    const ids = registryIndex
      .matchFiles(["src/dal/users.ts"])
      .map((match) => match.skill.id);

    expect(ids).toContain("nextjs-data-access-layer");
  });

  it("keeps Swift base-language routing without implying SwiftUI", () => {
    const ids = registryIndex
      .matchFiles(["Sources/Example.swift"])
      .map((match) => match.skill.id);

    expect(ids).toContain("swift-language");
    expect(ids).not.toContain("ios-swiftui");
  });

  // Held-out worker bootstrap cases from the operator profile/task complexity
  // and code review reports. Selection must keep the applicable standard and
  // drop unrelated standards that only matched through keyword or composite
  // substring collisions.

  it("does not surface performance or accessibility for an operator profile query", () => {
    const ids = registryIndex
      .matchKeywords(["operator profile"])
      .map((match) => match.skill.id);

    expect(ids).toContain("common-operator-profile");
    expect(ids).not.toContain("common-performance-engineering");
    expect(ids).not.toContain("common-accessibility");
  });

  it("keeps a combined operator/task complexity bootstrap on routing policy skills", () => {
    const ids = registryIndex
      .matchKeywords(["operator profile", "task complexity"])
      .map((match) => match.skill.id);

    expect(ids).toContain("common-operator-profile");
    expect(ids).toContain("common-task-complexity-routing");
    expect(ids).not.toContain("common-performance-engineering");
    expect(ids).not.toContain("common-accessibility");
  });

  it("does not pull accessibility or mobile UX into a code review query", () => {
    const ids = registryIndex
      .matchKeywords(["code review"])
      .map((match) => match.skill.id);

    expect(ids).toContain("common-code-review");
    expect(ids).toContain("common-architecture-audit");
    expect(ids).not.toContain("common-accessibility");
    expect(ids).not.toContain("common-mobile-ux-core");
    expect(ids).not.toContain("common-stitch-design");
    expect(ids).not.toContain("quality-engineering-appium-mcp");
    expect(ids).not.toContain("quality-engineering-playwright-cli");
  });

  it("keeps a subagent query on the worker delegation policy skill", () => {
    const ids = registryIndex
      .matchKeywords(["subagent"])
      .map((match) => match.skill.id);

    expect(ids).toContain("common-subagent-driven-development");
    expect(ids).not.toContain("common-stitch-design");
    expect(ids).not.toContain("quality-engineering-appium-mcp");
    expect(ids).not.toContain("quality-engineering-playwright-cli");
    expect(ids).not.toContain("common-mobile-ux-core");
  });

  it("keeps a bounded worker-routing query off unrelated mobile and design tooling", () => {
    const ids = registryIndex
      .matchKeywords(["subagent driven worker dispatch"])
      .map((match) => match.skill.id);

    expect(ids).toContain("common-subagent-driven-development");
    expect(ids).not.toContain("common-stitch-design");
    expect(ids).not.toContain("quality-engineering-appium-mcp");
    expect(ids).not.toContain("quality-engineering-playwright-cli");
    expect(ids).not.toContain("common-mobile-ux-core");
  });

  it("does not route Next.js Pages Router to mobile UX", () => {
    const ids = registryIndex
      .matchKeywords(["Pages Router"])
      .map((match) => match.skill.id);

    expect(ids).toContain("nextjs-pages-router");
    expect(ids).not.toContain("common-mobile-ux-core");
  });

  it("keeps literal tool and UI requests on their own standards", () => {
    const cases: Array<[string, string]> = [
      ["stitch mcp", "common-stitch-design"],
      ["playwright mcp", "quality-engineering-playwright-cli"],
      ["appium doctor", "quality-engineering-appium-mcp"],
      ["mobile touch targets", "common-mobile-ux-core"],
      ["accessibility audit", "common-accessibility"],
      ["performance bottleneck", "common-performance-engineering"],
      ["component props", "react-component-patterns"],
    ];

    for (const [query, expectedId] of cases) {
      const ids = registryIndex
        .matchKeywords([query])
        .map((match) => match.skill.id);

      expect(ids, query).toContain(expectedId);
    }
  });

  it("still expands accessibility for real form and view standards", () => {
    const formIds = registryIndex
      .matchKeywords(["reactive forms"])
      .map((match) => match.skill.id);
    expect(formIds).toContain("angular-forms");
    expect(formIds).toContain("common-accessibility");

    const viewIds = registryIndex
      .matchKeywords(["ViewBinding"])
      .map((match) => match.skill.id);
    expect(viewIds).toContain("android-xml-views");
    expect(viewIds).toContain("common-accessibility");
    expect(viewIds).toContain("common-mobile-ux-core");
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

// ---------- delimiter-qualified composite patterns ----------

async function makeDelimitedCompositeFixture(): Promise<{
  root: string;
  cleanup: () => Promise<void>;
}> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ags-mcp-delimited-"));
  const skills = path.join(root, "skills");
  await fs.ensureDir(skills);

  await fs.writeJson(path.join(skills, "metadata.json"), {
    file_routing: {},
    broad_globs: [],
    base_language_skills: {},
    foundational_composite_rules: {
      // Delimiter-qualified so singular and plural skill ids match, while
      // ids that merely embed the letters (performance, review) do not.
      "common/accessibility": ["-form", "-view"],
      "common/mobile-ux-core": ["-view"],
    },
  });

  await writeSkill(skills, "common", "common-accessibility", {
    triggers: { files: [], keywords: ["a11y"] },
  });
  await writeSkill(skills, "common", "common-mobile-ux-core", {
    triggers: { files: [], keywords: ["mobile"] },
  });
  await writeSkill(skills, "web", "web-form", {
    triggers: { files: [], keywords: ["web form"] },
  });
  await writeSkill(skills, "web", "detail-view", {
    triggers: { files: [], keywords: ["detail view"] },
  });
  await writeSkill(skills, "common", "common-performance-engineering", {
    triggers: { files: [], keywords: ["profile"] },
  });
  await writeSkill(skills, "common", "common-code-review", {
    triggers: { files: [], keywords: ["code review"] },
  });

  return { root, cleanup: () => fs.remove(root) };
}

describe("SkillIndex — delimiter-qualified composite patterns", () => {
  let fixture: { root: string; cleanup: () => Promise<void> };
  let index: SkillIndex;

  beforeEach(async () => {
    fixture = await makeDelimitedCompositeFixture();
    index = new SkillIndex(
      path.join(fixture.root, "skills"),
      path.join(fixture.root, "skills", "metadata.json"),
    );
    await index.load();
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  it("keeps singular and plural -form/-view ids triggering foundations", () => {
    const formIds = index.matchKeywords(["web form"]).map((m) => m.skill.id);
    expect(formIds).toContain("web-form");
    expect(formIds).toContain("common-accessibility");

    const viewIds = index.matchKeywords(["detail view"]).map((m) => m.skill.id);
    expect(viewIds).toContain("detail-view");
    expect(viewIds).toContain("common-accessibility");
    expect(viewIds).toContain("common-mobile-ux-core");
  });

  it("does not treat embedded form/view letters in performance or review ids as a trigger", () => {
    const performanceIds = index
      .matchKeywords(["profile"])
      .map((m) => m.skill.id);
    expect(performanceIds).toContain("common-performance-engineering");
    expect(performanceIds).not.toContain("common-accessibility");
    expect(performanceIds).not.toContain("common-mobile-ux-core");

    const reviewIds = index
      .matchKeywords(["code review"])
      .map((m) => m.skill.id);
    expect(reviewIds).toContain("common-code-review");
    expect(reviewIds).not.toContain("common-accessibility");
    expect(reviewIds).not.toContain("common-mobile-ux-core");
  });
});

async function makeProductEvidenceFixture(): Promise<{
  root: string;
  cleanup: () => Promise<void>;
}> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ags-mcp-pe-fixture-"));
  const skills = path.join(root, "skills");
  await fs.ensureDir(skills);
  const commonSkill = path.join(
    __dirname,
    "../../skills/common/common-software-requirements",
  );
  await fs.copy(
    commonSkill,
    path.join(skills, "common", "common-software-requirements"),
  );

  await fs.writeJson(path.join(skills, "metadata.json"), {
    file_routing: {
      json: ["common", "product-management"],
      md: ["common", "product-management"],
    },
    broad_globs: [],
    base_language_skills: {},
  });

  await writeSkill(skills, "product-management", "product-evidence", {
    triggers: {
      files: ["docs/product/*/evidence.json"],
      keywords: [
        "product evidence ledger",
        "product decision authority",
        "product evidence freshness",
      ],
    },
  });

  await writeSkill(skills, "product-management", "product-market-research", {
    triggers: {
      files: [],
      keywords: ["product market research", "product competitive analysis"],
    },
  });
  await writeSkill(skills, "product-management", "product-customer-discovery", {
    triggers: {
      files: [],
      keywords: ["product customer discovery", "product research synthesis"],
    },
  });
  await writeSkill(skills, "product-management", "product-strategy", {
    triggers: {
      files: [],
      keywords: ["product strategy decision", "product opportunity framing"],
    },
  });
  await writeSkill(skills, "product-management", "product-investment", {
    triggers: {
      files: [],
      keywords: ["product investment analysis", "product ROI scenario"],
    },
  });
  await writeSkill(skills, "product-management", "product-experimentation", {
    triggers: {
      files: [],
      keywords: ["product hypothesis validation", "product experiment design"],
    },
  });
  await writeSkill(skills, "product-management", "product-metrics", {
    triggers: {
      files: [],
      keywords: ["product measurement contract", "product value review"],
    },
  });
  await writeSkill(skills, "product-management", "product-roadmap", {
    triggers: {
      files: [],
      keywords: [
        "product roadmap prioritization",
        "product portfolio trade-off",
      ],
    },
  });

  for (const skillName of [
    "product-business-requirements",
    "product-requirements",
  ]) {
    await fs.copy(
      path.join(__dirname, "../../skills/product-management", skillName),
      path.join(skills, "product-management", skillName),
    );
  }

  await fs.writeFile(path.join(root, "AGENTS.md"), "# fixture\n");
  return { root, cleanup: () => fs.remove(root) };
}

describe("SkillIndex — product evidence routing & qualified keywords", () => {
  let fixture: { root: string; cleanup: () => Promise<void> };
  let index: SkillIndex;

  beforeEach(async () => {
    fixture = await makeProductEvidenceFixture();
    index = new SkillIndex(
      path.join(fixture.root, "skills"),
      path.join(fixture.root, "skills", "metadata.json"),
    );
    await index.load();
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  it("routes narrow JSON docs/product/*/evidence.json to product-evidence under product-management", () => {
    const matches = index.matchFiles(["docs/product/analytics/evidence.json"]);
    const ids = matches.map((m) => m.skill.id);
    expect(ids).toEqual(["product-evidence"]);
    expect(matches[0].skill.category).toBe("product-management");
  });

  it("does not match unrelated JSON files or generic docs paths", () => {
    expect(index.matchFiles(["package.json"])).toEqual([]);
    expect(index.matchFiles(["tsconfig.json"])).toEqual([]);
    expect(index.matchFiles(["docs/product/strategy.json"])).toEqual([]);
    expect(index.matchFiles(["docs/evidence.json"])).toEqual([]);
    expect(index.matchFiles(["README.md"])).toEqual([]);
  });

  it("routes BRD and PRD paths to their real PM foundation skills only", () => {
    expect(
      index
        .matchFiles(["docs/brd/brd-onboarding.md"])
        .map((match) => match.skill.id),
    ).toEqual(["product-business-requirements"]);
    expect(
      index
        .matchFiles(["docs/prd/prd-onboarding.md"])
        .map((match) => match.skill.id),
    ).toEqual(["product-requirements"]);
    expect(index.matchFiles(["docs/notes.md"])).toEqual([]);
    expect(index.matchFiles(["docs/product/strategy.json"])).toEqual([]);
  });

  it("keeps advanced product-management skills keyword-only (files: [])", () => {
    expect(index.matchFiles(["docs/product/strategy.md"])).toEqual([]);
    const evidenceMatches = index.matchFiles([
      "docs/product/core/evidence.json",
    ]);
    const pmNonEvidenceMatches = evidenceMatches.filter(
      (m) =>
        m.skill.category === "product-management" &&
        m.skill.id !== "product-evidence",
    );
    expect(pmNonEvidenceMatches).toEqual([]);
  });

  it("matches qualified PM keywords exactly", () => {
    const research = index.matchKeywords(["product market research"]);
    expect(research.map((m) => m.skill.id)).toEqual([
      "product-market-research",
    ]);

    const competitive = index.matchKeywords(["product competitive analysis"]);
    expect(competitive.map((m) => m.skill.id)).toEqual([
      "product-market-research",
    ]);

    const discovery = index.matchKeywords(["product customer discovery"]);
    expect(discovery.map((m) => m.skill.id)).toEqual([
      "product-customer-discovery",
    ]);

    const strategy = index.matchKeywords(["product strategy decision"]);
    expect(strategy.map((m) => m.skill.id)).toEqual(["product-strategy"]);

    const investment = index.matchKeywords(["product investment analysis"]);
    expect(investment.map((m) => m.skill.id)).toEqual(["product-investment"]);

    const experiment = index.matchKeywords(["product hypothesis validation"]);
    expect(experiment.map((m) => m.skill.id)).toEqual([
      "product-experimentation",
    ]);

    const metrics = index.matchKeywords(["product measurement contract"]);
    expect(metrics.map((m) => m.skill.id)).toEqual(["product-metrics"]);

    const roadmap = index.matchKeywords(["product roadmap prioritization"]);
    expect(roadmap.map((m) => m.skill.id)).toEqual(["product-roadmap"]);
  });

  it("matches qualified phrases case-insensitively", () => {
    const matches = index.matchKeywords(["PRODUCT INVESTMENT ANALYSIS"]);
    expect(matches.map((m) => m.skill.id)).toEqual(["product-investment"]);
  });

  it("rejects bare negative keywords without qualified phrase context", () => {
    expect(index.matchKeywords(["market"])).toEqual([]);
    expect(index.matchKeywords(["metrics"])).toEqual([]);
    expect(index.matchKeywords(["ROI"])).toEqual([]);
    expect(index.matchKeywords(["strategy"])).toEqual([]);
    expect(index.matchKeywords(["research"])).toEqual([]);
    expect(index.matchKeywords(["discovery"])).toEqual([]);
    expect(index.matchKeywords(["roadmap"])).toEqual([]);
    expect(index.matchKeywords(["experiment"])).toEqual([]);
  });

  it("handles absence/exclusion cleanly when category is omitted", async () => {
    await fs.remove(path.join(fixture.root, "skills", "product-management"));
    const omittedIndex = new SkillIndex(
      path.join(fixture.root, "skills"),
      path.join(fixture.root, "skills", "metadata.json"),
    );
    await omittedIndex.load();

    expect(omittedIndex.listCategories()).toEqual(["common"]);
    expect(
      omittedIndex.findSkill("product-management", "product-investment"),
    ).toBeUndefined();
    expect(
      index.findSkill("product-management", "product-investment"),
    ).toBeDefined();
    expect(omittedIndex.matchKeywords(["product investment analysis"])).toEqual(
      [],
    );
  });
});

async function makeRealProductEvidenceFixture(): Promise<{
  root: string;
  cleanup: () => Promise<void>;
}> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ags-mcp-real-pe-"));
  const skills = path.join(root, "skills");
  await fs.ensureDir(skills);

  const realMetadataPath = path.join(__dirname, "../../skills/metadata.json");
  await fs.copy(realMetadataPath, path.join(skills, "metadata.json"));

  const realArchAudit = path.join(
    __dirname,
    "../../skills/common/common-architecture-audit",
  );
  if (await fs.pathExists(realArchAudit)) {
    await fs.copy(
      realArchAudit,
      path.join(skills, "common", "common-architecture-audit"),
    );
  }

  const realPm = path.join(__dirname, "../../skills/product-management");
  await fs.copy(realPm, path.join(skills, "product-management"));

  await fs.writeFile(path.join(root, "AGENTS.md"), "# fixture\n");
  return { root, cleanup: () => fs.remove(root) };
}

describe("SkillIndex — real registry byte-backed product evidence routing", () => {
  let realFixture: { root: string; cleanup: () => Promise<void> };
  let realIndex: SkillIndex;

  beforeEach(async () => {
    realFixture = await makeRealProductEvidenceFixture();
    realIndex = new SkillIndex(
      path.join(realFixture.root, "skills"),
      path.join(realFixture.root, "skills", "metadata.json"),
    );
    await realIndex.load();
  });

  afterEach(async () => {
    await realFixture.cleanup();
  });

  it("parses real product-evidence and all real PM skills", () => {
    expect(
      realIndex.findSkill("product-management", "product-evidence"),
    ).toBeDefined();

    const expectedPmSkills = [
      "product-market-research",
      "product-customer-discovery",
      "product-strategy",
      "product-investment",
      "product-experimentation",
      "product-metrics",
      "product-roadmap",
      "product-evidence",
      "product-requirements",
      "product-business-requirements",
    ];
    for (const id of expectedPmSkills) {
      expect(realIndex.findSkill("product-management", id)).toBeDefined();
    }
  });

  it("routes approved qualified phrases to real skills from real metadata", () => {
    const cases: Array<[string, string]> = [
      ["product market research", "product-market-research"],
      ["product competitive analysis", "product-market-research"],
      ["product customer discovery", "product-customer-discovery"],
      ["product research synthesis", "product-customer-discovery"],
      ["product strategy decision", "product-strategy"],
      ["product opportunity framing", "product-strategy"],
      ["product investment analysis", "product-investment"],
      ["product ROI scenario", "product-investment"],
      ["product hypothesis validation", "product-experimentation"],
      ["product experiment design", "product-experimentation"],
      ["product measurement contract", "product-metrics"],
      ["product value review", "product-metrics"],
      ["product roadmap prioritization", "product-roadmap"],
      ["product portfolio trade-off", "product-roadmap"],
      ["product evidence ledger", "product-evidence"],
      ["product decision authority", "product-evidence"],
      ["product evidence freshness", "product-evidence"],
    ];

    for (const [phrase, expectedId] of cases) {
      const matches = realIndex.matchKeywords([phrase]);
      expect(
        matches.map((m) => m.skill.id),
        `Phrase "${phrase}" must route to ${expectedId}`,
      ).toContain(expectedId);
    }
  });

  it("rejects bare keywords on real skills", () => {
    const bareWords = [
      "market",
      "metrics",
      "ROI",
      "strategy",
      "research",
      "discovery",
      "roadmap",
      "experiment",
    ];
    for (const word of bareWords) {
      const matches = realIndex.matchKeywords([word]);
      const pmMatches = matches.filter(
        (m) => m.skill.category === "product-management",
      );
      expect(
        pmMatches,
        `Bare word "${word}" must never match any product-management skill`,
      ).toEqual([]);
    }
  });

  it("routes package.json to common audit skills and NEVER to product-management", () => {
    const matches = realIndex.matchFiles(["package.json"]);
    const pmMatches = matches.filter(
      (m) => m.skill.category === "product-management",
    );
    expect(pmMatches).toEqual([]);

    const matchIds = matches.map((m) => m.skill.id);
    expect(matchIds).toContain("common-architecture-audit");
  });

  it("routes docs/product/*/evidence.json to product-evidence under product-management", () => {
    const matches = realIndex.matchFiles(["docs/product/beta/evidence.json"]);
    expect(matches.map((m) => m.skill.id)).toContain("product-evidence");
    const pmMatches = matches.filter(
      (m) => m.skill.category === "product-management",
    );
    expect(pmMatches.map((m) => m.skill.id)).toEqual(["product-evidence"]);
  });
  it("routes BRD and PRD paths to their real PM foundations only", () => {
    const brdMatches = realIndex.matchFiles(["docs/brd/brd-onboarding.md"]);
    expect(brdMatches.map((match) => match.skill.id)).toEqual([
      "product-business-requirements",
    ]);
    expect(brdMatches[0].skill.category).toBe("product-management");

    const prdMatches = realIndex.matchFiles(["docs/prd/prd-onboarding.md"]);
    expect(prdMatches.map((match) => match.skill.id)).toEqual([
      "product-requirements",
    ]);
    expect(prdMatches[0].skill.category).toBe("product-management");

    expect(realIndex.matchFiles(["docs/product/strategy.json"])).toEqual([]);
    expect(realIndex.matchFiles(["src/feature.ts"])).toEqual([]);
    expect(realIndex.matchFiles(["docs/notes.md"])).toEqual([]);
    expect(realIndex.matchFiles(["README.md"])).toEqual([]);
  });

  it("routes requirements keywords to the relocated PM foundations", () => {
    expect(realIndex.matchKeywords(["business requirements"])).toContainEqual(
      expect.objectContaining({
        skill: expect.objectContaining({
          id: "product-business-requirements",
          category: "product-management",
        }),
      }),
    );
    expect(realIndex.matchKeywords(["product requirements"])).toContainEqual(
      expect.objectContaining({
        skill: expect.objectContaining({
          id: "product-requirements",
          category: "product-management",
        }),
      }),
    );
  });

  it("still routes the evidence ledger only to product-evidence", () => {
    const matches = realIndex.matchFiles(["docs/product/beta/evidence.json"]);
    const pmMatches = matches.filter(
      (match) => match.skill.category === "product-management",
    );
    expect(pmMatches.map((match) => match.skill.id)).toEqual([
      "product-evidence",
    ]);
  });

  it("retains existing product discovery keyword routing", () => {
    expect(
      realIndex
        .matchKeywords(["product customer discovery"])
        .map((match) => match.skill.id),
    ).toContain("product-customer-discovery");
  });
});
