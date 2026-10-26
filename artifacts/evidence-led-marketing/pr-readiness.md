# Evidence-led marketing: PR preparation checkpoint

This is implementation-PR evidence, not whole-initiative acceptance, a published category release, pilot authorization, model-efficacy evidence or an ROI claim. No remote CI result is asserted at this checkpoint.

## Exercised checks

| Check | Observed outcome |
| --- | --- |
| `pnpm test` | Entire root command completed successfully: CLI 1,273 tests / 64 files; eval scripts 85; freshness 62; outcome 23; trace scripts 16; benchmark 8; metrics 44; release 8; offline harness 24; product evidence 88; marketing resources 62. Aggregate 1,693 tests, not including separately repeated suites. |
| `pnpm mcp:test` | 209 tests / 12 files passed. |
| `pnpm test:marketing` | 62 offline resource tests passed. The same suites are included above; do not double-count them. |
| `pnpm build` | CLI production build passed; existing Vite configuration warning retained. |
| `pnpm mcp:build` | MCP production build passed; duplicate root `pnpm` key warning retained. This is not strict whole-CLI typecheck evidence. |
| `pnpm --dir website run typecheck` | Passed. |
| `SITE_URL=http://127.0.0.1:4321 pnpm --dir website run build` | Static export passed; CSP emitted for three HTML files. Deployment/header-host acceptance remains untested. |
| `pnpm --dir website exec playwright test` | 72 tests passed across desktop, mobile and tablet Chromium projects (51.9 seconds). This follows the separately retained historical 69-pass / 3-failure geometry checkpoint and correction. |
| `pnpm --dir website run lint:check` | Passed. |
| Package-owned changed-file ESLint | CLI changed files passed. MCP had one formatting diagnostic; its three-line call was collapsed without changing the assertion, then lint passed. A root invocation failed because the repository has package-owned, not root, ESLint configuration; that invocation is not reported as a source failure. |
| `pnpm validate:all` | 345 skills passed, zero failed, 71 warnings. Redundancy audit passed; injection scan had zero errors and one existing warning; freshness reported 18 non-high issues. |
| `pnpm audit:sdlc` | Passed, including the optional marketing workflow structural contract. |
| `pnpm audit:outcome` | 21 templates and six run records passed. |
| `pnpm check-alignment` | All skills meet the configured 70% threshold. Four below-90 warnings remain; strict-90 acceptance is not asserted. |
| `pnpm docs:capabilities:check` | Capability document up to date. |
| Installed-consumer runtime smoke | Five scenarios passed with workflow `1.1.8`: full 12-skill assembly and companion execution; copied flattened-layout execution; omitted-category isolation; missing-PM fail-closed behavior; explicit/default/disabled workflow variants. |
| Curated scored-run verification | In the isolated staged-file tree, all three registered historical scored runs verified. The four incomplete local marketing preparation/run directories are not staged or registered as completed scored runs. |
| Stored evaluation regression gate | Exited zero with no newly available scored run: all registered historical runs were already in history. No new regression/efficacy acceptance is inferred. |
| `pnpm verify:release-tags` | Initially failed because the new marketing prefix lacked a publish-workflow trigger. Adding only `marketing-v*` to the existing generic tag workflow corrected the gate: all 27 categories and one releases entry are reachable. No tag/release/deployment was created. |
| `pnpm docs:scan` | Exited zero with 39 files reporting undocumented members, including optional SDLC additions. Not claimed documentation-clean. |
| Advisory `git diff --cached --check` | Reports whitespace in byte-preserved captured/archived evidence, WebVTT separators and deterministic generated Markdown. Those bytes remain unchanged to preserve source/export identities; whitespace-clean is not asserted. |
| Public archive integrity | Parent verified nine report exports, 176 stopped-run artifacts and two selected screenshots against source/export digests and byte-identity flags. Consumer `candidate_root` is the sole sanitized report-field change. No personal absolute workstation path matched the bounded public-archive check. |

## Candidate identity

The current consumer smoke used narrow registry fixture SHA-256 `0cf6ec80db33b9e685aa84f18c9a18d3c96ab83cc5dbde625ed260c9490d2cbf` (1,412 files) with workflow `1.1.8`. This is not the whole website tree or a fetchable remote release. The historical video and earlier accepted consumer record retain fixture identity `ee18d7f5…`; do not rewrite those immutable captures to pretend they used the later metadata.

Reviewed player SHA-256: `a39ab7ff5f68d49dbf9fe26402ad91355321cb7b96918d6e91905e5a824cd68b`.

Reviewed website E2E SHA-256: `e4de111460908d810c0f6e55167589c6356f6abf6c697472ebcb4cd81132efbf`.

Accepted MP4 SHA-256: `b129cb713dd681e6ad776d7ec35461454f165299e20a4227580712a12ea1c32f`.

## Corrective checks and independent review

- The first canonical document-ID migration failed actual `audit:trace`: the walkthrough redeclared requirement/acceptance IDs and two BRD objectives lacked recognized declarations. After document-only correction, the parent reran the gate successfully: three objectives, 18 requirements, 34 acceptance criteria and 10 SRS cards; all 34 ACs structurally Covered. Eight unrelated system-design warnings remain. Structural graph coverage does not imply behavioral AC satisfaction or approved product-evidence authority records.
- The first curated-tree secret scan found two `generic-api-key` matches. Independent recomputation established both are SHA-256 hashes of public `skill/case/arm` lane identifiers, not credentials. Two rule-scoped exact-path AND exact-record-line exceptions preserve the immutable audit bytes and default detection. Parent exercised the actual configuration: exact records accepted; changed value, another key in the same file, outside path and wrong-arm value all detected. The final curated public tree scan covered 24.86 MB with no findings using installed Gitleaks 8.30.0; CI pins 8.30.1. Independent review approved the extension and inspected the five-control helper.
- Isolated `calculate-tokens` and `generate-indices` reproduced the reviewed generated surfaces without active-source copyback: 10 key outputs, 99 configured-workflow files, 27 category indices and 71 rule/specialist files matched. Because marketing is optional and absent from the root installation selection, its three mirrors were verified separately by executing the actual local `WorkflowTransformer` against canonical source; command/prompt/skill bytes and hashes all matched. Other unowned optional wrappers were preserved, not falsely described as regenerated. Dependency reuse was local and patch-divergent from the lock; no clean-install or native-host-execution claim.
- Independent combined code, public-package and canonical-document review approved the scoped implementation PR, including preserved meanings/statuses and 20 existing local Markdown-link targets. The separate exact Gitleaks extension review also approved. Final commit scope and remote CI remain delivery checkpoints; this is not whole-initiative acceptance.

### First remote CI result and historical scan correction

PR [#263](https://github.com/HoangNguyen0403/agent-skills-standard/pull/263), initial commit `7ef91867`, passed remote unit tests, product-evidence consumer integration, website tests/build, harness, CodeQL, SkillSpector and dependency review. Production dependency audit failed on `body-parser` and `multer` advisories; the full-history secret scan failed on 17 older records. The dependent skill-validation job was skipped, not passed.

Independent historical-source inspection classified the 17 records as one synthetic harness-test sentinel and four public file SHA-256 values repeated across four mirrors. All four hashes were independently recomputed against their declared base commit. Five additional inherited-rule allowlists bind the respective exact file path AND full record line/value; no historical payload or scanner scope changed. Parent controls accepted original historical payloads while detecting changed harness values, changed snapshot digests, wrong resource/digest pairings, an added API key and payload copies outside the allowed path. The corrected full-history scan with installed Gitleaks 8.30.0 scanned 787 commits / 74.24 MB with no findings; CI uses 8.30.1 and its next result remains to be observed.

The dependency correction pins only `express@5>body-parser` to `2.4.0` and `multer@2` to `2.5.0`, preserving legacy callers and every unrelated resolution. An incidental `legacy-javascript` update was rejected and its original `0.0.3` resolution restored. Independent review approved the actual package/lock/changelog diff. Parent production audit reports no known vulnerabilities; frozen lockfile validation and a separate frozen installation with lifecycle scripts disabled passed. On that isolated patched installation, the complete root chain passed 1,693 tests and MCP passed 209 tests. Actual loopback HTTP smoke verified gzip JSON parsing through body-parser 2.4.0 and multipart upload byte/name preservation through multer 2.5.0. The server Jest command exited 1 because the repository contains no matching unit tests; it is not represented as a test pass, and the real middleware smoke supplies bounded runtime verification instead.

## Six explicit initiative dispositions

1. **T08 enabled collection:** user-deferred; no provider/SDK/collector, enabled playback/copy/payload event criteria not done. Disabled-path navigation, clipboard and playback verified locally.
2. **T11 evaluation:** exactly 2/246 attempts preserved; effective-system-prompt digests differ, comparability/efficacy unverified, 244 attempts unlaunched.
3. **T12 whole initiative/release acceptance:** open; passing implementation checks do not turn incomplete evaluation into acceptance.
4. **T13 pilot handoff:** open; no real pilot, recruitment, posting, deployment or release authorized.
5. **Host snapshot hook:** not deployed; user retained the current boundary, with no debugger/plugin/restart/configuration change.
6. **Historical prompt recovery:** original effective arrays not recovered through exposed read-only interfaces; no causal pair claim.

Private raw sessions, daemon records and full audits stay outside the repository. Original stopped-run public artifacts are preserved under [stopped-evaluation](stopped-evaluation/PROVENANCE.md), not fabricated into score results. See [screenshots](README.md#contents) for the actual local outcome. Exact total multi-agent cost is unavailable; no zero-cost claim is made.
