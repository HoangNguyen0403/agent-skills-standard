import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import fs from "fs-extra";
import { effectivePins, isUpstreamEntry, loadCategoryPins } from "./pins";
import type { SkillRecord } from "./types";

const next = {
  name: "next",
  source: "github" as const,
  repo: "vercel/next.js",
  pinned: "15.3.0",
  reviewed: "2026-06-17",
};

function skill(category: string, name: string, upstream?: unknown): SkillRecord {
  return {
    category,
    name,
    dir: `/tmp/${category}/${name}`,
    skillPath: `/tmp/${category}/${name}/SKILL.md`,
    frontmatter: { name, metadata: upstream ? { upstream } : {} },
    body: "",
  };
}

test("loadCategoryPins returns every category, empty when no upstream", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ags-pins-"));
  const metadataPath = path.join(root, "metadata.json");
  await fs.writeJson(metadataPath, {
    categories: {
      nextjs: { version: "1.0.0", upstream: [next] },
      common: { version: "1.0.0" },
    },
  });
  try {
    const pins = loadCategoryPins(metadataPath);
    assert.deepEqual([...pins.keys()].sort(), ["common", "nextjs"]);
    assert.deepEqual(pins.get("common"), []);
    assert.equal(pins.get("nextjs")?.[0].repo, "vercel/next.js");
  } finally {
    await fs.remove(root);
  }
});

test("effectivePins merges category and skill pins, skill wins on same name", () => {
  const categoryPins = new Map([["nextjs", [next]]]);
  const override = { ...next, pinned: "16.0.0", reviewed: "2026-09-01" };
  const extra = { name: "react", source: "github", repo: "facebook/react", pinned: "19.1.0", reviewed: "2026-09-01" };
  const pins = effectivePins(skill("nextjs", "nextjs-app-router", [override, extra]), categoryPins);
  assert.equal(pins.length, 2);
  const nextPin = pins.find((p) => p.name === "next");
  assert.equal(nextPin?.pinned, "16.0.0");
  assert.equal(nextPin?.origin, "skill");
  assert.equal(pins.find((p) => p.name === "react")?.origin, "skill");
});

test("effectivePins ignores malformed skill entries", () => {
  const categoryPins = new Map([["nextjs", [next]]]);
  const pins = effectivePins(skill("nextjs", "x", [{ name: "bad" }]), categoryPins);
  assert.equal(pins.length, 1);
  assert.equal(pins[0].origin, "category");
});

test("isUpstreamEntry requires repo for github source", () => {
  assert.equal(isUpstreamEntry(next), true);
  assert.equal(isUpstreamEntry({ ...next, repo: undefined }), false);
  assert.equal(isUpstreamEntry({ name: "ios", source: "manual", pinned: "17", reviewed: "2026-07-09" }), true);
});
