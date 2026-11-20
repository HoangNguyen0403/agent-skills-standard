// scripts/pr-gate/pr-gate.test.ts
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  checkBody,
  createDeps,
  escapeWorkflowCommand,
  parseNumstat,
  renderSummaryPath,
  runGate,
  summarizeSize,
  type GateDeps,
} from "./pr-gate";

const EVENT_PATH = "/tmp/pr-gate-event.json";
const BASE_SHA = "a".repeat(40);
const HEAD_SHA = "b".repeat(40);
const MERGE_BASE_SHA = "c".repeat(40);
const REVIEW_GATE = path.resolve(
  process.cwd(),
  "skills/common/common-review-policy/scripts/review_gate.py",
);

interface HarnessInput {
  readonly event?: Record<string, unknown> | "unreadable";
  readonly numstat?: string;
  readonly mergeBase?: string;
  readonly mode?: string;
  readonly maxLines?: string;
  readonly classify?: { status: number; stdout: string; stderr: string };
}

interface Harness {
  readonly deps: GateDeps;
  readonly logs: string[];
  readonly gitCalls: string[][];
  readonly summary: () => string;
}

function pullRequest(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    body: [
      "## Requirements",
      "- REQ-AFC-05 / AC-AFC-09",
      "",
      "## Evidence",
      "- Independent review: specialist-architecture-guard, READY",
      "- Gate check: review_gate.py check: PASS (0 blockers)",
      "",
      "## Not verified",
      "- No live GitHub run before push.",
    ].join("\n"),
    labels: [{ name: "enhancement" }],
    user: { login: "author", type: "User" },
    base: { sha: BASE_SHA },
    head: { sha: HEAD_SHA },
    ...overrides,
  };
}

function harness(input: HarnessInput = {}): Harness {
  const logs: string[] = [];
  const gitCalls: string[][] = [];
  const summaryParts: string[] = [];
  const event = input.event ?? pullRequest();
  const deps: GateDeps = {
    env: {
      GITHUB_EVENT_PATH: EVENT_PATH,
      GITHUB_STEP_SUMMARY: "/tmp/pr-gate-summary.md",
      PR_GATE_MODE: input.mode,
      PR_GATE_MAX_AUTHORED_LINES: input.maxLines,
    },
    readEventFile: () => {
      if (event === "unreadable") throw new Error("ENOENT");
      return JSON.stringify({ pull_request: event });
    },
    git: (args) => {
      gitCalls.push([...args]);
      if (args[0] === "merge-base")
        return `${input.mergeBase ?? MERGE_BASE_SHA}\n`;
      return input.numstat ?? "";
    },
    classify: () =>
      input.classify ?? {
        status: 0,
        stdout: JSON.stringify({ paths: [] }),
        stderr: "",
      },
    appendSummary: (markdown) => summaryParts.push(markdown),
    log: (line) => logs.push(line),
  };
  return {
    deps,
    logs,
    gitCalls,
    summary: () => summaryParts.join(""),
  };
}

test("generated-only PR counts zero authored lines", () => {
  const result = summarizeSize(
    parseNumstat(
      "120\t0\tskills/index.json\0" +
        "40\t0\tskills/README.md\0" +
        "9\t1\tpnpm-lock.yaml\0",
    ),
  );
  assert.equal(result.authoredLines, 0);
  assert.equal(result.generatedLines, 170);
});

test("mixed PR sums only non-generated files", () => {
  const result = summarizeSize(
    parseNumstat(
      "10\t2\tscripts/pr-gate/pr-gate.ts\0" +
        "5\t0\tskills/index.json\0" +
        "1\t1\tdocs/review-policy.md\0",
    ),
  );
  assert.equal(result.authoredLines, 14);
  assert.deepEqual(
    result.authoredFiles.map((entry) => entry.path),
    ["scripts/pr-gate/pr-gate.ts", "docs/review-policy.md"],
  );
});

test("binary numstat counts zero and is listed", () => {
  const entries = parseNumstat(
    "-\t-\twebsite/hero.png\0" + "3\t1\tscripts/pr-gate/pr-gate.ts\0",
  );
  const result = summarizeSize(entries);
  assert.equal(result.authoredLines, 4);
  assert.deepEqual(
    result.binaryFiles.map((entry) => entry.path),
    ["website/hero.png"],
  );
});

test("unchanged move counts zero authored lines", () => {
  const result = summarizeSize(
    parseNumstat("0\t0\t\0legacy/place.ts\0scripts/place.ts\0"),
  );
  assert.equal(result.authoredLines, 0);
  assert.deepEqual(
    result.authoredFiles.map((entry) => entry.path),
    ["scripts/place.ts"],
  );
});

test("edited move counts its own additions and deletions", () => {
  const result = summarizeSize(
    parseNumstat("7\t2\t\0legacy/place.ts\0scripts/place.ts\0"),
  );
  assert.equal(result.authoredLines, 9);
  assert.deepEqual(
    result.authoredFiles.map((entry) => entry.path),
    ["scripts/place.ts"],
  );
});

test("rename boundaries are classified by destination path", () => {
  const generatedToAuthored = summarizeSize(
    parseNumstat(
      "0\t0\t\0skills/index.json\0scripts/generated-to-authored.ts\0",
    ),
  );
  assert.equal(generatedToAuthored.authoredLines, 0);
  assert.deepEqual(
    generatedToAuthored.authoredFiles.map((entry) => entry.path),
    ["scripts/generated-to-authored.ts"],
  );

  const authoredToGenerated = summarizeSize(
    parseNumstat("5\t0\t\0docs/readme.md\0skills/index.json\0"),
  );
  assert.equal(authoredToGenerated.authoredLines, 0);
  assert.equal(authoredToGenerated.generatedLines, 5);
  assert.deepEqual(
    authoredToGenerated.generatedFiles.map((entry) => entry.path),
    ["skills/index.json"],
  );
});

test("small PR in enforce mode exits 0", () => {
  const h = harness({
    mode: "enforce",
    numstat: "3\t1\tscripts/pr-gate/pr-gate.ts\0",
  });
  assert.equal(runGate(h.deps), 0);
  assert.deepEqual(h.logs, []);
});

test("breach in report mode warns and exits 0", () => {
  const h = harness({
    mode: "report",
    numstat: "900\t200\tscripts/pr-gate/pr-gate.ts\0",
  });
  assert.equal(runGate(h.deps), 0);
  assert.equal(h.logs.length, 1);
  assert.match(
    h.logs[0],
    /^::warning title=pr-gate::Authored lines 1100 exceed the budget of 1000/,
  );
  assert.match(h.summary(), /Authored lines: \*\*1100\*\* \/ 1000/);
});

test("breach in enforce mode errors and exits 1", () => {
  const h = harness({
    mode: "enforce",
    numstat: "900\t200\tscripts/pr-gate/pr-gate.ts\0",
  });
  assert.equal(runGate(h.deps), 1);
  assert.match(h.logs[0], /^::error title=pr-gate::/);
});

test("size-exception label turns a breach into a reported exception", () => {
  const h = harness({
    mode: "enforce",
    numstat: "900\t200\tscripts/pr-gate/pr-gate.ts\0",
    event: pullRequest({ labels: [{ name: "size-exception" }] }),
  });
  assert.equal(runGate(h.deps), 0);
  assert.deepEqual(h.logs, []);
  assert.match(h.summary(), /Size exception claimed/);
});

test("custom budget env is honored", () => {
  const h = harness({
    mode: "enforce",
    maxLines: "5",
    numstat: "4\t2\tscripts/pr-gate/pr-gate.ts\0",
  });
  assert.equal(runGate(h.deps), 1);
});

test("merge base drives the diff and the classifier, not the PR base", () => {
  const h = harness({ numstat: "1\t0\tscripts/place.ts\0" });
  assert.equal(runGate(h.deps), 0);
  assert.deepEqual(h.gitCalls[0], ["merge-base", BASE_SHA, HEAD_SHA]);
  assert.deepEqual(h.gitCalls[1], [
    "diff",
    "--numstat",
    "-z",
    "-M",
    MERGE_BASE_SHA,
    HEAD_SHA,
  ]);
  assert.doesNotMatch(h.summary(), new RegExp(BASE_SHA));
  assert.match(h.summary(), new RegExp(MERGE_BASE_SHA));
});

test("unusable merge base output exits 2", () => {
  const h = harness({ mergeBase: "not-a-sha" });
  assert.equal(runGate(h.deps), 2);
  assert.match(h.logs[0], /merge-base .* did not return a full commit OID/);
});

test("each missing body field produces one finding", () => {
  const empty = checkBody("");
  assert.deepEqual(empty.findings, [
    "`## Requirements` is missing or empty",
    "`## Evidence` section is missing",
    "`## Not verified` is missing or empty",
  ]);

  const noReview = checkBody(
    [
      "## Requirements",
      "- REQ-1",
      "## Evidence",
      "- Gate check: PASS",
      "## Not verified",
      "- none",
    ].join("\n"),
  );
  assert.deepEqual(noReview.findings, [
    "`## Evidence` lacks a non-empty `Independent review:` line",
  ]);

  const noGate = checkBody(
    [
      "## Requirements",
      "- REQ-1",
      "## Evidence",
      "- Independent review: x READY",
      "## Not verified",
      "- none",
    ].join("\n"),
  );
  assert.deepEqual(noGate.findings, [
    "`## Evidence` lacks a non-empty `Gate check:` line",
  ]);
});

test("placeholder-only and punctuation-only declarations count as empty", () => {
  const body = [
    "## Requirements",
    "<!-- Ticket: fill me -->",
    "## Evidence",
    "- Independent review: <reviewer/profile + verdict>",
    "- Gate check: <!-- result -->",
    "## Not verified",
    "<!-- none -->",
  ].join("\n");
  assert.deepEqual(checkBody(body).findings, [
    "`## Requirements` is missing or empty",
    "`## Evidence` lacks a non-empty `Independent review:` line",
    "`## Evidence` lacks a non-empty `Gate check:` line",
    "`## Not verified` is missing or empty",
  ]);

  const punctuation = [
    "## Requirements",
    "---",
    "## Evidence",
    "- Independent review: ...",
    "- Gate check: -",
    "## Not verified",
    "***",
  ].join("\n");
  assert.equal(checkBody(punctuation).findings.length, 4);
});
test("non-Latin declarations count as non-empty", () => {
  const body = [
    "## Requirements",
    "REQ-1",
    "## Evidence",
    "- Independent review: 李明，通过",
    "- Gate check: Đã duyệt",
    "## Not verified",
    "n/a",
  ].join("\n");
  assert.deepEqual(checkBody(body).findings, []);

  const none = body.replace("n/a", "none");
  assert.deepEqual(checkBody(none).findings, []);
});


test("the shipped PR templates are placeholders the checker rejects", () => {
  const reviewLine =
    "- Independent review: <!-- reviewer/profile and verdict -->";
  const gateLine =
    '- Gate check: <!-- review_gate.py check result line, or "not run: <reason>" -->';
  const templates = [
    ".github/pull_request_template.md",
    "skills/common/common-git-collaboration/references/pr-template.md",
  ].map((relative) =>
    fs.readFileSync(path.resolve(process.cwd(), relative), "utf8"),
  );

  for (const template of templates) {
    assert.ok(template.includes(reviewLine), "template review placeholder");
    assert.ok(template.includes(gateLine), "template gate placeholder");
    assert.deepEqual(checkBody(template).findings, [
      "`## Evidence` lacks a non-empty `Independent review:` line",
      "`## Evidence` lacks a non-empty `Gate check:` line",
    ]);
  }

  const filled = templates[0].replace(
    "<!-- reviewer/profile and verdict -->",
    "specialist-pr-reviewer, READY",
  );
  assert.deepEqual(checkBody(filled).findings, [
    "`## Evidence` lacks a non-empty `Gate check:` line",
  ]);
});

test("Gate check: not run is reported, not a breach", () => {
  const report = checkBody(
    [
      "## Requirements",
      "- REQ-1",
      "## Evidence",
      "- Independent review: reviewer READY",
      "- Gate check: not run: gate requires untracked run artifacts",
      "## Not verified",
      "- none",
    ].join("\n"),
  );
  assert.deepEqual(report.findings, []);
  assert.match(report.gateCheckNotRun ?? "", /not run: gate requires/);
});

test("dependabot skips body checks only with user.type Bot", () => {
  const bot = harness({
    mode: "enforce",
    numstat: "600\t500\tpnpm-lock.yaml\0",
    event: pullRequest({
      user: { login: "dependabot[bot]", type: "Bot" },
      body: "",
    }),
  });
  assert.equal(runGate(bot.deps), 0);
  assert.match(bot.summary(), /Body checks skipped for `dependabot\[bot\]`/);
  assert.doesNotMatch(bot.summary(), /Missing review evidence/);

  const spoofed = harness({
    mode: "enforce",
    numstat: "",
    event: pullRequest({
      user: { login: "dependabot[bot]", type: "User" },
      body: "",
    }),
  });
  assert.equal(runGate(spoofed.deps), 1);
  assert.match(spoofed.summary(), /Missing review evidence/);
});

test("injection strings in the PR body are never executed or echoed", () => {
  const hostile = [
    "## Requirements",
    "- ::error::pwned",
    "## Evidence",
    "- Independent review: $(touch /tmp/pwned) `id`",
    "- Gate check: $(touch /tmp/pwned)",
    "## Not verified",
    "- ::set-output name=x::y",
  ].join("\n");
  const h = harness({
    mode: "enforce",
    event: pullRequest({ body: hostile }),
    numstat: "",
  });
  assert.equal(runGate(h.deps), 0);
  const output = h.logs.join("\n");
  assert.doesNotMatch(output, /pwned/);
  assert.doesNotMatch(output, /\$\(|`id`/);
});

test("workflow-command escaping covers percent, CR and LF", () => {
  assert.equal(escapeWorkflowCommand("100% \r\nnext"), "100%25 %0D%0Anext");
});

test("summary paths use safe CommonMark code spans and preserve path content", () => {
  const hostilePaths = [
    "[link](x).bin",
    "![img](y).png",
    " a`b ",
    "``x``",
    "*em*",
    "line\n# heading",
    "<script>",
    "`leading",
    "trailing`",
  ];
  for (const filePath of hostilePaths) {
    const rendered = renderSummaryPath(filePath);
    const quoted = JSON.stringify(filePath);
    const runs = [...quoted.matchAll(/`+/g)].map(([run]) => run.length);
    const delimiterLength = Math.max(0, ...runs) + 1;
    const delimiter = "`".repeat(delimiterLength);
    const padded =
      quoted.startsWith("`") || quoted.endsWith("`")
        ? ` ${quoted} `
        : quoted;

    assert.ok(rendered.startsWith(delimiter));
    assert.ok(rendered.endsWith(delimiter));
    assert.equal(rendered, `${delimiter}${padded}${delimiter}`);
    assert.ok(!rendered.includes("\n"));
    assert.equal(JSON.parse(rendered.slice(delimiterLength, -delimiterLength).trim()), filePath);
  }

  const h = harness({
    numstat: hostilePaths.map((file) => `-\t-\t${file}\0`).join(""),
  });
  assert.equal(runGate(h.deps), 0);
  const summary = h.summary();
  for (const filePath of hostilePaths) {
    assert.ok(summary.includes(renderSummaryPath(filePath)));
  }
});

test("trunk paths are listed as line review required", () => {
  const h = harness({
    numstat: "1\t0\t.github/workflows/ci.yml\0",
    classify: {
      status: 0,
      stdout: JSON.stringify({
        paths: [
          { path: ".github/workflows/ci.yml", class: "trunk" },
          { path: "docs/readme.md", class: "shared" },
        ],
      }),
      stderr: "",
    },
  });
  assert.equal(runGate(h.deps), 0);
  assert.equal(h.logs.length, 1);
  assert.match(
    h.logs[0],
    /^::notice title=pr-gate::Trunk path requires line review: \.github\/workflows\/ci\.yml$/,
  );
  assert.ok(h.summary().includes(renderSummaryPath(".github/workflows/ci.yml")));
  assert.doesNotMatch(h.summary(), /docs\/readme\.md/);
});

test("classify exit 2 fails the job in both modes", () => {
  for (const mode of ["report", "enforce"]) {
    const h = harness({
      mode,
      classify: { status: 2, stdout: "", stderr: "malformed policy" },
    });
    assert.equal(runGate(h.deps), 2);
    assert.match(
      h.logs[0],
      /^::error title=pr-gate::review_gate\.py classify failed \(exit 2\)/,
    );
  }
});

test("missing event file exits 2", () => {
  const h = harness({ event: "unreadable" });
  assert.equal(runGate(h.deps), 2);
  assert.match(h.logs[0], /cannot read GITHUB_EVENT_PATH/);
});

test("missing SHAs exit 2", () => {
  for (const event of [
    pullRequest({ base: {} }),
    pullRequest({ head: { sha: "" } }),
  ]) {
    const h = harness({ event });
    assert.equal(runGate(h.deps), 2);
    assert.match(h.logs[0], /pull_request\.(base|head)\.sha is missing/);
  }
});

test("missing GITHUB_EVENT_PATH and invalid mode exit 2", () => {
  const noEvent = harness();
  const noEventDeps: GateDeps = {
    ...noEvent.deps,
    env: { ...noEvent.deps.env, GITHUB_EVENT_PATH: undefined },
  };
  assert.equal(runGate(noEventDeps), 2);

  const badMode = harness({ mode: "diagnose" });
  assert.equal(runGate(badMode.deps), 2);
  assert.match(badMode.logs[0], /PR_GATE_MODE must be report or enforce/);
});

// Real git + real review_gate.py: a PR whose base branch advanced after the
// branch point. Before the merge-base fix, review_gate.py rejected the head
// (not a descendant of the base) and the job exited 2.
test("divergent base: real git and real classify exit 0 with trunk listing", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "pr-gate-it-"));
  const git = (...args: string[]): string =>
    execFileSync("git", args, { cwd: repo, encoding: "utf8" });
  git("init", "-q", "-b", "main", ".");
  git("config", "user.email", "gate@example.test");
  git("config", "user.name", "gate test");
  git("config", "commit.gpgsign", "false");

  fs.mkdirSync(path.join(repo, ".github/workflows"), { recursive: true });
  fs.mkdirSync(path.join(repo, "docs"), { recursive: true });
  fs.writeFileSync(
    path.join(repo, ".github/workflows/ci.yml"),
    "name: CI\non: push\n",
  );
  fs.writeFileSync(
    path.join(repo, "docs/review-policy.md"),
    [
      "# Review Policy",
      "",
      "## Criticality Map",
      "",
      "| Class | Glob | Reason |",
      "| --- | --- | --- |",
      "| trunk | .github/workflows/ | Workflow controls execute in CI |",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(path.join(repo, "base.txt"), "base\n");
  git("add", ".");
  git("commit", "-qm", "base");

  git("checkout", "-qb", "feature");
  fs.writeFileSync(
    path.join(repo, "scripts-place.ts"),
    "export const x = 1;\nexport const y = 2;\n",
  );
  fs.writeFileSync(
    path.join(repo, ".github/workflows/ci.yml"),
    "name: CI\non: pull_request\n",
  );
  git("add", ".");
  git("commit", "-qm", "feature");
  const head = git("rev-parse", "HEAD").trim();

  git("checkout", "-q", "main");
  fs.writeFileSync(path.join(repo, "base-advance.txt"), "advanced\n");
  git("add", ".");
  git("commit", "-qm", "base advances");
  const base = git("rev-parse", "HEAD").trim();
  assert.notEqual(base, head);

  const classify = (
    args: readonly string[],
  ): { status: number; stdout: string; stderr: string } => {
    const [, ...rest] = args;
    try {
      const stdout = execFileSync("python3", [REVIEW_GATE, ...rest], {
        cwd: repo,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      return { status: 0, stdout, stderr: "" };
    } catch (error) {
      const failure = error as {
        status?: number;
        stdout?: string;
        stderr?: string;
      };
      return {
        status: failure.status ?? 1,
        stdout: failure.stdout ?? "",
        stderr: failure.stderr ?? "",
      };
    }
  };

  // The old wiring (classify --base <PR base>) is what exit 2 came from.
  const stale = classify([
    "classify",
    "classify",
    "--policy",
    "docs/review-policy.md",
    "--base",
    base,
    "--head",
    head,
    "--json",
  ]);
  assert.equal(stale.status, 2, "review_gate rejects a non-descendant head");

  const eventFile = path.join(repo, "event.json");
  fs.writeFileSync(
    eventFile,
    JSON.stringify({
      pull_request: {
        body: [
          "## Requirements",
          "- REQ-AFC-05 / AC-AFC-09",
          "## Evidence",
          "- Independent review: specialist-architecture-guard, READY",
          "- Gate check: not run: integration test",
          "## Not verified",
          "- No live GitHub run.",
        ].join("\n"),
        labels: [{ name: "enhancement" }],
        user: { login: "author", type: "User" },
        base: { sha: base },
        head: { sha: head },
      },
    }),
  );

  const logs: string[] = [];
  const summaries: string[] = [];
  const deps: GateDeps = {
    ...createDeps({ ...process.env, GITHUB_EVENT_PATH: eventFile }, repo),
    classify,
    appendSummary: (markdown) => summaries.push(markdown),
    log: (line) => logs.push(line),
  };

  assert.equal(runGate(deps), 0);
  const summary = summaries.join("");
  // Feature commit only: 2 new lines + 1 add/1 del on ci.yml. The base-only
  // file `base-advance.txt` must not be counted.
  assert.match(summary, /Authored lines: \*\*4\*\* \/ 1000/);
  assert.ok(summary.includes(renderSummaryPath(".github/workflows/ci.yml")));
  assert.ok(
    logs.some((line) =>
      line.includes(
        "::notice title=pr-gate::Trunk path requires line review: .github/workflows/ci.yml",
      ),
    ),
  );
});
