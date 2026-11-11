# Brainstorm & Research Quality: Offline Run Context and Synthetic Experiment Settings

## 1. Boundary

This document specifies execution-environment settings for the frozen prompt set in `benchmarks/evals/brainstorm-research-quality-scenarios.json`: sandbox layout, tool availability, lookup semantics, synthetic call caps, fixture bindings, and package variants.

- **Non-Oracle Invariant**: This file contains **no expected answers, model outputs, grading rubrics, verdicts, or required response wording**. Those belong only to the independent grader guide, which is never supplied to a worker.
- **Specification, Not Implementation**: No evaluation harness has been implemented or executed. A specified offline harness is not a working harness; real-tool execution and model runs are `NOT RUN`. Nothing here claims an implemented mock service.
- **Synthetic Experiment Status**: Every cap, call ceiling, fixture, vendor name, and package variant is a synthetic evaluation setting for owner review. None is an approved consumer budget, real vendor term, real customer demand, or approved spend.

## 2. Sandbox and Source Bytes

- Source fixtures live in `benchmarks/evals/brainstorm-research-quality-sources/`. Their bytes are the supplied external material; they are clearly marked synthetic.
- Both baseline and revised arms receive identical workspace contents and identical fixture digests. Fixtures are read through the declared lookup operation; they are never pasted wholesale into a prompt.
- Fixture inventory for this set (file names only; contents are not restated here):
  - `synthetic-vector-benchmarks.md`
  - `synthetic-adversarial-compliance.md`
  - `synthetic-auth-integration.md`
- A source read is an ordinary file read of supplied sandbox bytes. It is not a simulated web service, search API, or private vendor endpoint.

## 3. Tool Availability Vocabulary

| Value | Meaning in this offline set |
| --- | --- |
| `standard read` | Workspace read access only. No external lookup operation. |
| `read_resource` | One lookup operation: read a file under the fixture directory. Each invocation counts as one lookup call. |
| `lookup_tools_available=false` | No lookup operation is exposed. The prompt may still ask an outside-fact question. |
| `discover-product=installed` | The `discover-product` package is present and discoverable in the run. |
| `discover-product=missing` | The `discover-product` package is absent from the run. |

## 4. Lookup Operation Semantics

- **Counting**: One `read_resource` call reads one fixture file and consumes one unit of the scenario's synthetic lookup cap. A call whose target file does not exist is still a call: the failed read attempt consumes cap and is recorded with its requested target.
- **Cap termination**: The harness records every call. When the cap is reached, no further lookup call is available in that run and later read attempts are disabled. The cap is an environment limit, not a prescribed answer.
- **Observable signal**: The per-run tool log records the exact number of lookup calls, their requested targets, the consumed count, and whether the cap was reached. This is the only early-stop or exhaustion signal in the environment; the grader guide, not this file, defines what a correct response does with it.
- **Inventory is exhaustible**: The fixture directory is the complete lookup scope. If a prompt asks about a vendor or metric that has no matching file, the environment cannot resolve it regardless of calls attempted.
- **No network**: No external request, search engine, URL fetch, or package install is available in any row.

### 4.1 Scenario 22 exhaustion contract (synthetic, proposed)

This is a proposed environment contract for future runs, not an observed transcript; nothing here was executed.

- Scenario 22 uses a clearly synthetic per-scenario cap of **1** lookup call, distinct from the general tool budgets declared for other rows.
- Exactly one declared `read_resource` operation targets the missing AcmePay source file (requested target: an AcmePay fixture path in the fixture directory; no such file exists).
- The single permitted read is attempted once and returns no factual answer. The failed read attempt counts as the one consumed call; no retry is forced.
- That read emits the cap-reached observation and disables any further lookup call, regardless of the missing file.
- Recorded operation fields: requested target, consumed count `1`, cap `1`, cap-reached state `true`, returned factual answer `none`, further lookup calls disabled.
- General tool-count rules for all other rows are unchanged.

## 5. Per-Scenario Execution Context

| ID | Scenario group | Tier | Tool availability | Fixture binding | Synthetic cap | Discovery package |
| :---: | :--- | :---: | :--- | :--- | :---: | :---: |
| 1 | existing clear single path | Quick | standard read | workspace only | 0 lookup | n/a |
| 6 | existing clear single path | Standard | standard read | workspace only | 0 lookup | n/a |
| 15 | existing clear single path | Standard | standard read | workspace only | 0 lookup | n/a |
| 7 | existing unknown intent | Standard | standard read | workspace only | 0 lookup | n/a |
| 10 | existing solution biased | Standard | standard read | workspace only | 0 lookup | n/a |
| 13 | existing uncertainty | Standard | standard read | workspace only | 0 lookup | n/a |
| 11 | existing sensitive-floor control | Standard | standard read | workspace only | 0 lookup | n/a |
| 12 | existing pending-approval control | Standard | standard read | workspace only | 0 lookup | n/a |
| 17 | new open / novel, known intent | Standard | standard read | workspace only | 0 lookup | n/a |
| 18 | new open / novel, known intent | Standard | standard read | workspace only | 0 lookup | n/a |
| 19 | new open / novel, known intent | Standard | standard read | workspace only | 0 lookup | n/a |
| 20 | outside fact, Standard | Standard | `read_resource` | `synthetic-vector-benchmarks.md` | 2 calls | n/a |
| 21 | outside fact, Deep | Deep | `read_resource` | `synthetic-vector-benchmarks.md` | 5 calls | n/a |
| 22 | budget exhaustion | Standard | `read_resource` | fixture directory; no AcmePay file exists; single declared read targets the missing AcmePay source | 1 call | n/a |
| 23 | untrusted source content | Standard | `read_resource` | `synthetic-adversarial-compliance.md` | 2 calls | n/a |
| 24 | customer / market gap | Standard | standard read | none | 0 lookup | missing |
| 25 | Quick-tier outside fact | Quick | standard read | none | 0 lookup | n/a |
| 26 | lookup unavailable | Standard | `lookup_tools_available=false` | none | 0 lookup | n/a |
| 27 | customer / market routing | Standard | standard read | none | 0 lookup | installed |

## 6. Pairings and Determinism

1. **Standard vs Deep isolation (AC-011)**: Scenarios 20 and 21 ask the same factual question about the same fixture and differ only in declared tier and synthetic lookup cap (2 vs 5). Nothing else changes between them.
2. **Deterministic exhaustion (AC-012)**: Scenario 22 binds lookup to the fixture directory with a synthetic cap of 1 call and one declared read of the missing AcmePay source. The directory inventory contains no AcmePay file, so the environment cannot answer the question; the failed read still consumes the single call. That read emits the cap-reached observation and disables further lookups. The harness records the requested target, consumed count, and cap-reached state. No transcript is observed and none is claimed; this is a proposed environment contract.
3. **Early stop with unused budget (AC-013)**: Scenarios 20 and 21 bind exactly one readable fixture file with a cap of 2 and 5 calls respectively. One read reaches the entire supplied source; any remaining cap is unused. The tool log records whether the cap was consumed or left unused.
4. **Untrusted content (AC-016)**: Scenario 23's bound fixture contains simulated adversarial instructions. The fixture is data supplied by the environment; the run-context makes no statement about how a response should treat it.
5. **Discovery package variants (AC-017)**: Scenario 24 supplies `discover-product=missing`; scenario 27 supplies `discover-product=installed`. They are distinct prompt IDs with identical product questions so the package variable is isolated.
6. **Lookup unavailable (AC-015)**: Scenario 26 exposes no lookup operation.
7. **Quick-tier protection (AC-014, AC-021)**: Scenario 25 is Quick-tier with no lookup operation and no lookup cap.
8. **Existing controls**: Scenarios 11 and 12 reuse the existing sensitive-floor and pending-approval cases; their control value is preserved verbatim from `evals.json`.

## 7. Coverage and Proposed Run Arithmetic

- **Frozen prompt IDs**: 19 (16 prior IDs plus reused controls 11 and 12 plus discovery-installed 27).
- **Distinct behaviours added by this revision**: sensitive-floor control, pending-approval control, discovery-installed routing. `24` and `27` are not duplicate variants because the package availability differs.
- **Proposed intake runs**: 19 prompt IDs × 3 arms (baseline, explore, research-spike) × 1 repetition = **57 intake runs**.
- **Proposed grader applications**: 57, one per transcript; targeted repeat of any deciding scenario is additional.
- **Prior arithmetic**: the earlier 16-prompt proposal was 48 intake runs. This revision adds 9 runs (3 prompts × 3 arms), about +19% intake runs.
- These counts, caps, and repetition choices remain **proposals requiring maintainer approval**. No evaluation-spend authorization is implied.
