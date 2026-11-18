import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  DEFAULT_PROTECTED_PATHS,
  collectChanges,
  computeSnc,
  exceedsDeclared,
  formatSnc,
  globToRegExp,
  matchesAny,
  moduleOf,
  parseNameStatusZ,
  parseNumStatZ,
  run,
  tierFor,
  withUntracked,
  type FileChange,
} from "./snc-from-diff";

const change = (
  path: string,
  status: FileChange["status"],
  added: number,
  deleted: number,
): FileChange => ({ path, status, added, deleted });

test("moduleOf uses the first path segment; container dirs keep their child", () => {
  assert.equal(moduleOf("cli/src/index.ts"), "cli");
  assert.equal(moduleOf("skills/common/x.md"), "skills/common");
  assert.equal(moduleOf("services/order/total.ts"), "services/order");
  assert.equal(moduleOf("package.json"), "package.json");
});

test("globToRegExp handles **, *, and ? without crossing a segment for *", () => {
  assert.ok(globToRegExp("**/auth/**").test("src/auth/session.ts"));
  assert.ok(globToRegExp("**/*.sql").test("db/migrations/001_init.sql"));
  assert.ok(globToRegExp("**/payment*/**").test("services/payment-gateway/charge.ts"));
  assert.equal(globToRegExp("src/*.ts").test("src/nested/deep.ts"), false);
  assert.equal(globToRegExp("a?.ts").test("ab.ts"), true);
});

test("matchesAny defaults catch auth and SQL but not lookalike paths", () => {
  assert.equal(matchesAny("src/auth/token.ts", DEFAULT_PROTECTED_PATHS), true);
  assert.equal(matchesAny("db/001_init.sql", DEFAULT_PROTECTED_PATHS), true);
  assert.equal(matchesAny("src/authz/token.ts", DEFAULT_PROTECTED_PATHS), false);
  assert.equal(matchesAny("docs/readme.md", DEFAULT_PROTECTED_PATHS), false);
});

test("spread: one file = 0, one module = 1, cross-module = 2", () => {
  assert.equal(computeSnc([change("cli/a.ts", "M", 1, 1)]).s, 0);
  assert.equal(
    computeSnc([change("cli/a.ts", "M", 1, 1), change("cli/b.ts", "M", 1, 1)]).s,
    1,
  );
  assert.equal(
    computeSnc([change("cli/a.ts", "M", 1, 1), change("server/b.ts", "M", 1, 1)]).s,
    2,
  );
});

test("novelty: new file = 2, deletions = 0, small edit = 0, modified logic = 1", () => {
  assert.equal(computeSnc([change("cli/new.ts", "A", 40, 0)]).n, 2);
  assert.equal(computeSnc([change("cli/old.ts", "D", 0, 40)]).n, 0);
  assert.equal(computeSnc([change("cli/small.ts", "M", 1, 2)]).n, 0);
  assert.equal(computeSnc([change("cli/logic.ts", "M", 20, 20)]).n, 1);
  assert.equal(computeSnc([change("cli/growth.ts", "M", 70, 30)]).n, 2);
});

test("centrality: protected = 2, shared = 1, peripheral = 0", () => {
  assert.equal(computeSnc([change("src/security/policy.ts", "M", 5, 5)]).c, 2);
  assert.equal(computeSnc([change("src/common/helpers.ts", "M", 5, 5)]).c, 1);
  assert.equal(computeSnc([change("docs/readme.md", "M", 5, 5)]).c, 0);
});

test("centrality honours configured protected globs", () => {
  const score = computeSnc([change("src/ledger/posting.ts", "M", 5, 5)], {
    protectedPaths: ["src/ledger/**"],
  });
  assert.equal(score.c, 2);
});

test("tierFor enforces the sensitive-change floor", () => {
  assert.equal(tierFor(0, 0, 2, 2), "medium");
  assert.equal(tierFor(0, 1, 2, 3), "high");
  assert.equal(tierFor(1, 0, 2, 3), "high");
  assert.equal(tierFor(2, 1, 2, 5), "high");
  assert.equal(tierFor(1, 1, 1, 3), "medium");
  assert.equal(tierFor(0, 0, 0, 0), "low");
});

test("computeSnc scores a cross-module sensitive rewrite as high", () => {
  const score = computeSnc([
    change("services/order/total.ts", "M", 40, 5),
    change("services/auth/session.ts", "A", 80, 0),
  ]);
  assert.deepEqual(score, { s: 2, n: 2, c: 2, total: 6, tier: "high" });
});

test("formatSnc matches the canonical SNC line", () => {
  assert.equal(
    formatSnc({ s: 1, n: 1, c: 1, total: 3, tier: "medium" }),
    "SNC: S=1 N=1 C=1 total=3 tier=medium",
  );
});

test("exceedsDeclared only fires upward", () => {
  assert.equal(exceedsDeclared("high", "low"), true);
  assert.equal(exceedsDeclared("medium", "medium"), false);
  assert.equal(exceedsDeclared("low", "high"), false);
});

test("NUL parsers preserve Unicode and newline filenames", () => {
  const statuses = parseNameStatusZ(
    ["A", "src/é.ts", "M", "src/old.ts", "R100", "src/a.ts", "src/新\nname.ts", ""].join("\0"),
  );
  assert.equal(statuses.get("src/é.ts"), "A");
  assert.equal(statuses.get("src/old.ts"), "M");
  assert.equal(statuses.get("src/新\nname.ts"), "R");

  const changes = parseNumStatZ(
    ["12\t0\tsrc/é.ts", "3\t4\tsrc/old.ts", "-\t-\tsrc/新\nname.ts", ""].join("\0"),
    statuses,
  );
  assert.deepEqual(changes, [
    { path: "src/é.ts", status: "A", added: 12, deleted: 0 },
    { path: "src/old.ts", status: "M", added: 3, deleted: 4 },
    { path: "src/新\nname.ts", status: "R", added: 0, deleted: 0 },
  ]);
});

test("collectChanges reads real untracked Unicode and newline filenames", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "snc-diff-"));
  const cwd = process.cwd();
  try {
    execFileSync("git", ["init", "-q"], { cwd: repo });
    fs.writeFileSync(path.join(repo, "base.txt"), "base\n");
    execFileSync("git", ["add", "base.txt"], { cwd: repo });
    execFileSync(
      "git",
      ["-c", "user.email=t@example.com", "-c", "user.name=t", "commit", "-qm", "init"],
      { cwd: repo },
    );
    fs.mkdirSync(path.join(repo, "src", "auth"), { recursive: true });
    fs.writeFileSync(path.join(repo, "src", "auth", "é.ts"), "x\n");
    fs.writeFileSync(path.join(repo, "src", "auth", "new\nline.ts"), "y\nz\n");

    process.chdir(repo);
    const changes = collectChanges("HEAD");
    const paths = changes.map((entry) => entry.path).sort();
    assert.deepEqual(paths, ["src/auth/new\nline.ts", "src/auth/é.ts"]);
    for (const entry of changes) {
      assert.equal(entry.status, "A");
      assert.equal(entry.added, entry.path.includes("new") ? 2 : 1);
    }
  } finally {
    process.chdir(cwd);
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("untracked sensitive file scores as added and raises centrality and tier", () => {
  const base = [change("cli/a.ts", "M", 1, 1)];
  assert.equal(computeSnc(base).tier, "low");

  const merged = withUntracked(base, ["src/auth/new-token.ts"], () => 30);
  assert.deepEqual(merged.at(-1), {
    path: "src/auth/new-token.ts",
    status: "A",
    added: 30,
    deleted: 0,
  });
  assert.equal(merged.length, 2, "already-tracked paths are not duplicated");

  const score = computeSnc(merged);
  assert.equal(score.c, 2);
  assert.equal(score.tier, "high");
});

test("withUntracked ignores duplicate and empty untracked paths", () => {
  const merged = withUntracked([change("cli/a.ts", "M", 1, 1)], ["cli/a.ts", ""], () => 10);
  assert.deepEqual(merged, [change("cli/a.ts", "M", 1, 1)]);
});

function silently(operation: () => number): number {
  const original = console.error;
  console.error = () => {};
  try {
    return operation();
  } finally {
    console.error = original;
  }
}

test("run exits 2 when a flag has no value", () => {
  assert.equal(silently(() => run(["--declared"])), 2);
  assert.equal(silently(() => run(["--base"])), 2);
});

test("run exits 2 for inherited-property names and unknown flags", () => {
  assert.equal(silently(() => run(["--declared", "toString"])), 2);
  assert.equal(silently(() => run(["--declared", "constructor"])), 2);
  assert.equal(silently(() => run(["--declared", "LOW"])), 2);
  assert.equal(silently(() => run(["--wat"])), 2);
});
