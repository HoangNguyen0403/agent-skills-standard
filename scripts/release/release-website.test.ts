import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  buildWebsiteReleasePlan,
  buildWebsiteTagName,
  buildWebsiteVersionChoices,
  parseSemver,
  resolveFilesToStage,
} from "../release-website";

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const WEBSITE_PKG_PATH = path.join(ROOT_DIR, "website", "package.json");
const RELEASE_SCRIPT_PATH = path.join(
  ROOT_DIR,
  "scripts",
  "release-website.ts",
);

test("parseSemver parses valid X.Y.Z strings and rejects invalid versions", () => {
  assert.deepEqual(parseSemver("0.1.0"), [0, 1, 0]);
  assert.deepEqual(parseSemver("12.34.56"), [12, 34, 56]);

  for (const invalid of ["v1.0.0", "1.2", "abc", "1.2.3-beta", "0.1.0 ", ""]) {
    assert.throws(() => parseSemver(invalid), /X\.Y\.Z/);
  }
});

test("buildWebsiteVersionChoices computes patch, minor, major, and custom options", () => {
  assert.deepEqual(buildWebsiteVersionChoices("0.1.0"), [
    { name: "Patch (0.1.1)", value: "0.1.1" },
    { name: "Minor (0.2.0)", value: "0.2.0" },
    { name: "Major (1.0.0)", value: "1.0.0" },
    { name: "Custom Input", value: "custom" },
  ]);
});

test("buildWebsiteTagName formats website-vX.Y.Z tags and validates semver", () => {
  assert.equal(buildWebsiteTagName("0.1.1"), "website-v0.1.1");
  assert.throws(() => buildWebsiteTagName("v0.1.1"), /X\.Y\.Z/);
});

test("resolveFilesToStage stages only explicit website release artifacts", () => {
  assert.deepEqual(resolveFilesToStage(false), ["website/package.json"]);
  assert.deepEqual(resolveFilesToStage(true), [
    "website/package.json",
    "CHANGELOG.md",
  ]);
});

test("buildWebsiteReleasePlan builds transitions, staged files, commit message, and push commands", () => {
  const withoutChangelog = buildWebsiteReleasePlan({
    currentVersion: "0.1.0",
    nextVersion: "0.1.1",
    notes: "",
    hasChangelog: false,
  });

  assert.deepEqual(withoutChangelog, {
    currentVersion: "0.1.0",
    nextVersion: "0.1.1",
    tagName: "website-v0.1.1",
    commitMessage: "chore(release): website-v0.1.1",
    filesToStage: ["website/package.json"],
    notes: "",
    pushCommands: [
      ["git", "push"],
      ["git", "push", "origin", "website-v0.1.1"],
    ],
  });

  const withChangelog = buildWebsiteReleasePlan({
    currentVersion: "0.1.0",
    nextVersion: "0.2.0",
    notes: "### Added\n- Cloudflare Pages workflow",
    hasChangelog: true,
  });

  assert.deepEqual(withChangelog, {
    currentVersion: "0.1.0",
    nextVersion: "0.2.0",
    tagName: "website-v0.2.0",
    commitMessage: "chore(release): website-v0.2.0",
    filesToStage: ["website/package.json", "CHANGELOG.md"],
    notes: "### Added\n- Cloudflare Pages workflow",
    pushCommands: [
      ["git", "push"],
      ["git", "push", "origin", "website-v0.2.0"],
    ],
  });
});

test("CLI --dry-run exits 0, previews website-v0.1.1, and leaves website/package.json untouched", () => {
  const beforePkg = fs.readFileSync(WEBSITE_PKG_PATH, "utf-8");

  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      RELEASE_SCRIPT_PATH,
      "--dry-run",
      "--version",
      "0.1.1",
      "--no-changelog",
      "--no-edit",
    ],
    {
      cwd: ROOT_DIR,
      encoding: "utf-8",
    },
  );

  const afterPkg = fs.readFileSync(WEBSITE_PKG_PATH, "utf-8");
  assert.equal(afterPkg, beforePkg);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /DRY RUN/);
  assert.match(result.stdout, /website-v0\.1\.1/);
  assert.match(result.stdout, /website\/package\.json/);
});

test("CLI rejects invalid --version non-zero without mutating website/package.json", () => {
  const beforePkg = fs.readFileSync(WEBSITE_PKG_PATH, "utf-8");

  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      RELEASE_SCRIPT_PATH,
      "--dry-run",
      "--version",
      "invalid",
      "--no-changelog",
    ],
    {
      cwd: ROOT_DIR,
      encoding: "utf-8",
    },
  );

  const afterPkg = fs.readFileSync(WEBSITE_PKG_PATH, "utf-8");
  assert.equal(afterPkg, beforePkg);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /X\.Y\.Z/);
});
