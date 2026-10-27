# Static Alignment Verifier Defect Repair Report

## 1. Summary & Status

- **Status**: COMPLETE (Implementation & regression test authored; pending integration owner single-run verification).
- **Scope**: Bounded directly exposed verifier bug in static eval-alignment gate (`scripts/check-alignment.ts`).
- **Source Freeze Maintained**: Zero skill source files (`skills/**/SKILL.md`), reference files, eval definitions (`evals.json`), or candidate fixtures were modified. Scorer implementation (`scripts/evals/scorer.ts`) remains unmodified.
- **Changed Files**:
  1. `scripts/evals/alignment.ts` (new): Pure helper function `checkRegexAlignment` independently evaluating stripped skill content, actual prompt, and actual expected output.
  2. `scripts/evals/alignment.test.ts` (new): Regression test suite covering regex alignment semantics and failure boundaries under `node:test`.
  3. `scripts/check-alignment.ts` (modified): Updated `case "regex"` to evaluate regex assertions via `checkRegexAlignment`.

---

## 2. Root Cause Analysis

In `scripts/check-alignment.ts` (lines 116–161 prior to repair):
1. `taskContract` was constructed by concatenating prompt and expected output:
   ```ts
   const taskContract = `${ev.prompt ?? ""}\n${ev.expected_output ?? ""}`.toLowerCase();
   ```
2. For `case "regex"`, the script compiled `new RegExp(assertion.value ?? "", "i")` (without the `m` multiline flag) and evaluated:
   ```ts
   if (re.test(strippedContent) || re.test(taskContract)) { ... }
   ```
3. Because `ev.prompt` was concatenated directly ahead of `ev.expected_output`:
   - Start-anchored assertions on model outputs (e.g., `^\s*design_change\s*:\s*none\s*\r?\n`) failed to match because the string began with `ev.prompt`.
   - Exact line-count shape guards (e.g., `^(?:[^\n]*\r?\n){2}[^\n]*\s*$`) failed because the line count encompassed both prompt and expected output lines.
   - Without the `m` flag, `^` only matches the beginning of the entire tested document and `$` only matches the end of the entire tested document.
4. Furthermore, the synthetic concatenation introduced an artificial boundary that could incorrectly pass patterns matching across the prompt-to-expected-output join string.

---

## 3. Expected Failing-Before Evidence from Receipt

From `task-5-report.md` (§2, row 27):
- **Command**: `rtk pnpm check-alignment`
- **Result**: Exit code 1 (FAILED).
- **Reported Defect**:
  - `marketing/marketing-content-strategy`: 59% alignment (threshold 70%)
  - `marketing/marketing-copywriting`: 53% alignment (threshold 70%)
  - `marketing/marketing-demo-video`: 64% alignment (threshold 70%)
- **Diagnostic Observation**:
  The real scorer (`scripts/evals/scorer.ts checkAssertion`) yielded 100% pass across all 73 typed evaluation cases (19/19 accepted, 54/54 rejected) because the runtime scorer evaluates candidate model outputs (`transcript`) directly, where `^` correctly anchors to the start of the output. The static validator's artificial concatenation was the sole reason the three target skills failed static alignment.

---

## 4. Test Semantics & Boundary Coverage

The regression test suite `scripts/evals/alignment.test.ts` covers the specific semantic edge cases:

1. **Anchored Multiline Expected Answer Aligns Despite Preceding Prompt**:
   - Asserts that start-anchored field regexes (`^\s*design_change\s*:\s*none`) and total-line shape guards (`^(?:[^\n]*\r?\n){2}[^\n]*\s*$`) succeed when evaluated against `expectedOutput`, while verifying that pre-repair concatenation fails.
2. **Prompt-Only Independently Grounded**:
   - Asserts that assertions deriving from prompt requirements (e.g., specific command flags or instruction phrases) align when present only in `prompt`.
3. **Invalid Regex Returns False**:
   - Malformed regex syntax (e.g., unclosed character classes) is caught and safely returns `false` without unhandled exceptions.
4. **Pattern Matching Only Artificial Boundary Does Not Align**:
   - Asserts that patterns matching across the artificial join boundary between prompt and expected output (e.g., `response\.\s*\n\s*response`) fail to match under independent document evaluation.
5. **Unrelated Regex Misses**:
   - Asserts that arbitrary unrelated patterns do not align.
6. **Stripped Skill Content Grounding**:
   - Asserts that patterns appearing only in the skill markdown body align independently.
7. **Empty/Null/Undefined Patterns Return False**:
   - Boundary checks confirm that missing or empty patterns safely fail.

### Scope Limitations & Preserved Semantics
- **Contains Grounding Unchanged**: `contains` and `contains_any` continue to use `taskContract = `${ev.prompt ?? ""}\n${ev.expected_output ?? ""}`.toLowerCase()` and `grounded()`, preserving existing combined substring semantics.
- **Flags Unchanged**: `new RegExp(pattern, "i")` retains case-insensitive matching without injecting `m`, preserving exact scorer parity.
- **Threshold Unchanged**: The 70% threshold remains unaltered.
- **No Special Cases**: No skill IDs or path-specific exceptions are introduced.

---

## 5. Focused Verification Commands for Integration Owner

Per instruction, zero build, lint, or test commands were run midflight. The integration owner should execute the following focused commands once to verify the fix:

```bash
# 1. Run eval unit test suite (includes scripts/evals/alignment.test.ts)
rtk pnpm test:evals

# 2. Run the static alignment gate
rtk pnpm check-alignment
```

---

## 6. Corrective Follow-up: Review Findings A1–A3 Reconciled

Following independent review (`alignment-fix-review.md`), the implementation was corrected to resolve findings A1–A3 without widening scope:

### 6.1 Reconciled Empty Pattern and Document Semantics (Finding A1)
- **Native RegExp Preservation**: Preserved baseline caller fallback `assertion.value ?? ""`. Under native JavaScript RegExp semantics, `new RegExp("", "i")` compiles successfully and matches any document.
- **Empty String Documents Preserved**: `checkRegexAlignment` no longer filters out `""` documents via `.length > 0`. A supplied document is checked whenever `typeof sources[doc] === "string"`. This allows legitimate `^$` assertions on empty output (`expectedOutput: ""`) to match, while absent documents (`undefined`) are cleanly bypassed without evaluation.

### 6.2 Eliminated Double Compilation and Allocation Overhead (Finding A2)
- **Compile Once at Caller**: `scripts/check-alignment.ts` compiles `assertion.value ?? ""` exactly once. Syntax errors are caught immediately to record `eval ${ev.id}: regex /${assertion.value}/i (invalid pattern)`.
- **Helper Signature**: `checkRegexAlignment(re: RegExp, sources: RegexAlignmentSources): boolean` accepts the compiled `i`-only `RegExp`.
- **Zero Array Allocation**: Replaced array construction and filtering with direct short-circuit property checks (`typeof sources.strippedContent === "string" && re.test(...)`).

### 6.3 Test Unmasking and Semantic Parity (Finding A3)
- **Unmasked Multiline Shape Test**: The fixture `prompt` was expanded to 5 lines so that it cannot independently satisfy the 3-line count pattern (`^(?:[^\n]*\r?\n){2}[^\n]*\s*$`). The test proves that the 3-line shape match originates exclusively from `expectedOutput`.
- **i-only Interior-Line Negative**: Added explicit regression case demonstrating that a start-anchored pattern (`^target_field: value`) on an interior line fails under `i`-only flags, and proves that an accidental `m` flag would have falsely passed it.
- **Preservation Tests**: Added positive tests for valid empty pattern matching and actual empty document matching `^$`.
