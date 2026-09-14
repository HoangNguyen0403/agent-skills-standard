import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import fs from "fs-extra";
import { auditFreshness, daysBetween, readFrameworkMapReviewed } from "./audit";

const TODAY = new Date("2026-09-14T00:00:00Z");

async function fixture(): Promise<{ root: string; cleanup: () => Promise<void> }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "ags-audit-"));
  const skills = path.join(root, "skills");
  const mk = async (cat: string, name: string, body: string, fm = "") => {
    await fs.ensureDir(path.join(skills, cat, name));
    await writeFile(
      path.join(skills, cat, name, "SKILL.md"),
      `---\nname: ${name}\ndescription: d\n${fm}---\n${body}\n`,
    );
  };
  await mk("nextjs", "nextjs-app-router", "Use Next.js 15+.");
  await mk("nextjs", "nextjs-legacy", "Targets Next.js 14 only.");
  await mk("java", "java-language", "Java 21 and Java 16+ features.");
  await mk("angular", "angular-components", "Angular 21 signals.");
  await mk("php", "php-language", "PHP 8.2+");
  await mk("common", "common-tdd", "no versions");
  await mk(
    "database",
    "database-postgresql",
    "PostgreSQL 16 partitioning.",
    'metadata:\n  upstream:\n    - name: postgresql\n      source: github\n      repo: postgres/postgres\n      pinned: "16"\n      reviewed: "2026-09-01"\n',
  );
  await fs.ensureDir(path.join(skills, "nextjs", "references"));
  await writeFile(path.join(skills, "nextjs", "references", "framework-map.md"), "# Map\n\nReviewed: 2026-06-17\n");
  await fs.ensureDir(path.join(skills, "angular", "references"));
  await writeFile(path.join(skills, "angular", "references", "framework-map.md"), "# Map\n\nReviewed: 2026-07-09\n");
  await fs.writeJson(path.join(skills, "metadata.json"), {
    categories: {
      nextjs: { version: "1", upstream: [{ name: "next", source: "github", repo: "vercel/next.js", pinned: "15.3.0", reviewed: "2026-06-17" }] },
      java: { version: "1", upstream: [{ name: "java", source: "github", repo: "openjdk/jdk", pinned: "21", reviewed: "2026-09-01" }] },
      angular: { version: "1", upstream: [{ name: "angular", source: "github", repo: "angular/angular", pinned: "20.0.0", reviewed: "2026-09-01" }] },
      php: { version: "1" },
      common: { version: "1" },
      database: { version: "1" },
    },
  });
  return { root, cleanup: () => fs.remove(root) };
}

test("daysBetween counts whole days", () => {
  assert.equal(daysBetween("2026-06-17", TODAY), 89);
});

test("readFrameworkMapReviewed parses the Reviewed line", async () => {
  const { root, cleanup } = await fixture();
  try {
    assert.equal(readFrameworkMapReviewed(path.join(root, "skills", "nextjs")), "2026-06-17");
    assert.equal(readFrameworkMapReviewed(path.join(root, "skills", "java")), null);
  } finally {
    await cleanup();
  }
});

test("auditFreshness emits the expected issue set", async () => {
  const { root, cleanup } = await fixture();
  try {
    const issues = auditFreshness(root, { staleDays: 60, today: TODAY });
    const key = (i: { type: string; category: string; skillName: string; upstream?: string }) =>
      `${i.type}:${i.category}:${i.skillName}:${i.upstream ?? ""}`;
    const keys = issues.map(key).sort();
    assert.deepEqual(keys, [
      "claim-ahead-of-pin:angular:angular-components:angular",
      "claim-behind-pin:nextjs:nextjs-legacy:next",
      "missing-pin:php::",
      "reviewed-mismatch:angular::angular",
      "reviewed-stale:nextjs::next",
    ]);
    const behind = issues.find((i) => i.type === "claim-behind-pin");
    assert.equal(behind?.severity, "med");
    assert.equal(behind?.file, "skills/nextjs/nextjs-legacy/SKILL.md");
    assert.equal(behind?.line, 1);
    assert.equal(issues.find((i) => i.type === "missing-pin")?.severity, "low");
  } finally {
    await cleanup();
  }
});
