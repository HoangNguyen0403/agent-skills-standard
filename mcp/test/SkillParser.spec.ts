import fs from "fs-extra";
import path from "path";
import os from "os";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { parseSkill, readSkillBody } from "../src/services/SkillParser";

describe("SkillParser", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ags-mcp-parser-test-"));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("returns null for files with no frontmatter", async () => {
    const skillPath = path.join(tmpDir, "SKILL.md");
    await fs.writeFile(skillPath, "# No Frontmatter\nJust content");
    const result = await parseSkill(skillPath, "test", "no-fm");
    expect(result).toBeNull();
  });

  it("returns null for invalid YAML in frontmatter", async () => {
    const skillPath = path.join(tmpDir, "SKILL.md");
    await fs.writeFile(skillPath, "---\n[invalid yaml\n---\nContent");
    const result = await parseSkill(skillPath, "test", "invalid-yaml");
    expect(result).toBeNull();
  });

  it("handles missing description and other optional fields", async () => {
    const skillPath = path.join(tmpDir, "SKILL.md");
    await fs.writeFile(skillPath, "---\nname: minimal\n---\nContent");
    const result = await parseSkill(skillPath, "test", "minimal");
    expect(result).not.toBeNull();
    expect(result?.description).toBe("");
    expect(result?.triggers.files).toEqual([]);
  });

  it("readSkillBody returns null for non-existent file", async () => {
    const result = await readSkillBody(path.join(tmpDir, "non-existent.md"));
    expect(result).toBeNull();
  });

  it("readSkillBody returns file content", async () => {
    const skillPath = path.join(tmpDir, "SKILL.md");
    const content = "Hello World";
    await fs.writeFile(skillPath, content);
    const result = await readSkillBody(skillPath);
    expect(result).toBe(content);
  });

  it("refuses to parse a file larger than the 1 MiB cap", async () => {
    const skillPath = path.join(tmpDir, "SKILL.md");
    const oversized =
      "---\nname: big\ndescription: big\n---\n" + "x".repeat(2 * 1024 * 1024);
    await fs.writeFile(skillPath, oversized);
    const result = await parseSkill(skillPath, "test", "big");
    expect(result).toBeNull();
  });

  it("strips zero-width/bidi control characters from description", async () => {
    const skillPath = path.join(tmpDir, "SKILL.md");
    const zeroWidthSpace = String.fromCodePoint(0x200b);
    const rtlOverride = String.fromCodePoint(0x202e);
    const description = `Innocent${zeroWidthSpace}looking${rtlOverride}description`;
    await fs.writeFile(
      skillPath,
      `---\nname: hidden\ndescription: "${description}"\n---\nContent`,
    );
    const result = await parseSkill(skillPath, "test", "hidden");
    expect(result?.description).toBe("Innocentlookingdescription");
  });

  it("parses ordinary JSON-compatible YAML frontmatter unaffected by JSON_SCHEMA", async () => {
    const skillPath = path.join(tmpDir, "SKILL.md");
    await fs.writeFile(
      skillPath,
      [
        "---",
        "name: full",
        "description: A full skill",
        "metadata:",
        "  triggers:",
        "    files: ['**/*.ts']",
        "    keywords: [foo, bar]",
        "---",
        "Body",
      ].join("\n"),
    );
    const result = await parseSkill(skillPath, "test", "full");
    expect(result?.name).toBe("full");
    expect(result?.triggers.files).toEqual(["**/*.ts"]);
    expect(result?.triggers.keywords).toEqual(["foo", "bar"]);
  });

  it("does not silently drop a date-shaped keyword by coercing it to a Date object", async () => {
    const skillPath = path.join(tmpDir, "SKILL.md");
    // Under js-yaml's DEFAULT_SCHEMA, an unquoted "2024-01-01" implicitly
    // resolves to a Date instance, which toStringArray's `typeof v ===
    // 'string'` filter then silently drops — the keyword just vanishes
    // with no error. JSON_SCHEMA has no such implicit-timestamp resolver,
    // so it stays a plain string and survives the filter.
    await fs.writeFile(
      skillPath,
      [
        "---",
        "name: dated",
        "description: x",
        "metadata:",
        "  triggers:",
        "    keywords: [2024-01-01, foo]",
        "---",
        "Body",
      ].join("\n"),
    );
    const result = await parseSkill(skillPath, "test", "dated");
    expect(result?.triggers.keywords).toEqual(["2024-01-01", "foo"]);
  });
});
