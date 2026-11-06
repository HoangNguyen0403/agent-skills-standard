# Trace authority repair — receipt

- Status: **completed (frozen)**. Implementation edits finished; nothing further will be edited by this owner.
- Corrective round 1 (parent snapshot `b53141bfca1a-201d0b436183`, parent result 66 PASS / 1 FAIL): see "Corrective round 1" below. Re-frozen after that single edit; no test was deleted, weakened or relabelled as global-formal.
- Domain: Personal `agent-skills-standard` prj_24334e6778b1395c, workspace `/Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/zealous-flamingo`.
- Packet: `trace-authority-packet.md` (successor to `trace-alignment-packet.md` task 1).
- Base revision: `52671cf9ed6a1c376dfaaae7e621dbc51a4c8765`.
- Prior owner `a29472d6-6cfe-4dea-8f97-84b414c14613` remained frozen; this owner (Personal - DeepSeek) resumed only the residual repair.
- No delegation, no installs, no commits, no deployment, no live model eval, no premium escalation, no doc-ID/schema/renderer/exporter/peer-file edits.
- **Tests, build, lint and formatters were NOT run by this owner** (packet: parent runs them after freeze). Local `bash` test execution was denied by the user; every test claim below is a definition, not a result.

## Corrective round 1 — ambiguity was detected but pre-empted

- Parent observation: `graph.test.ts:563` ("buildTraceGraph reports ambiguity for untyped prose when both authorities declare the same ID") expected 1 issue, got 0; every other old and new test passed, and the actual required-slug audit stayed `issues: []`.
- **Root cause (branch ordering, not detection):** in `graph.ts` `danglingRefIssues`, the per-occurrence resolution was `if (qualified) {…} else if (hasFormalDecl) continue;` **before** the ambiguity branch. Any untyped reference whose ID is formally declared therefore resolved as formal and returned before ambiguity could be considered. The parser was already correct: `parseRepo`'s family inference now skips IDs that are also formally declared, so the prose occurrence reached the graph as `qualified=false, authority=undefined, valid=true` — exactly the ambiguity input — and the graph discarded it on the formal shortcut.
- **Fix:** `graph.ts:114-135` computes `ambiguousAuthority = ref.authority === undefined && !ref.qualified && hasFormalDecl && hasSourceDecl` and evaluates it **before** either single-authority shortcut. Typed occurrences keep their authority: a `formal`-column link with only a source declaration still reports `never declared` (the "resolves a formal-column link only against formal declarations" regression is unaffected), and a `source`-column link still resolves only against source declarations.
- The test was not modified; the global-formal resolution reading was removed rather than the assertion.
- Worker verification: NOT RUN (no mid-flight tests; `bash` execution remains user-denied). Parent rerun of the same commands after this freeze is the gate.

## Owned paths changed

- `scripts/trace/types.ts` — documents the new optional `TraceRef.authority`.
- `scripts/trace/parse.ts` — column classification, per-occurrence authority, formal-column strictness, authority-keyed restatement demotion, scoped family inference.
- `scripts/trace/graph.ts` — authority-scoped link resolution plus ambiguity reporting.
- `scripts/trace/parse.test.ts` — corrected the malformed-formal-row expectation; one new regression.
- `scripts/trace/graph.test.ts` — four new regressions (three packet counterexamples plus the end-to-end malformed formal row).

`scripts/trace/index.ts` and `scripts/trace/index.test.ts` are **unchanged**: scope selection, `--required` counts, issue codes, severity mapping, JSON outcome fields and the `document-links-only` / `not_evaluated` assurance labels keep their existing contract.

## Repair 1 — explicit formal columns obey ID_GRAMMAR only

- `parse.ts:104-118` `parseTableHeader` now records *every* recognized formal ID column (`Req ID`, `AC ID`, `ID`, `Requirement ID`, `SRS`, `BRD(-OBJ)`) and every recognized historical column (`Candidate requirement`, `Source`, `Source group`), instead of only the first of each.
- `parse.ts:280-284` a token inside any explicit formal column is validated against `ID_GRAMMAR[kind]` alone. The historical multi-namespace grammar (`QUALIFIED_ID_GRAMMAR`) can no longer rescue `REQ-SUB-MOD-001`, and `parse.ts:285-288` keeps a rejected candidate out of the source authority (`qualified` now requires `valid`).
- Declarations still come only from the primary formal column, a heading, an ID field, an exact first-cell restatement, or a source-only table's source column — so historical headings/fields/candidate tables keep their established grammar and role (covered by the new `parse.test.ts` regression).
- Counterexample mapping: `REQ-SUB-MOD-001` in a `| Req ID |` row is now `role=declaration, valid=false, qualified=false`, absent from both `declared` and `sourceDeclared`, and reported as `malformed-id` by `graph.ts:205-217`.

## Repair 2 — authority is decided per occurrence, not globally

- `parse.ts:226-243` derives each occurrence's authority from its own cell: explicit ID column → `formal`; historical column → `source` when the token is namespace-qualified, `formal` when it is a bare numeric ID that the source column merely links (preserves the legacy numeric-source-column behavior).
- `parse.ts:364-378` family inference is now restricted to untyped occurrences (headings, ID fields, prose, first-cell cells). Typed occurrences are never reclassified by the old global pass, and a token declared under **both** authorities stays unresolved instead of silently picking one.
- `graph.ts:101-144` resolves each link against its own authority: qualified links only against source declarations/families, non-qualified links only against formal declarations, and untyped links that match both authorities report ambiguity. Counterexample mapping: historical candidate `REQ-VIS-001` + formal `REQ-001` + an AC row's `Req ID` cell holding `REQ-VIS-001` now yields exactly one `dangling-ref` for `REQ-VIS-001`; the valid `REQ-001`/`AC-02` links do not mask it.
- Ambiguity reuses the existing `dangling-ref` code and error severity — no new issue code, no new outcome field, no severity change. Message prefix: `ambiguous authority:`.

## Repair 3 — restatement demotion is keyed by authority and ID

- `parse.ts:336-348` the strong/weak restatement set is now keyed `authority:kind:id`. A strong formal heading `REQ-VIS-001` therefore demotes only a same-authority formal restatement (trace-matrix cell), and no longer demotes an explicit historical candidate declaration with the same spelling. Both declarations survive (`declared` **and** `sourceDeclared`), the explicit `REQ-VIS-001 → REQ-VIS-001` source mapping resolves, and no `duplicate-id` is raised because the two authorities are separate groups.

## Tests written (definitions only — NOT RUN)

Corrected (previously accepted malformed formal rows):

- `parse.test.ts` "parseRepo rejects multi-namespace formal IDs or lowercase IDs as declarations" — now asserts `REQ-SUB-MOD-001` in a `Req ID` column is an invalid declaration, is not qualified, and enters neither declaration map.

New:

- `parse.test.ts` "historical candidate columns keep the multi-namespace grammar that formal columns reject".
- `graph.test.ts` "buildTraceGraph reports malformed-id for a multi-namespace token in an explicit formal column, leaving the rest of the graph clean".
- `graph.test.ts` "buildTraceGraph resolves a formal-column link only against formal declarations".
- `graph.test.ts` "buildTraceGraph keeps a formal heading and a same-spelling historical candidate as separate declarations".
- `graph.test.ts` "buildTraceGraph reports ambiguity for untyped prose when both authorities declare the same ID".

Declaration count is now 20 graph / 28 index / 19 parse tests; no existing test was deleted or weakened, and the six historical source-mapping regressions are untouched.

Parent verification (parent-run, not by this owner — round 1 snapshot `b53141bfca1a-201d0b436183`: 66 PASS / 1 FAIL, the ambiguity node above; the required-slug audit passed with `issues: []`). Exact commands, to be re-run after this freeze:

```
rtk proxy node --import ./artifacts/runs/system-design-visualization-improvements/register-loader.mjs --test scripts/trace/*.test.ts
node --import ./artifacts/runs/system-design-visualization-improvements/register-loader.mjs scripts/trace/index.ts --slug system-design-visualization-improvements --required --json
```

## Preserved behavior

Approved formal grammar (`REQ`/`BRD-OBJ` single uppercase-alphanumeric namespace with `>=3` digits, `AC>=2` numeric, `SRS>=3` numeric); historical multi-namespace grammar in historical context; malformed-token capture (complete candidates, doubled separators, lowercase, short suffixes); forced `Req ID`/field rejection; exact-scope `missing-scope`/`empty-scope`; required formal counts; duplicate/orphan/unlinked/dangling/mapping/kind checks; source-family prose compatibility; fenced-code skipping; slug/artifact-file mapping; `document-links-only` assurance and `not_evaluated` execution evidence.

Source-derived expectation for the real slug: the canonical BRD/PRD/SRS carry no candidate/source columns, so no slug gains a source declaration and the new ambiguity path is unreachable there; the PRD `Req ID`/`AC ID` columns and `Req ID` reference column hold only formal IDs, so this repair should not add issues to `--slug system-design-visualization-improvements --required`. This remains an inference until the parent runs the exact audit.

## Risks / decision needs returned to the orchestrator

1. **Ambiguity code reuse (decision taken, not expanded).** Internet-facing outcome schema is unchanged, so an ambiguity is reported as `dangling-ref` with an `ambiguous authority:` message rather than a new code. If the approved contract requires a distinct code, that is a schema decision for the orchestrator.
2. **Broader strictness on secondary ID columns.** Any header recognized as an ID column (e.g. `Req ID` inside an AC table) now enforces the formal grammar for references too. Synthetic fixtures that placed a multi-namespace token in such a column previously survived as "historical"; a fixture that maps a source ID from a *candidate* column into a *formal* column (e.g. `REQ-PILOT-001` declared in a `| Req ID |` table and simultaneously mapped as a source) can now surface both a `dangling-ref` on the source link and an ambiguity. This is consistent with "formal links resolve only against formal declarations", but it is new noise on malformed fixtures.
3. **Dedup granularity.** `dangling-ref` is reported once per `kind:id`; when the first occurrence is an ambiguity, a later genuinely dangling typed occurrence of the same ID is suppressed. Existing behavior was also once-per-ID, so this is not a new class of suppression.
4. **No worker-run evidence.** All 5 new/corrected tests and the exact scoped audit are NOT RUN here by packet design and because `bash` execution was denied. Test-suite greenness and the actual `system-design-visualization-improvements` audit are unverified by this owner.
5. **Rate-based AC counts unchanged.** 2-digit `AC-01` style IDs remain formal declarations, so the CLI's per-AC status table (sorted string keys) keeps its existing ordering; no claim is made about that heuristic.
