import assert from "node:assert/strict";
import test from "node:test";
import { checkRegexAlignment } from "./alignment";

test("checkRegexAlignment: anchored multiline expected answer aligns despite preceding prompt (unmasked prompt)", () => {
  // Prompt contains 5 lines so it cannot independently satisfy a 3-line count pattern
  const prompt = [
    "Task: Generate a 3-line structured decision report.",
    "Requirement line 2: Ensure all fields are strictly formatted.",
    "Requirement line 3: Do not include conversational preamble.",
    "Requirement line 4: Adhere to established schema.",
    "Requirement line 5: Deliver final payload.",
  ].join("\n");

  // Expected output contains exactly 3 lines
  const expectedOutput = [
    "design_change: none",
    "final_headline: 'Token-Optimized Agent Workflows'",
    "final_cta: 'Run rtk gain to inspect compression ratio'",
  ].join("\n");

  // Start-anchored pattern for the first field
  const startAnchoredPattern = "^\\s*design_change\\s*:\\s*none";
  // Strict 3-line total shape guard (requires exactly 2 newline separators)
  const lineCountPattern = "^(?:[^\\n]*\\r?\\n){2}[^\\n]*\\s*$";

  const startAnchoredRe = new RegExp(startAnchoredPattern, "i");
  const lineCountRe = new RegExp(lineCountPattern, "i");

  // Verify prompt does NOT independently satisfy either assertion
  assert.equal(
    startAnchoredRe.test(prompt),
    false,
    "Prompt must not satisfy start-anchored field pattern",
  );
  assert.equal(
    lineCountRe.test(prompt),
    false,
    "Prompt must not satisfy 3-line total count pattern (prompt has 5 lines)",
  );

  // Pre-repair concatenation fails both assertions: starts with prompt and has 8 total lines
  const artificialConcatenation = `${prompt}\n${expectedOutput}`;
  assert.equal(
    startAnchoredRe.test(artificialConcatenation),
    false,
    "Pre-repair concatenation erroneously rejects start-anchored row because prompt precedes expected output",
  );
  assert.equal(
    lineCountRe.test(artificialConcatenation),
    false,
    "Pre-repair concatenation erroneously rejects line-count guard because combined string has 8 lines",
  );

  // Independent evaluation succeeds against expectedOutput
  assert.equal(
    checkRegexAlignment(startAnchoredRe, { prompt, expectedOutput }),
    true,
  );
  assert.equal(
    checkRegexAlignment(lineCountRe, { prompt, expectedOutput }),
    true,
  );
});

test("checkRegexAlignment: i-only negative proves interior line does not match start-anchor without m flag", () => {
  // Interior line has 'target_field: value' preceded by a newline
  const document = [
    "header: metadata",
    "target_field: value",
    "footer: end",
  ].join("\n");

  const startAnchorPattern = "^target_field\\s*:\\s*value";

  // With i-only flag (no m flag), start-anchor ^ matches only start of document
  const iOnlyRe = new RegExp(startAnchorPattern, "i");
  assert.equal(
    iOnlyRe.test(document),
    false,
    "i-only RegExp must not match start-anchor on an interior line",
  );
  assert.equal(
    checkRegexAlignment(iOnlyRe, { expectedOutput: document }),
    false,
    "checkRegexAlignment must reject interior line against start-anchor when m flag is absent",
  );

  // Proves that adding the m flag would change semantics and falsely match
  const imRe = new RegExp(startAnchorPattern, "im");
  assert.equal(
    imRe.test(document),
    true,
    "Hypothetical m flag would falsely match interior line at newline boundary",
  );
});

test("checkRegexAlignment: prompt-only independently grounded", () => {
  const prompt = "Use rtk gain --history to verify compression statistics.";
  const expectedOutput = "Operation completed successfully.";

  const promptOnlyRe = new RegExp("rtk\\s+gain\\s+--history", "i");

  assert.equal(
    checkRegexAlignment(promptOnlyRe, { prompt, expectedOutput }),
    true,
  );
});

test("checkRegexAlignment: pattern matching only artificial prompt/answer boundary does not align", () => {
  const prompt = "Please deliver final response.";
  const expectedOutput = "Response payload line 1.";

  // Pattern specifically crafted across the artificial concatenation boundary "\n"
  const boundarySpanningRe = new RegExp("response\\.\\s*\\n\\s*response", "i");

  const artificialConcatenation = `${prompt}\n${expectedOutput}`;
  assert.equal(
    boundarySpanningRe.test(artificialConcatenation),
    true,
    "Artificial concatenation incorrectly matches boundary-crossing regex",
  );

  assert.equal(
    checkRegexAlignment(boundarySpanningRe, { prompt, expectedOutput }),
    false,
    "Independent documents must not match artificial boundary-spanning patterns",
  );
});

test("checkRegexAlignment: unrelated regex misses", () => {
  const sources = {
    strippedContent: "# Some Skill\nInstructions on optimization.",
    prompt: "Run standard build.",
    expectedOutput: "status: ok",
  };

  assert.equal(
    checkRegexAlignment(
      new RegExp("completely_nonexistent_token_xyz987", "i"),
      sources,
    ),
    false,
  );
});

test("checkRegexAlignment: stripped skill content independently grounds regex", () => {
  const sources = {
    strippedContent:
      "## Guidelines\nPreserve all immutable contract definitions.",
    prompt: "Execute task.",
    expectedOutput: "Done.",
  };

  assert.equal(
    checkRegexAlignment(
      new RegExp("immutable\\s+contract\\s+definitions", "i"),
      sources,
    ),
    true,
  );
});

test("checkRegexAlignment: preserves valid empty pattern matching documents", () => {
  const emptyRe = new RegExp("", "i");

  // Native JS RegExp: empty pattern matches any string, including empty or non-empty documents
  assert.equal(checkRegexAlignment(emptyRe, { prompt: "any prompt" }), true);
  assert.equal(checkRegexAlignment(emptyRe, { expectedOutput: "" }), true);
});

test("checkRegexAlignment: preserves actual empty document matching ^$", () => {
  const emptyDocRe = new RegExp("^$", "i");

  // Prompt and skill are non-empty and do not match ^$; expectedOutput is actual empty string
  const sources = {
    strippedContent: "Non-empty skill documentation",
    prompt: "Non-empty prompt instructions",
    expectedOutput: "",
  };

  assert.equal(
    emptyDocRe.test(sources.prompt),
    false,
    "Prompt must not match ^$",
  );
  assert.equal(
    checkRegexAlignment(emptyDocRe, sources),
    true,
    "Actual empty expectedOutput document must match ^$",
  );
});

test("checkRegexAlignment: absent undefined documents are not evaluated", () => {
  const anyRe = new RegExp(".*", "i");

  // When sources are all undefined (absent), none are tested
  assert.equal(checkRegexAlignment(anyRe, {}), false);
});
