import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { extractChangedSkills } from "./changed-skills";

test("extractChangedSkills: selects valid skills containing SKILL.md", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "changed-skills-test-"));
  try {
    fs.mkdirSync(path.join(tmpDir, "skills/common/demo-skill"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(tmpDir, "skills/common/demo-skill/SKILL.md"),
      "# Demo Skill\n",
    );

    const result = extractChangedSkills(
      ["skills/common/demo-skill/SKILL.md"],
      tmpDir,
    );
    assert.deepEqual(result, ["common/demo-skill"]);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("extractChangedSkills: includes skills when internal resources or references are edited", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "changed-skills-test-"));
  try {
    fs.mkdirSync(path.join(tmpDir, "skills/common/demo-skill/references"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(tmpDir, "skills/common/demo-skill/scripts"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(tmpDir, "skills/common/demo-skill/SKILL.md"),
      "# Demo Skill\n",
    );

    const result = extractChangedSkills(
      [
        "skills/common/demo-skill/references/guide.md",
        "skills/common/demo-skill/scripts/helper.mjs",
      ],
      tmpDir,
    );
    assert.deepEqual(result, ["common/demo-skill"]);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("extractChangedSkills: excludes category-level reference directories lacking SKILL.md", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "changed-skills-test-"));
  try {
    fs.mkdirSync(path.join(tmpDir, "skills/product-management/references"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(
        tmpDir,
        "skills/product-management/references/framework-map.md",
      ),
      "# Framework Map\n",
    );

    const result = extractChangedSkills(
      ["skills/product-management/references/framework-map.md"],
      tmpDir,
    );
    assert.deepEqual(result, []);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("extractChangedSkills: excludes non-skill files, indices, and workflows", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "changed-skills-test-"));
  try {
    fs.mkdirSync(path.join(tmpDir, "skills/common"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, ".agents/workflows"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "skills/common/_INDEX.md"), "# Index\n");
    fs.writeFileSync(path.join(tmpDir, "package.json"), "{}\n");
    fs.writeFileSync(
      path.join(tmpDir, ".agents/workflows/demo.md"),
      "# Workflow\n",
    );

    const result = extractChangedSkills(
      [
        "skills/common/_INDEX.md",
        "package.json",
        ".agents/workflows/demo.md",
        "",
      ],
      tmpDir,
    );
    assert.deepEqual(result, []);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("extractChangedSkills: deduplicates and sorts multiple skills", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "changed-skills-test-"));
  try {
    fs.mkdirSync(path.join(tmpDir, "skills/category-b/skill-2"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(tmpDir, "skills/category-a/skill-1"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(tmpDir, "skills/category-b/skill-2/SKILL.md"),
      "# Skill 2\n",
    );
    fs.writeFileSync(
      path.join(tmpDir, "skills/category-a/skill-1/SKILL.md"),
      "# Skill 1\n",
    );

    const result = extractChangedSkills(
      [
        "skills/category-b/skill-2/SKILL.md",
        "skills/category-a/skill-1/references/doc.md",
        "skills/category-b/skill-2/evals/evals.json",
      ],
      tmpDir,
    );
    assert.deepEqual(result, ["category-a/skill-1", "category-b/skill-2"]);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
