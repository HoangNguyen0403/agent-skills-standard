import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { beforeAll, describe, expect, it } from "vitest";
import { SkillIndex } from "../src/services/SkillIndex";

describe("agent-qa registry routing", () => {
  const index = new SkillIndex(
    fileURLToPath(new URL("../../skills", import.meta.url)),
    fileURLToPath(new URL("../../skills/metadata.json", import.meta.url)),
  );
  const skillId = "quality-engineering-agent-qa";

  beforeAll(async () => {
    await index.load();
  });

  it("loads the skill for its config without capturing unrelated files", () => {
    for (const file of ["agent-qa.config.yaml", "app/agent-qa.config.yaml"]) {
      expect(index.matchFiles([file]).map((match) => match.skill.id)).toContain(
        skillId,
      );
    }
    for (const file of ["workflow.yaml", "tests/checkout.yaml", "README.md"]) {
      expect(
        index.matchFiles([file]).map((match) => match.skill.id),
      ).not.toContain(skillId);
    }
  });

  it("selects explicit agent-qa concepts without taking adjacent driver tasks", () => {
    for (const keyword of ["run agent-qa checkout", "inspect memidex"]) {
      expect(
        index.matchKeywords([keyword]).map((match) => match.skill.id),
      ).toContain(skillId);
    }
    for (const keyword of ["playwright-cli", "appium", "unit test", "memory"]) {
      expect(
        index.matchKeywords([keyword]).map((match) => match.skill.id),
      ).not.toContain(skillId);
    }
  });

  it.each([".agents", ".claude", ".codex", ".github"])(
    "lists the skill in the %s consumer's file and keyword routing index",
    async (surface) => {
      const text = await readFile(
        new URL(
          `../../${surface}/skills/quality-engineering/_INDEX.md`,
          import.meta.url,
        ),
        "utf8",
      );
      const row = text
        .split("\n")
        .find((line) => line.startsWith(`| ${skillId} |`));
      expect(row).toContain("**/agent-qa.config.yaml");
      expect(row).toContain("memidex");
    },
  );
});
