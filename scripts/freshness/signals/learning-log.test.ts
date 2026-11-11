// scripts/freshness/signals/learning-log.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { learningLogIssues, parseLearningLog } from "./learning-log";

const known = new Set(["nextjs/nextjs-caching", "golang/golang-logging", "common/common-tdd"]);

const log = `# Agent Learning Log

Do not edit past entries; append only.

---

## Agent Learning Log: Iteration #1

**Date**: 2026-05-08 | **Task**: Consolidate folders.
**Signal**: User correction

### ❌ Mistake Made
Touched \`.antigravity/mcp_config.json\` without checking.

---

## Agent Learning Log: Iteration #2

**Date**: 2026-09-01 | **Task**: Fix caching guidance.
**Signal**: Session retrospective
**Skills**: nextjs/nextjs-caching, golang/golang-logging

### ❌ Mistake Made
Recommended unstable_cache; nextjs/nextjs-caching still documents it.

---

## Agent Learning Log: Iteration #3

**Date**: 2026-09-10 | **Task**: Logging.
**Signal**: User correction
**Skills**: golang/golang-logging, bogus/skill, not an id  <!-- optional; the freshness report counts these -->

### ✅ Better Approach
Follow \`golang/golang-logging\` and ignore made-up/skill-id.
`;

test("parseLearningLog reads headings, dates, explicit Skills line, and known skill mentions", () => {
  const entries = parseLearningLog(log, known);
  assert.deepEqual(
    entries.map((e) => [e.iteration, e.date, e.signal, e.skills, e.line]),
    [
      [1, "2026-05-08", "User correction", [], 7],
      [2, "2026-09-01", "Session retrospective", ["nextjs/nextjs-caching", "golang/golang-logging"], 17],
      [3, "2026-09-10", "User correction", ["golang/golang-logging"], 28],
    ],
  );
  assert.equal(entries[1].task, "Fix caching guidance.");
});

test("parseLearningLog strips HTML comments, keeps only known-skill explicit ids, and reports unknown ones", () => {
  const unknown: Array<[string, number]> = [];
  const entries = parseLearningLog(log, known, (id, line) => unknown.push([id, line]));
  assert.deepEqual(entries[2].skills, ["golang/golang-logging"]);
  assert.deepEqual(unknown, [
    ["bogus/skill", 32],
    ["not an id", 32],
  ]);
});

test("parseLearningLog truncates a line at a trailing comment regardless of how (or whether) it closes", () => {
  // Neither the standard `-->` nor the legacy `--!>` closer, nor an
  // unterminated `<!--` with no closer at all, can leave a `<!--` behind:
  // truncation at the first occurrence never depends on recognizing a
  // closing delimiter in the first place.
  for (const closer of ["-->", "--!>", ""]) {
    const withComment = `## Agent Learning Log: Iteration #8\n\n**Date**: 2026-09-12 | **Task**: X.\n**Signal**: User correction\n**Skills**: common/common-tdd  <!-- trailing note ${closer}\n`;
    const [entry] = parseLearningLog(withComment, known);
    assert.deepEqual(entry.skills, ["common/common-tdd"], `closer=${JSON.stringify(closer)}`);
  }
});

test("parseLearningLog never lets <!-- survive an adjacent/malformed comment marker, even mid-field", () => {
  // Removing the inner well-formed comment from "<!<!---->--" would
  // reassemble a bare, unterminated "<!--" if comments were stripped by
  // matching paired delimiters; truncating at the first literal "<!--"
  // never reassembles anything, so nothing after it — however malformed —
  // can smuggle a "<!--" back into the parsed text.
  const unknown: Array<[string, number]> = [];
  const weird =
    "## Agent Learning Log: Iteration #7\n\n**Date**: 2026-09-11 | **Task**: X <!<!---->--Y.\n**Signal**: User correction\n**Skills**: common/common-tdd\n";
  const [entry] = parseLearningLog(weird, known, (id, line) => unknown.push([id, line]));
  assert.deepEqual(entry.skills, ["common/common-tdd"]);
  assert.equal(entry.task.includes("<!--"), false);
  for (const [id] of unknown) assert.equal(id.includes("<!--"), false);
});

test("parseLearningLog reads a combined Date | Task | Signal line", () => {
  const combined = "## Agent Learning Log: Iteration #9\n\n**Date**: 2026-09-10 | **Task**: Logging | **Signal**: User correction\n";
  const [entry] = parseLearningLog(combined, known);
  assert.equal(entry.task, "Logging");
});

test("learningLogIssues counts entries per skill inside the window", () => {
  const entries = parseLearningLog(log, known);
  const issues = learningLogIssues(entries, { today: new Date("2026-09-14T00:00:00Z"), windowDays: 90 });
  const byKey = Object.fromEntries(issues.map((i) => [`${i.category}/${i.skillName}`, i]));
  assert.deepEqual(Object.keys(byKey).sort(), ["golang/golang-logging", "nextjs/nextjs-caching"]);
  assert.equal(byKey["golang/golang-logging"].severity, "low");
  assert.equal(byKey["golang/golang-logging"].type, "learning-log-gap");
  assert.match(byKey["golang/golang-logging"].message, /2 learning-log entr/);
  assert.match(byKey["golang/golang-logging"].message, /#2, #3/);
  assert.equal(byKey["golang/golang-logging"].file, "AGENTS_LEARNING.md");
  assert.equal(byKey["golang/golang-logging"].line, 17);
  // Iteration #1 is outside the window and names no skill anyway.
  assert.equal(learningLogIssues(entries, { today: new Date("2026-09-14T00:00:00Z"), windowDays: 5 }).length, 1);
});

test("parseLearningLog returns an empty list for text without entries", () => {
  assert.deepEqual(parseLearningLog("# nothing here\n", known), []);
});

test("parseLearningLog extracts candidate metadata fields and leaves legacy entries undefined", () => {
  const candidateLog = `# Agent Learning Log

---

## Agent Learning Log: Iteration #1

**Date**: 2026-09-01 | **Task**: Legacy task.
**Signal**: User correction

### Mistake Made
Legacy body text.

---

## Agent Learning Log: Iteration #2

**Date**: 2026-10-10 | **Task**: Structured candidate.
**Signal**: Session retrospective
**Skills**: common/common-tdd
**Scope**: project
**Candidate**: sample-candidate-id | **Status**: evaluating <!-- inline note -->
**Improvement**: IMP-sample-1 | **Prevention**: regression-test
**Verification**: scripts/freshness/learning-ledger.test.ts
**Evaluation**: 12 tests pass
**Review**: VMO reviewer 1234abcd ACCEPT

### Mistake Made
**Status**: promoted
**Review**: self-approved in prose
`;
  const entries = parseLearningLog(candidateLog, known);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].candidate, undefined);
  assert.equal(entries[0].status, undefined);
  assert.equal(entries[0].prevention, undefined);
  assert.equal(entries[1].candidate, "sample-candidate-id");
  assert.equal(entries[1].status, "evaluating");
  assert.equal(entries[1].improvement, "IMP-sample-1");
  assert.equal(entries[1].prevention, "regression-test");
  assert.equal(entries[1].verification, "scripts/freshness/learning-ledger.test.ts");
  assert.equal(entries[1].evaluation, "12 tests pass");
  assert.equal(entries[1].review, "VMO reviewer 1234abcd ACCEPT");
});

test("parseLearningLog ignores candidate metadata and iteration headings inside backtick and tilde fences", () => {
  const fencedLog = `# Agent Learning Log

\`\`\`markdown
## Agent Learning Log: Iteration #99
**Candidate**: phantom-before-entries | **Status**: promoted
\`\`\`

## Agent Learning Log: Iteration #1
**Date**: 2026-10-15 | **Task**: Real promoted entry.
**Signal**: User correction
**Candidate**: real-candidate | **Status**: promoted
**Verification**: pending
**Review**: pending

\`\`\`\`markdown
\`\`\`
## Agent Learning Log: Iteration #100
**Candidate**: phantom-nested | **Status**: proposed
\`\`\`
**Status**: proposed
\`\`\`\`

~~~markdown
**Status**: proposed
**Prevention**: lint
**Verification**: fake-check
**Review**: fake-review
~~~

### Mistake Made
Body text mentioning common/common-tdd.
`;
  const entries = parseLearningLog(fencedLog, known);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].iteration, 1);
  assert.equal(entries[0].candidate, "real-candidate");
  assert.equal(entries[0].status, "promoted");
  assert.equal(entries[0].prevention, undefined);
  assert.equal(entries[0].verification, "pending");
  assert.equal(entries[0].review, "pending");
  assert.deepEqual(entries[0].skills, ["common/common-tdd"]);
});

test("parseLearningLog preserves legacy skill mention extraction on ### subheading lines", () => {
  const subheadingLog = `
## Agent Learning Log: Iteration #1
**Date**: 2026-09-12 | **Task**: Subheading mention only.
**Signal**: User correction

### common/common-tdd
`;
  const entries = parseLearningLog(subheadingLog, known);
  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0].skills, ["common/common-tdd"]);
  const issues = learningLogIssues(entries, { today: new Date("2026-09-14T00:00:00Z"), windowDays: 90 });
  assert.equal(issues.length, 1);
  assert.equal(`${issues[0].category}/${issues[0].skillName}`, "common/common-tdd");
});
