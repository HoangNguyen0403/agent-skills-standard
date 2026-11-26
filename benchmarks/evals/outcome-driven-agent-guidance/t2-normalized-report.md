# T2 normalized routing — FINAL

Status: `DONE_WITH_CONCERNS` — focused registry acceptance passed; caller association and production/distribution qualification remain unrun.

## Scope

Changed only the five approved source paths:

- `skills/flutter/flutter-cicd/SKILL.md` — narrowed keyword metadata to the canonical `flutter cicd`; file triggers unchanged.
- `mcp/src/tools/index.ts` — documented normalized associated concepts and atomic multiword values; schema shape unchanged.
- `mcp/src/server.ts` — aligned keyword-tool guidance with atomic concepts, requested-work association, and literal phrase matching.
- `cli/src/services/IndexContentBuilder.ts` — replaced the contradictory literal-words/semantic-intent instructions with atomic concept guidance.
- `mcp/test/SkillIndex.spec.ts` — real-registry tests for canonical retrieval, its TDD composite, split-token rejection, and unrelated concepts.

No parser, matcher, ranking, schema, generator, runtime, export, or file-routing algorithm changes. No commit, model/provider call, paid run, distribution, or activation.

## Source identity

SHA-256 of the final five source files:

| Path | SHA-256 |
| --- | --- |
| `skills/flutter/flutter-cicd/SKILL.md` | `411050f5fd90e60baffaa2e777b6e086b5a9019f263d357932e8bbaae30a9009` |
| `mcp/src/tools/index.ts` | `5eaa6e912d35d94b039c1f43a4b7f97b415716fc505148876301ed23007d3636` |
| `mcp/src/server.ts` | `8954b69aa48c56c929df468d5d4ef55ebfaa4aa2d8937e5d96e132b42270c9ae` |
| `cli/src/services/IndexContentBuilder.ts` | `0aba97dab60abc19811a740b1d4dbd1b73418cfe0204301f4781dc0b20de9b91` |
| `mcp/test/SkillIndex.spec.ts` | `9dfd0150e0707889a40e5f082dc92b8e6b03a4ae36e3118fd59b7cf030c37521` |

## Acceptance and verification

- **AC-09: PASS (focused registry integration coverage).** The real registry does not select Flutter CI/CD or its solely induced `common-tdd` composite for the authoring concepts covered by the suite, including unrelated Flutter navigation/workflow concepts.
- **AC-10: PASS (focused registry integration coverage).** Atomic `keywords: ["flutter cicd"]` selects the actual Flutter CI/CD registry skill and `common-tdd`; separate `"flutter"` and `"cicd"` entries do not get joined. Existing unrelated literal routing cases remain in the focused suite. The Flutter skill's file-trigger declarations were not changed.
- **AC-15 / caller association: NOT RUN.** No raw-request model selection or live tool-call capture was performed. Registry retrieval for a supplied concept does not prove that a caller selects that concept appropriately.
- **Production file routing: NOT QUALIFIED.** The existing fallback-derived file-route test is not evidence that production YAML routing metadata discovers the skill.
- **Static index generation: source guidance updated; generator execution NOT RUN.** No generated output or distribution parity is claimed.

The initial implementation's `SkillIndex.spec.ts` run passed 92 tests, but that suite did not import `server.ts`; it did not verify the modified MCP server template.

The parent consumer check before correction:

```text
rtk pnpm --filter ./mcp exec vitest run test/http-transport.spec.ts
```

failed before tests ran with Vite/OXC `PARSE_ERROR` at `src/server.ts:255:125`: the unescaped inline Markdown backticks terminated the tool-description template literal. This introduced source regression is retained; the existing consumer test correctly rejected it.

The source correction escapes the inline Markdown backticks. Final corrective command, run once:

```text
rtk pnpm --filter ./mcp exec vitest run test/SkillIndex.spec.ts test/http-transport.spec.ts
```

Observed output: `Test Files 2 passed (2)`; `Tests 93 passed (93)`; duration `605ms`. The HTTP transport test exercised the server startup path that the earlier SkillIndex-only run did not. Vite emitted its existing native-config-loader warning about CommonJS/ESM syntax in `vitest.config.ts`; the run passed.

## Retained historical evidence and limits

The raw-query failures in `t2-review.md` remain unchanged. Earlier review rejected the raw requests “Set up a CI pipeline for a Flutter app” and “Configure GitHub Actions workflow for a Flutter app” after phrase narrowing; the corrective candidate still missed “Pipeline setup for Flutter applications” and overmatched a non-CI Flutter navigation/workflow case. The raw-positive tests for these inputs were removed because the approved AC09/10 contract now starts from normalized associated concepts. They were not converted into new raw-query negatives, and they do not establish caller normalization.

No live caller qualification, full suite, build/lint/typecheck, index generation, consumer discovery, independent cumulative review, human acceptance, release, or activation was run. Independent review remains required before acceptance; separate grants remain required for caller/model qualification and distribution.
