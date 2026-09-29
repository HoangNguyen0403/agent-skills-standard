import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildManifest, scopeForTag } from "./manifest";

test("scopeForTag resolves scopes correctly and throws on unrecognized tags", () => {
  assert.equal(scopeForTag("workflows-v1.0.0"), ".agents/workflows");
  assert.equal(scopeForTag("specialists-v2.1.0"), "skills/specialists");
  assert.equal(scopeForTag("react-native-v1.2.3"), "skills/react-native");

  assert.throws(
    () => scopeForTag("nope"),
    /Unrecognized release tag: nope/,
  );
});

test("buildManifest scopes files, includes nested files, calculates sha256 and sorts keys", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-test-"));
  try {
    const files = {
      "skills/typescript/a/SKILL.md": "Content of TS A",
      "skills/typescript/a/references/r.md": "Content of TS Reference",
      "skills/typescript/b/SKILL.md": "Content of TS B",
      "skills/react/x/SKILL.md": "Content of React X",
    };

    for (const [relPath, content] of Object.entries(files)) {
      const fullPath = path.join(tempDir, relPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content, "utf8");
    }

    const manifest = buildManifest(tempDir, "typescript-v1.0.0", "abcdef123456");

    assert.equal(manifest.schema_version, 1);
    assert.equal(manifest.tag, "typescript-v1.0.0");
    assert.equal(manifest.commit, "abcdef123456");

    const expectedKeys = [
      "skills/typescript/a/SKILL.md",
      "skills/typescript/a/references/r.md",
      "skills/typescript/b/SKILL.md",
    ].sort();

    assert.deepEqual(Object.keys(manifest.files), expectedKeys);

    for (const key of expectedKeys) {
      const expectedHash = createHash("sha256")
        .update(files[key as keyof typeof files], "utf8")
        .digest("hex");
      assert.equal(manifest.files[key], expectedHash);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("buildManifest produces byte-identical JSON for the same inputs", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-test-"));
  try {
    const f1 = path.join(tempDir, "skills/test/z.txt");
    const f2 = path.join(tempDir, "skills/test/a.txt");
    fs.mkdirSync(path.dirname(f1), { recursive: true });
    fs.writeFileSync(f1, "Z file", "utf8");
    fs.writeFileSync(f2, "A file", "utf8");

    const manifest1 = buildManifest(tempDir, "test-v1.0.0", "commit-123");
    const manifest2 = buildManifest(tempDir, "test-v1.0.0", "commit-123");

    assert.equal(JSON.stringify(manifest1), JSON.stringify(manifest2));
    assert.deepEqual(Object.keys(manifest1.files), [
      "skills/test/a.txt",
      "skills/test/z.txt",
    ]);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("buildManifest throws when scope folder does not exist", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-test-"));
  try {
    assert.throws(
      () => buildManifest(tempDir, "ghost-v1.0.0", "commit-123"),
      /Release scope skills\/ghost not found for tag ghost-v1.0.0/,
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("buildManifest throws when scope folder has no files", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-test-"));
  try {
    fs.mkdirSync(path.join(tempDir, "skills/empty"), { recursive: true });
    assert.throws(
      () => buildManifest(tempDir, "empty-v1.0.0", "commit-123"),
      /Release scope skills\/empty has no files/,
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
