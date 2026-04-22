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
});
