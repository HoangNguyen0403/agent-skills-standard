// scripts/metrics/pr-baseline.test.ts
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildBaseline,
  classifyPath,
  GENERATED_PATH_GLOBS,
  main,
  parseArgs,
  parseFilesTsv,
  parsePullList,
  parseRepoRemote,
  parseReviewCount,
  percentile,
  resolveRepo,
  type BaselineWindow,
  type FetchResult,
  type GhRunner,
  type PrFetcher,
  type RawPullFile,
  type RawPullRequest,
} from "./pr-baseline";

const WINDOW: BaselineWindow = { mode: "limit", limit: 100 };

function pull(number: number, createdAt: string, mergedAt: string): RawPullRequest {
  return { number, createdAt, mergedAt };
}

function file(filename: string, additions: number, deletions = 0): RawPullFile {
  return { filename, additions, deletions };
}

interface FakeData {
  list: FetchResult<RawPullRequest[]>;
  files: Record<number, FetchResult<RawPullFile[]>>;
  reviews: Record<number, FetchResult<number>>;
}

function fakeFetcher(data: FakeData): PrFetcher {
  return {
    listMergedPullRequests: async () => data.list,
    pullFiles: async (_repo, number) => data.files[number] ?? { available: false, reason: "not stubbed" },
    pullReviewCount: async (_repo, number) => data.reviews[number] ?? { available: false, reason: "not stubbed" },
  };
}

test("classifyPath sends export mirrors and indexes to generated, authored sources stay authored", () => {
  const generated = [
    ".claude/skills/common/common-tdd/SKILL.md",
    ".claude/commands/dev-fix.md",
    ".claude/agents/reviewer.md",
    ".github/skills/typescript/typescript-language/SKILL.md",
    ".github/instructions/typescript.instructions.md",
    ".github/prompts/dev-fix.prompt.md",
    ".github/agents/reviewer.md",
    ".agents/skills/common/common-tdd/SKILL.md",
    ".agents/rules/typescript.md",
    ".codex/skills/common/common-tdd/SKILL.md",
    ".codex/agents/reviewer.toml",
    "skills/index.json",
    "skills/metadata.json",
    "skills/README.md",
    "skills/common/_INDEX.md",
    "artifacts/agent-review-trust/evidence/manifest.json",
    "benchmarks/history.json",
    "benchmark-report.md",
    "evals-report.md",
    "pnpm-lock.yaml",
    ".skills-lock.json",
  ];
  for (const candidate of generated) assert.equal(classifyPath(candidate), "generated", candidate);

  const authored = [
    "skills/common/common-tdd/SKILL.md",
    "skills/common/common-tdd/references/quality-contract.md",
    ".agents/workflows/design-solution.md",
    "scripts/metrics/pr-baseline.ts",
    ".github/workflows/ci.yml",
    "package.json",
    // Mixed files: the generator appends or merges, so hand-authored content survives.
    "CLAUDE.md",
    ".claude/settings.json",
    ".github/hooks.json",
    ".codex/hooks.json",
    ".codex/config.toml",
    "AGENTS.md",
  ];
  for (const candidate of authored) assert.equal(classifyPath(candidate), "authored", candidate);
});

test("GENERATED_PATH_GLOBS is declared once and exported for the report", () => {
  assert.ok(GENERATED_PATH_GLOBS.includes("skills/index.json"));
  assert.ok(GENERATED_PATH_GLOBS.includes(".claude/skills/**"));
  assert.equal(new Set(GENERATED_PATH_GLOBS).size, GENERATED_PATH_GLOBS.length);
});

test("percentile uses linear interpolation and returns null for an empty sample", () => {
  assert.equal(percentile([1, 2, 3, 4], 50), 2.5);
  assert.equal(percentile([1, 2, 3, 4], 75), 3.25);
  assert.equal(percentile([1, 2, 3, 4], 90), 3.7);
  assert.equal(percentile([9], 90), 9);
  assert.equal(percentile([], 50), null);
  assert.throws(() => percentile([1], 101), /out of range/);
});

test("buildBaseline sums additions plus deletions, splits classifications, counts reviews, and derives hours", async () => {
  const fetcher = fakeFetcher({
    list: {
      available: true,
      value: [
        pull(1, "2026-01-01T00:00:00Z", "2026-01-01T01:30:00Z"),
        pull(2, "2026-01-02T00:00:00Z", "2026-01-02T05:00:00Z"),
      ],
    },
    files: {
      1: {
        available: true,
        value: [file("scripts/a.ts", 100, 20), file(".claude/skills/x/SKILL.md", 900, 30)],
      },
      2: { available: true, value: [file("skills/common/_INDEX.md", 0, 40), file("scripts/b.ts", 60, 0)] },
    },
    reviews: { 1: { available: true, value: 0 }, 2: { available: true, value: 2 } },
  });

  const baseline = await buildBaseline("owner/repo", WINDOW, fetcher);

  assert.equal(baseline.prs[0].authoredLines, 120);
  assert.equal(baseline.prs[0].generatedLines, 930);
  assert.equal(baseline.prs[0].reviewCount, 0);
  assert.equal(baseline.prs[0].hoursToMerge, 1.5);
  assert.equal(baseline.prs[1].authoredLines, 60);
  assert.equal(baseline.prs[1].generatedLines, 40);
  assert.equal(baseline.prs[1].hoursToMerge, 5);
  assert.equal(baseline.summary.count, 2);
  assert.equal(baseline.summary.excludedFromMedians, 0);
  assert.equal(baseline.summary.authoredLines.median, 90);
  assert.equal(baseline.summary.authoredLines.p90, 114);
  assert.equal(baseline.summary.authoredLines.total, 180);
  assert.equal(baseline.summary.generatedLines.median, 485);
  assert.equal(baseline.summary.generatedLines.total, 970);
  assert.equal(baseline.summary.hoursToMerge.median, 3.25);
  assert.equal(baseline.summary.hoursToMerge.p75, 4.13);
  assert.equal(baseline.summary.hoursToMerge.sampleSize, 2);
  assert.equal(baseline.summary.zeroReviewCount, 1);
  assert.equal(baseline.summary.mergedUnder2h, 1);
});

test("buildBaseline marks an unfetchable PR unavailable, never zero, and excludes it from medians", async () => {
  const fetcher = fakeFetcher({
    list: {
      available: true,
      value: [
        pull(1, "2026-01-01T00:00:00Z", "2026-01-01T01:00:00Z"),
        pull(2, "2026-01-02T00:00:00Z", "2026-01-02T09:00:00Z"),
        pull(3, "2026-01-03T00:00:00Z", "2026-01-03T01:30:00Z"),
      ],
    },
    files: {
      1: { available: true, value: [file("scripts/a.ts", 0, 15)] },
      2: { available: false, reason: "HTTP 502" },
      3: { available: true, value: [file("scripts/c.ts", 30, 0)] },
    },
    reviews: {
      1: { available: false, reason: "HTTP 404" },
      2: { available: true, value: 1 },
      3: { available: true, value: 0 },
    },
  });

  const baseline = await buildBaseline("owner/repo", WINDOW, fetcher);

  assert.equal(baseline.prs[0].authoredLines, 15);
  assert.equal(baseline.prs[1].authoredLines, "unavailable");
  assert.equal(baseline.prs[1].generatedLines, "unavailable");
  assert.equal(baseline.prs[1].reviewCount, 1);
  assert.equal(baseline.prs[0].reviewCount, "unavailable");
  assert.equal(baseline.summary.authoredLines.sampleSize, 2);
  assert.equal(baseline.summary.authoredLines.median, 22.5);
  assert.equal(baseline.summary.authoredLines.total, 45);
  assert.equal(baseline.summary.excludedFromMedians, 1);
  assert.equal(baseline.summary.hoursToMerge.median, 1.5);
  assert.equal(baseline.summary.hoursToMerge.p75, 5.25);
  assert.equal(baseline.summary.hoursToMerge.sampleSize, 3);
  assert.equal(baseline.summary.zeroReviewCount, 1);
  assert.equal(baseline.summary.mergedUnder2h, 2);
});

test("buildBaseline keeps unavailable collection totals null", async () => {
  const unavailableList = await buildBaseline(
    "owner/repo",
    WINDOW,
    fakeFetcher({
      list: { available: false, reason: "gh: not authenticated" },
      files: {},
      reviews: {},
    }),
  );

  assert.equal(unavailableList.listUnavailable, "gh: not authenticated");
  assert.deepEqual(unavailableList.prs, []);
  assert.equal(unavailableList.summary.count, 0);
  assert.equal(unavailableList.summary.authoredLines.total, null);
  assert.equal(unavailableList.summary.generatedLines.total, null);
  assert.equal(unavailableList.summary.authoredLines.sampleSize, 0);
  assert.equal(unavailableList.summary.excludedFromMedians, 0);
});

test("buildBaseline reports successful empty list as observed zero", async () => {
  const baseline = await buildBaseline(
    "owner/repo",
    WINDOW,
    fakeFetcher({
      list: { available: true, value: [] },
      files: {},
      reviews: {},
    }),
  );

  assert.equal(baseline.listUnavailable, null);
  assert.equal(baseline.summary.count, 0);
  assert.equal(baseline.summary.authoredLines.total, 0);
  assert.equal(baseline.summary.generatedLines.total, 0);
  assert.equal(baseline.summary.authoredLines.sampleSize, 0);
  assert.equal(baseline.summary.excludedFromMedians, 0);
});

test("buildBaseline keeps line totals unavailable when every file fetch fails", async () => {
  const baseline = await buildBaseline(
    "owner/repo",
    WINDOW,
    fakeFetcher({
      list: {
        available: true,
        value: [pull(1, "2026-01-01T00:00:00Z", "2026-01-01T01:00:00Z")],
      },
      files: { 1: { available: false, reason: "HTTP 502" } },
      reviews: { 1: { available: true, value: 0 } },
    }),
  );

  assert.equal(baseline.summary.authoredLines.total, null);

  assert.equal(baseline.summary.generatedLines.total, null);
  assert.equal(baseline.summary.authoredLines.sampleSize, 0);
  assert.equal(baseline.summary.generatedLines.sampleSize, 0);
  assert.equal(baseline.summary.excludedFromMedians, 1);
});

test("parseRepoRemote accepts only supported GitHub remote forms", () => {
  assert.equal(parseRepoRemote("https://github.com/owner/repo.git"), "owner/repo");
  assert.equal(parseRepoRemote("https://github.com/owner/repo"), "owner/repo");
  assert.equal(parseRepoRemote("ssh://git@github.com/owner/repo.git"), "owner/repo");
  assert.equal(parseRepoRemote("ssh://git@github.com/owner/repo"), "owner/repo");
  assert.equal(parseRepoRemote("git@github.com:owner/repo.git"), "owner/repo");
  assert.equal(parseRepoRemote("git@github.com:owner/repo"), "owner/repo");
});

test("parseRepoRemote rejects local paths, unsupported hosts, and malformed names", () => {
  for (const remote of [
    "/srv/git/project.git",
    "https://github.com/project.git",
    "https://gitlab.com/owner/repo.git",
    "ssh://git@gitlab.com/owner/repo.git",
    "git@gitlab.com:owner/repo.git",
    "https://github.com/owner",
    "https://github.com/owner/repo/extra",
    "https://github.com/owner//repo",
    "https://github.com/-owner/repo",
    "https://github.com/owner/-repo",
    "https://github.com/owner/repo?tab=readme",
    "https://github.com:443/owner/repo",
    "not a url",
  ]) {
    assert.equal(parseRepoRemote(remote), undefined, remote);
  }
});
test("buildBaseline reports an unreachable PR list without failing the run", async () => {
  const baseline = await buildBaseline(
    "owner/repo",
    WINDOW,
    fakeFetcher({
      list: { available: false, reason: "gh: not authenticated" },
      files: {},
      reviews: {},
    }),
  );

  assert.equal(baseline.listUnavailable, "gh: not authenticated");
  assert.deepEqual(baseline.prs, []);
  assert.equal(baseline.summary.count, 0);
  assert.equal(baseline.summary.authoredLines.median, null);
  assert.equal(baseline.summary.authoredLines.total, null);
  assert.equal(baseline.summary.generatedLines.total, null);
  assert.equal(baseline.summary.hoursToMerge.median, null);
  assert.equal(baseline.summary.hoursToMerge.sampleSize, 0);
});

test("parsePullList rejects malformed PR payloads", () => {
  assert.deepEqual(parsePullList("[]"), []);
  assert.throws(() => parsePullList("not json"), /not JSON/);
  assert.throws(() => parsePullList("{}"), /expected an array/);
  assert.throws(() => parsePullList('[{"number":1,"createdAt":"2026-01-01T00:00:00Z"}]'), /mergedAt/);
  assert.throws(
    () => parsePullList('[{"number":1,"createdAt":"2026-01-02T00:00:00Z","mergedAt":"2026-01-01T00:00:00Z"}]'),
    /precedes/,
  );
});

test("parseFilesTsv and parseReviewCount reject malformed rows", () => {
  assert.deepEqual(parseFilesTsv("a.ts\t4\t2\nskills/index.json\t10\t0\n"), [
    file("a.ts", 4, 2),
    file("skills/index.json", 10, 0),
  ]);
  assert.throws(() => parseFilesTsv("a.ts\tnope\t0\n"), /additions/);
  assert.throws(() => parseFilesTsv("a.ts\t4\tnope\n"), /deletions/);
  assert.throws(() => parseFilesTsv("a.ts\t4\n"), /malformed PR file row/);
  assert.equal(parseReviewCount("APPROVED\nCOMMENTED\n"), 2);
  assert.throws(() => parseReviewCount("approved by bob\n"), /malformed PR review state/);
});

test("parseArgs validates the CLI surface", () => {
  assert.deepEqual(parseArgs([]), { limit: 100, out: "artifacts/agent-factory-controls/baseline.json" });
  assert.equal(parseArgs(["--since", "2026-01-01"]).limit, 1000);
  assert.equal(parseArgs(["--since", "2026-01-01", "--limit", "5"]).limit, 5);
  assert.equal(parseArgs(["--repo=owner/repo", "--out", "-"]).repo, "owner/repo");
  assert.throws(() => parseArgs(["--limit", "0"]), /positive integer/);
  assert.throws(() => parseArgs(["--since", "2026-13-01"]), /YYYY-MM-DD/);
  assert.throws(() => parseArgs(["--repo", "nope"]), /owner\/name/);
  assert.throws(() => parseArgs(["--wat"]), /unknown argument/);
});

test("resolveRepo prefers the local git remote and degrades to unavailable, never exit 1", async () => {
  assert.equal(parseRepoRemote("https://github.com/owner/repo.git"), "owner/repo");
  assert.equal(parseRepoRemote("git@github.com:owner/repo.git"), "owner/repo");
  assert.equal(parseRepoRemote("ssh://git@github.com/owner/repo"), "owner/repo");
  assert.equal(parseRepoRemote("not a url"), undefined);

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "pr-baseline-repo-"));
  execFileSync("git", ["init", "-q"], { cwd: workDir, stdio: "ignore" });
  execFileSync("git", ["remote", "add", "origin", "git@github.com:owner/local-repo.git"], {
    cwd: workDir,
    stdio: "ignore",
  });

  const throwing: GhRunner = () => {
    throw new Error("gh: not authenticated");
  };
  assert.deepEqual(resolveRepo(throwing, workDir), { available: true, value: "owner/local-repo" });

  execFileSync("git", ["remote", "set-url", "origin", "/srv/git/project.git"], { cwd: workDir, stdio: "ignore" });
  let fallbackCalled = false;
  const fallback: GhRunner = (args) => {
    fallbackCalled = true;
    assert.deepEqual(args, ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
    return "fallback/repo";
  };
  assert.deepEqual(resolveRepo(fallback, workDir), { available: true, value: "fallback/repo" });
  assert.equal(fallbackCalled, true);

  const noGit = fs.mkdtempSync(path.join(os.tmpdir(), "pr-baseline-nogit-"));
  assert.deepEqual(resolveRepo(throwing, noGit), { available: false, reason: "gh: not authenticated" });

  const out = path.join(noGit, "baseline.json");
  const code = await main(["--out", out], {
    fetcher: fakeFetcher({ list: { available: false, reason: "should not be called" }, files: {}, reviews: {} }),
    runGh: throwing,
    cwd: noGit,
  });
  assert.equal(code, 0);
  const written = JSON.parse(fs.readFileSync(out, "utf8")) as {
    repo: null;
    listUnavailable: string;
    prs: unknown[];
    summary: { count: number };
  };
  assert.equal(written.repo, null);
  assert.equal(written.listUnavailable, "gh: not authenticated");
  assert.deepEqual(written.prs, []);
  assert.equal(written.summary.count, 0);
});

test("main exits non-zero on malformed input and zero on a valid run", async () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "pr-baseline-"));
  const out = path.join(outDir, "baseline.json");

  const malformed = await main(["--repo", "owner/repo", "--out", out], {
    fetcher: fakeFetcher({
      list: { available: true, value: [{ number: 0 } as RawPullRequest] },
      files: {},
      reviews: {},
    }),
  });
  assert.equal(malformed, 1);

  const writeOut = (target: string, contents: string) => fs.writeFileSync(target, contents, "utf8");
  const ok = await main(["--repo", "owner/repo", "--out", out], {
    fetcher: fakeFetcher({
      list: { available: true, value: [pull(1, "2026-01-01T00:00:00Z", "2026-01-01T01:00:00Z")] },
      files: { 1: { available: true, value: [file("scripts/a.ts", 5)] } },
      reviews: { 1: { available: true, value: 0 } },
    }),
    writeOut,
  });
  assert.equal(ok, 0);
  const contents = fs.readFileSync(out, "utf8");
  const written = JSON.parse(contents) as { summary: { count: number }; prs: unknown[] };
  assert.equal(written.summary.count, 1);
  assert.equal(written.prs.length, 1);
  assert.doesNotMatch(contents, /"(title|body|author|comments)"/);
});
