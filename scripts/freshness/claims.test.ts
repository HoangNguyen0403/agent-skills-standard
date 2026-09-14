import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import fs from "fs-extra";
import { scanClaims, scanText } from "./claims";
import type { SkillRecord } from "./types";

const who = { category: "nextjs", name: "nextjs-app-router" };

test("scanText extracts name, version, floor flag, and line", () => {
  const text = "Intro\nUse Next.js 15+ App Router.\nJava 21 virtual threads.\nReact Native 0.76 and React 19.\nFlutter 3.27+ spacing.\n";
  const claims = scanText(text, "skills/x/SKILL.md", who);
  const byName = Object.fromEntries(claims.map((c) => [c.name, c]));
  assert.equal(byName.next.version, "15");
  assert.equal(byName.next.floor, true);
  assert.equal(byName.next.line, 2);
  assert.equal(byName.java.version, "21");
  assert.equal(byName.java.floor, false);
  assert.equal(byName["react-native"].version, "0.76");
  assert.equal(byName.react.version, "19");
  assert.equal(byName.flutter.version, "3.27");
  assert.equal(claims.length, 5);
});

test("scanText ignores prose numbers without a known product name", () => {
  assert.deepEqual(scanText("Chapter 12 has 3 rules.", "f.md", who), []);
});

test("scanClaims covers SKILL.md body and references/*.md with repo-relative paths", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ags-claims-"));
  const dir = path.join(root, "skills", "nextjs", "nextjs-app-router");
  await fs.ensureDir(path.join(dir, "references"));
  await writeFile(path.join(dir, "SKILL.md"), "---\nname: a\n---\nNext.js 15+\n");
  await writeFile(path.join(dir, "references", "implementation.md"), "Angular 17+\n");
  const skill: SkillRecord = {
    category: "nextjs",
    name: "nextjs-app-router",
    dir,
    skillPath: path.join(dir, "SKILL.md"),
    frontmatter: { name: "a" },
    body: "Next.js 15+\n",
  };
  try {
    const claims = scanClaims(skill, root);
    assert.deepEqual(
      claims.map((c) => [c.name, c.file]).sort(),
      [
        ["angular", "skills/nextjs/nextjs-app-router/references/implementation.md"],
        ["next", "skills/nextjs/nextjs-app-router/SKILL.md"],
      ],
    );
  } finally {
    await fs.remove(root);
  }
});

test("scanText marks claims as historical from same-line context words", () => {
  const text = [
    "Stdlib since Go 1.21 ships log/slog.",          // historical
    "Use Go 1.24 generics freely.",                  // current
    "Pre-iOS 17 builds need the fallback.",          // historical (pre-)
    "Migrating from PHP 7 to PHP 8 is documented.",  // both historical (migrat + from)
    "AGP 8 → AGP 9 upgrade guide",                   // historical (upgrad)
  ].join("\n");
  const claims = scanText(text, "f.md", who);
  const ctx = Object.fromEntries(claims.map((c) => [`${c.name}:${c.version}:${c.line}`, c.context]));
  assert.equal(ctx["go:1.21:1"], "historical");
  assert.equal(ctx["go:1.24:2"], "current");
  assert.equal(ctx["ios:17:3"], "historical");
  assert.equal(ctx["php:7:4"], "historical");
  assert.equal(ctx["php:8:4"], "historical");
  assert.equal(ctx["agp:8:5"], "historical");
  assert.equal(ctx["agp:9:5"], "historical");
});

test("scanClaims reports real file line numbers for SKILL.md (frontmatter counted)", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ags-claims-lines-"));
  const dir = path.join(root, "skills", "java", "java-language");
  await fs.ensureDir(dir);
  const content = "---\nname: java-language\ndescription: d\nmetadata:\n  triggers:\n    keywords:\n      - java\n---\n\n# Java\n\nUse Java 21 records.\n";
  await writeFile(path.join(dir, "SKILL.md"), content);
  const skill: SkillRecord = {
    category: "java",
    name: "java-language",
    dir,
    skillPath: path.join(dir, "SKILL.md"),
    frontmatter: { name: "java-language" },
    body: "\n# Java\n\nUse Java 21 records.\n",
  };
  try {
    const claims = scanClaims(skill, root);
    assert.equal(claims.length, 1);
    assert.equal(claims[0].name, "java");
    assert.equal(claims[0].line, 12);
  } finally {
    await fs.remove(root);
  }
});
