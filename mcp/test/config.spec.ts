import fs from "fs-extra";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../src/config";

describe("resolveConfig — SKILLS_PROJECT_ROOT validation", () => {
  let tmpDir: string;
  let originalEnv: string | undefined;
  let originalCwd: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ags-mcp-config-test-"));
    originalEnv = process.env.SKILLS_PROJECT_ROOT;
    originalCwd = process.cwd();
  });

  afterEach(async () => {
    if (originalEnv === undefined) {
      delete process.env.SKILLS_PROJECT_ROOT;
    } else {
      process.env.SKILLS_PROJECT_ROOT = originalEnv;
    }
    process.chdir(originalCwd);
    await fs.remove(tmpDir);
  });

  it("refuses the filesystem root", async () => {
    process.env.SKILLS_PROJECT_ROOT = path.parse(tmpDir).root;
    const config = await resolveConfig();
    expect(config.setup.kind).toBe("invalid-root");
    expect(config.skillsDir).toBeNull();
  });

  it("refuses the bare home directory", async () => {
    process.env.SKILLS_PROJECT_ROOT = os.homedir();
    const config = await resolveConfig();
    expect(config.setup.kind).toBe("invalid-root");
    expect(config.skillsDir).toBeNull();
  });

  it("refuses a path that does not exist", async () => {
    process.env.SKILLS_PROJECT_ROOT = path.join(tmpDir, "does-not-exist");
    const config = await resolveConfig();
    expect(config.setup.kind).toBe("invalid-root");
    if (config.setup.kind === "invalid-root") {
      expect(config.setup.reason).toContain("does not exist");
    }
  });

  it("refuses a path that is a file, not a directory", async () => {
    const filePath = path.join(tmpDir, "not-a-dir.txt");
    await fs.writeFile(filePath, "content");
    process.env.SKILLS_PROJECT_ROOT = filePath;
    const config = await resolveConfig();
    expect(config.setup.kind).toBe("invalid-root");
  });

  it("accepts a specific, existing project directory", async () => {
    process.env.SKILLS_PROJECT_ROOT = tmpDir;
    const config = await resolveConfig();
    expect(config.setup.kind).not.toBe("invalid-root");
    expect(config.projectRoot).toBe(path.resolve(tmpDir));
  });
});
