// scripts/freshness/skills.test.ts
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import fs from "fs-extra";
import { parseFrontmatter, walkSkills } from "./skills";

test("parseFrontmatter returns metadata object and body, CRLF tolerant", () => {
  const lf = "---\nname: a\nmetadata:\n  upstream:\n    - name: next\n      pinned: \"15.3.0\"\n---\nBody here\n";
  const crlf = lf.replace(/\n/g, "\r\n");
  for (const content of [lf, crlf]) {
    const parsed = parseFrontmatter(content);
    assert.ok(parsed);
    assert.equal(parsed.frontmatter.name, "a");
    const meta = parsed.frontmatter.metadata as { upstream: { name: string }[] };
    assert.equal(meta.upstream[0].name, "next");
    assert.match(parsed.body, /Body here/);
  }
});

test("parseFrontmatter returns null without frontmatter", () => {
  assert.equal(parseFrontmatter("# no frontmatter\n"), null);
});

test("walkSkills lists only dirs containing SKILL.md, skips dot dirs and references", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ags-fresh-"));
  const skills = path.join(root, "skills");
  await fs.ensureDir(path.join(skills, "nextjs", "nextjs-app-router"));
  await fs.ensureDir(path.join(skills, "nextjs", "references"));
  await fs.ensureDir(path.join(skills, ".hidden", "x"));
  await writeFile(
    path.join(skills, "nextjs", "nextjs-app-router", "SKILL.md"),
    "---\nname: nextjs-app-router\ndescription: d\n---\nUse Next.js 15+.\n",
  );
  await writeFile(path.join(skills, "nextjs", "references", "framework-map.md"), "# map\n");
  await writeFile(path.join(skills, "metadata.json"), "{}");
  try {
    const records = walkSkills(skills);
    assert.equal(records.length, 1);
    assert.equal(records[0].category, "nextjs");
    assert.equal(records[0].name, "nextjs-app-router");
    assert.equal(records[0].frontmatter.name, "nextjs-app-router");
    assert.match(records[0].body, /Next\.js 15\+/);
  } finally {
    await fs.remove(root);
  }
});
