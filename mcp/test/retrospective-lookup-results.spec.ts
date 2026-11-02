import { describe, expect, it } from "vitest";
import {
  NO_MATCH_PATTERNS,
  parseLookupResult,
  REGISTRY_SKILL_ID_REGEX,
  SKILL_MARKER_REGEX,
} from "../src/retrospective/lookup-results";

describe("parseLookupResult", () => {
  it("parses direct skill markers with valid registry ids", () => {
    const text =
      "<!-- skill: nextjs/app-router | matched: direct -->\n# App Router\nContent";
    const result = parseLookupResult("get_skill", text);

    expect(result.bodies).toEqual([{ id: "nextjs/app-router", reused: false }]);
    expect(result.workflowBodies).toBe(0);
    expect(result.noMatch).toBe(false);
  });

  it("parses file-matched skill markers", () => {
    const text =
      "<!-- skill: golang/go-testing | matched: file:pkg/auth/auth_test.go -->\n# Go Testing";
    const result = parseLookupResult("load_skills_for_files", text);

    expect(result.bodies).toEqual([{ id: "golang/go-testing", reused: false }]);
    expect(result.workflowBodies).toBe(0);
    expect(result.noMatch).toBe(false);
  });

  it("parses keyword-matched skill markers", () => {
    const text =
      "<!-- skill: react/react-hooks | matched: keyword:useEffect -->\n# React Hooks";
    const result = parseLookupResult("load_skills_for_keywords", text);

    expect(result.bodies).toEqual([{ id: "react/react-hooks", reused: false }]);
    expect(result.workflowBodies).toBe(0);
    expect(result.noMatch).toBe(false);
  });

  it("identifies reused skill markers when matched text contains 'already loaded'", () => {
    const text =
      "<!-- skill: flutter/flutter-base | matched: already loaded this session -->\n# Flutter";
    const result = parseLookupResult("load_skills_for_files", text);

    expect(result.bodies).toEqual([
      { id: "flutter/flutter-base", reused: true },
    ]);
    expect(result.workflowBodies).toBe(0);
    expect(result.noMatch).toBe(false);
  });

  it("sets id to null for unvalidated registry ids per Contract Section 0", () => {
    const testCases = [
      "<!-- skill: Bad/../x | matched: direct -->",
      "<!-- skill: UPPERCASE/my-skill | matched: direct -->",
      "<!-- skill: cat/UPPER-SKILL | matched: direct -->",
      "<!-- skill: cat_with_underscore/skill | matched: direct -->",
      "<!-- skill: cat/skill_with_underscore | matched: direct -->",
      "<!-- skill: -leading-hyphen/skill | matched: direct -->",
      "<!-- skill: cat/-leading-hyphen | matched: direct -->",
      "<!-- skill: cat.dot/skill | matched: direct -->",
      "<!-- skill: no-slash-skill | matched: direct -->",
      "<!-- skill: too/many/slashes | matched: direct -->",
    ];

    for (const text of testCases) {
      const result = parseLookupResult("get_skill", text);
      expect(result.bodies).toHaveLength(1);
      expect(result.bodies[0].id).toBeNull();
      expect(result.bodies[0].reused).toBe(false);
    }
  });

  it("does not count a marker whose id contains whitespace (the pinned pattern requires a non-space id)", () => {
    const result = parseLookupResult(
      "get_skill",
      "<!-- skill: Bad Id/../x | matched: direct -->",
    );
    expect(result.bodies).toHaveLength(0);
    expect(result.noMatch).toBe(false);
  });

  it("strictly enforces registry id length bounds (category <= 64, id <= 128)", () => {
    const validCat64 = "a".repeat(64);
    const validId128 = "b".repeat(128);
    const validText = `<!-- skill: ${validCat64}/${validId128} | matched: direct -->`;
    const validResult = parseLookupResult("get_skill", validText);
    expect(validResult.bodies[0].id).toBe(`${validCat64}/${validId128}`);

    const invalidCat65 = "a".repeat(65);
    const invalidCatText = `<!-- skill: ${invalidCat65}/valid-id | matched: direct -->`;
    expect(
      parseLookupResult("get_skill", invalidCatText).bodies[0].id,
    ).toBeNull();

    const invalidId129 = "b".repeat(129);
    const invalidIdText = `<!-- skill: valid-cat/${invalidId129} | matched: direct -->`;
    expect(
      parseLookupResult("get_skill", invalidIdText).bodies[0].id,
    ).toBeNull();
  });

  it("parses workflow provenance headers", () => {
    const text =
      "<!-- Provenance: Loaded workflow/dev-fix via get_workflow -->\n\n# Workflow: dev-fix\nInstructions...";
    const result = parseLookupResult("get_workflow", text);

    expect(result.bodies).toEqual([]);
    expect(result.workflowBodies).toBe(1);
    expect(result.noMatch).toBe(false);
  });

  it("handles mixed skill bodies (delivered, reused, unvalidated)", () => {
    const text = [
      "<!-- skill: nextjs/app-router | matched: file:src/app/page.tsx -->",
      "# Next.js App Router body",
      "---",
      "<!-- skill: react/react-hooks | matched: file:src/app/page.tsx (already loaded) -->",
      "# React Hooks body",
      "---",
      "<!-- skill: Invalid..Name/foo | matched: file:src/app/page.tsx -->",
      "# Invalid id body",
    ].join("\n");

    const result = parseLookupResult("load_skills_for_files", text);
    expect(result.bodies).toEqual([
      { id: "nextjs/app-router", reused: false },
      { id: "react/react-hooks", reused: true },
      { id: null, reused: false },
    ]);
    expect(result.workflowBodies).toBe(0);
    expect(result.noMatch).toBe(false);
  });

  it("handles empty or non-string text safely", () => {
    expect(parseLookupResult("get_skill", "")).toEqual({
      bodies: [],
      workflowBodies: 0,
      noMatch: false,
    });
    // @ts-expect-error test non-string input resilience
    expect(parseLookupResult("get_skill", null)).toEqual({
      bodies: [],
      workflowBodies: 0,
      noMatch: false,
    });
  });

  it("bounds scanning to at most 2,000,000 characters", () => {
    const padding = " ".repeat(2_000_000);
    const textAfterBound = `${padding}<!-- skill: nextjs/app-router | matched: direct -->`;
    const result = parseLookupResult("get_skill", textAfterBound);

    expect(result.bodies).toEqual([]);
    expect(result.workflowBodies).toBe(0);
  });

  it("matches marker-like string anywhere in text (e.g. inside code fences) per contract regex decision", () => {
    // Contract note: markers are matched anywhere using contract regex /<!-- skill: (\S+) \| matched: ([^\n]*?) -->/g
    const fencedText = [
      "```markdown",
      "<!-- skill: nestjs/auth | matched: direct -->",
      "```",
    ].join("\n");

    const result = parseLookupResult("get_skill", fencedText);
    expect(result.bodies).toEqual([{ id: "nestjs/auth", reused: false }]);
  });

  it("detects noMatch for each server no-result sentence pattern when bodies and workflowBodies are 0", () => {
    for (const pattern of NO_MATCH_PATTERNS) {
      const text = `Server message: ${pattern}\nAdditional context lines.`;
      const result = parseLookupResult("load_skills_for_files", text);

      expect(result.bodies).toEqual([]);
      expect(result.workflowBodies).toBe(0);
      expect(result.noMatch).toBe(true);
    }
  });

  it("returns noMatch = false when skill markers or workflow bodies exist even if no-match text is present", () => {
    const textWithSkill = [
      "<!-- skill: nextjs/app-router | matched: direct -->",
      "Inside the skill text, it mentions: did not match any tier-eligible skill",
    ].join("\n");
    const resultSkill = parseLookupResult("get_skill", textWithSkill);
    expect(resultSkill.bodies).toHaveLength(1);
    expect(resultSkill.noMatch).toBe(false);

    const textWithWorkflow = [
      "<!-- Provenance: Loaded workflow/dev-fix via get_workflow -->",
      "Here is workflow text mentioning: ' not found",
    ].join("\n");
    const resultWorkflow = parseLookupResult("get_workflow", textWithWorkflow);
    expect(resultWorkflow.workflowBodies).toBe(1);
    expect(resultWorkflow.noMatch).toBe(false);
  });

  it("returns noMatch = false for arbitrary text without server no-result sentences", () => {
    const text =
      "Some generic output that is neither a skill nor a known server miss.";
    const result = parseLookupResult("get_skill", text);
    expect(result.bodies).toEqual([]);
    expect(result.workflowBodies).toBe(0);
    expect(result.noMatch).toBe(false);
  });

  it("verifies contract regex patterns exported for inspection", () => {
    expect(REGISTRY_SKILL_ID_REGEX.test("valid-category/valid-id-123")).toBe(
      true,
    );
    expect(REGISTRY_SKILL_ID_REGEX.test("Invalid/id")).toBe(false);

    const match = SKILL_MARKER_REGEX.exec("<!-- skill: a/b | matched: c -->");
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe("a/b");
    expect(match?.[2]).toBe("c");
  });
});
