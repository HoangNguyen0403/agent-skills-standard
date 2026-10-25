// Run with: node --import tsx scripts/evals/agent-qa-regrade.mjs
// Read-only regrade of retained answers; stdout is a separate audit artifact.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkAssertion } from "./scorer.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const sourceRun = "agent-qa-development-2026-10-25-iteration2";
const skill = "quality-engineering/quality-engineering-agent-qa";
const evalPath = `skills/${skill}/evals/evals.json`;
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const definitionText = read(evalPath);
const definition = JSON.parse(definitionText);
const retained = `benchmarks/evals/runs/${sourceRun}`;
const originalDefinition = JSON.parse(read(`${retained}/inputs.json`)).sources[
  skill
].evals;
const sourceCases = ["eval-1", "eval-2", "eval-3", "pressure-1", "pressure-2"];

const cases = definition.evals.flatMap((evaluation, index) => {
  const sourceCase = sourceCases[index];
  const originalPrompt =
    index < 3
      ? originalDefinition.evals[index].prompt
      : originalDefinition.pressure_scenarios[index - 3].prompt;
  assert.equal(
    evaluation.prompt,
    originalPrompt,
    "Cannot regrade a changed prompt",
  );
  return ["baseline", "with-skill"].map((arm) => {
    const answerPath = `${retained}/answers/${skill}/${sourceCase}.${arm}.md`;
    const answer = read(answerPath);
    const failed = evaluation.assertions
      .filter((assertion) => !checkAssertion(assertion, answer, 2))
      .map(
        (assertion) =>
          assertion.description ?? `${assertion.type}:${assertion.value}`,
      );
    return {
      case: `eval-${evaluation.id}`,
      sourceCase,
      arm,
      answerPath,
      answerSha256: sha256(answer),
      promptSha256: sha256(originalPrompt),
      passed: failed.length === 0,
      passedAssertions: evaluation.assertions.length - failed.length,
      totalAssertions: evaluation.assertions.length,
      failedAssertions: failed,
    };
  });
});

process.stdout.write(
  `${JSON.stringify(
    {
      evidenceKind: "assertion-only regrade of retained textual answers",
      sourceRun,
      evalPath,
      evalSha256: sha256(definitionText),
      assertionSemanticsVersion: 2,
      freshAnswers: 0,
      limitation:
        "Bounded lexical controls, not a semantic judge or executable task evidence. Original run files are unchanged.",
      cases,
    },
    null,
    2,
  )}\n`,
);
