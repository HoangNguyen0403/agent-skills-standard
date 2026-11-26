# T1 discriminator matrix — actual output

Disposable proof for the T1 R2 eval contracts. Uses the real `scripts/evals/scorer.ts` `checkAssertion` and the committed `evals.json` assertions; no scorer/runtime/schema change.

Command (repo root `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/illegal-platypus`):

```bash
node --import tsx benchmarks/evals/outcome-driven-agent-guidance/t1-discriminator-matrix.mjs
```

Result: exit 0, `MATRIX PASS: 41 candidates (13 pass, 28 fail), 0 mismatches, 0 self-check failures.`

## Self-checks

Each used case is regex-only, has at least two assertions, and its canonical `expected_output` satisfies every assertion:

```text
SELF common-skill-creator#5	assertions=3	regex_only=true	expected_output_matches=true
SELF common-skill-creator#6	assertions=4	regex_only=true	expected_output_matches=true
SELF common-workflow-writing#1	assertions=5	regex_only=true	expected_output_matches=true
SELF common-workflow-writing#6	assertions=6	regex_only=true	expected_output_matches=true
SELF common-workflow-writing#7	assertions=3	regex_only=true	expected_output_matches=true
SELF common-workflow-writing#8	assertions=3	regex_only=true	expected_output_matches=true
```

## Candidate outcomes

```text
OK	common-skill-creator#5	accept: canonical LF block	expected=pass	actual=pass
OK	common-skill-creator#5	accept: CRLF with tabs	expected=pass	actual=pass
OK	common-skill-creator#5	accept: quoted unsafe phrase in NOTES	expected=pass	actual=pass
OK	common-skill-creator#5	reject: unsafe ban value	expected=fail	actual=fail
OK	common-skill-creator#5	reject: unsafe evidence value	expected=fail	actual=fail
OK	common-skill-creator#5	reject: echoed union	expected=fail	actual=fail
OK	common-skill-creator#5	reject: packed one line	expected=fail	actual=fail
OK	common-skill-creator#5	reject: unlabelled tail	expected=fail	actual=fail
OK	common-skill-creator#5	reject: fenced block	expected=fail	actual=fail
OK	common-skill-creator#6	accept: canonical LF block	expected=pass	actual=pass
OK	common-skill-creator#6	accept: CRLF with indentation	expected=pass	actual=pass
OK	common-skill-creator#6	accept: quoted unsafe phrase in NOTES	expected=pass	actual=pass
OK	common-skill-creator#6	reject: reversed decision rows	expected=fail	actual=fail
OK	common-skill-creator#6	reject: old vocabulary only	expected=fail	actual=fail
OK	common-skill-creator#6	reject: partial block missing ACTION	expected=fail	actual=fail
OK	common-skill-creator#6	reject: duplicate field	expected=fail	actual=fail
OK	common-skill-creator#6	reject: reordered fields	expected=fail	actual=fail
OK	common-skill-creator#6	reject: refusal plus contradicting action line	expected=fail	actual=fail
OK	common-workflow-writing#1	accept: canonical decisions	expected=pass	actual=pass
OK	common-workflow-writing#1	accept: quoted ban in NOTES	expected=pass	actual=pass
OK	common-workflow-writing#1	reject: unsafe example policy	expected=fail	actual=fail
OK	common-workflow-writing#1	reject: unbounded length	expected=fail	actual=fail
OK	common-workflow-writing#1	reject: pre-filled output	expected=fail	actual=fail
OK	common-workflow-writing#1	reject: packed decision block	expected=fail	actual=fail
OK	common-workflow-writing#6	accept: canonical gate decisions	expected=pass	actual=pass
OK	common-workflow-writing#6	accept: quoted downgrade in NOTES	expected=pass	actual=pass
OK	common-workflow-writing#6	reject: missing TDD	expected=fail	actual=fail
OK	common-workflow-writing#6	reject: TDD downgraded	expected=fail	actual=fail
OK	common-workflow-writing#6	reject: scope downgraded	expected=fail	actual=fail
OK	common-workflow-writing#6	reject: prescribed method	expected=fail	actual=fail
OK	common-workflow-writing#6	reject: reordered gates	expected=fail	actual=fail
OK	common-workflow-writing#7	accept: stop and seek new evidence	expected=pass	actual=pass
OK	common-workflow-writing#7	accept: quoted retry in NOTES	expected=pass	actual=pass
OK	common-workflow-writing#7	reject: repeat retry	expected=fail	actual=fail
OK	common-workflow-writing#7	reject: change method on unchanged evidence	expected=fail	actual=fail
OK	common-workflow-writing#7	reject: old prose without decision rows	expected=fail	actual=fail
OK	common-workflow-writing#7	reject: packed decision block	expected=fail	actual=fail
OK	common-workflow-writing#8	accept: labeled non-result sample	expected=pass	actual=pass
OK	common-workflow-writing#8	reject: ban examples	expected=fail	actual=fail
OK	common-workflow-writing#8	reject: sample presented as result	expected=fail	actual=fail
OK	common-workflow-writing#8	reject: unlabelled tail	expected=fail	actual=fail
MATRIX PASS: 41 candidates (13 pass, 28 fail), 0 mismatches, 0 self-check failures.
```

## Interpretation and limits

- Compliant paraphrases, CRLF/indented blocks, and quoted unsafe phrases in `NOTES` pass.
- Unsafe enumerated values, reversed decisions, missing fields, old vocabulary-only prose, duplicates, reorder, packed fields, fences, unlabelled tails, and a correct block followed by a contradicting action line fail.
- `NOTES` is intentionally ungraded. A quoted or negated unsafe phrase there passes by design; this is not evidence of semantic safety.
- The matcher cannot observe file effects or whether a model would emit the block. This proves rubric discrimination only, not model efficacy, behavioral qualification, or publication readiness.
- Rejected candidates fail real assertions from the committed eval files; the matrix does not duplicate assertion values.
