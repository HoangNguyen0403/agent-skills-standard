# Skills currency audit

Observed: **2026-11-26**. Scope: the approved [Direction brief](../brd/brd-skills-currency-audit.md) and [Subagent-Driven execution plan](../prd/prd-skills-currency-audit.md). **Audit findings only; no skills, dependencies, runtime versions, generated mirrors, or export boundaries were changed.**

## Decision

Improve correctness and compatibility before adding new syntax or adopting a diagram package. The strongest actionable findings are invalid PHP intersection syntax, Java preview/pinning advice, cancellation propagation, Dart assertion-based null safety, Swift concurrency guarantees, JavaScript module-contract preservation, and unconditional Go wrapping.

Retain the existing Go error/logging foundation, supported-project language floors, semantic JSON diagram source, editable draw.io delivery, and raster-only offline HTML contract. Newer upstream versions are not themselves proof that older-compatible guidance is wrong.

Research is complete. This report is submitted for independent static review; human acceptance of findings remains with the requester. No remediation, merge, release, deployment, third-party installation, or paid behavioral evaluation is authorized by this report.

## 1. Evidence and verification boundary

- Four independent research assignments used **Personal · Analysis & Review**, `omp/openai-codex/gpt-6.1-sol`, `ask`, `medium`; coordinator integrated the report. No premium profile.
- Researcher-reported SHA-256 values for **79 distinct local files** were reconciled against current bytes; **no mismatches**. This proves byte identity for the inspected files, not completeness, semantic correctness, runtime behavior, or enforcement of agent permissions.
- References to existing evals describe static definitions. **No tests, builds, compiler/analyzer matrices, renderer/browser checks, or model evaluations ran.** Future proofs below are proposed acceptance checks, not observed passes.
- Versions are dated primary-source observations. Exact patch versions/support horizons not established by inspected sources remain explicitly unknown. Preview, LTS, vendor support, language minimum, compiler, SDK, and deployment runtime are separate contracts.
- Detailed source excerpts, findings and digest receipts are retained with the assignment evidence under `.agent/sdd/skills-currency-audit/`. Source bindings and primary-source reconciliation are evidence, not approval credentials.

## 2. Go/backend reference assessment

| Supplied claim | Assessment | Minimal improvement and compatibility |
| --- | --- | --- |
| Wrap with `%w`, not `%v` | Already covered; unconditional wrapping is overbroad | `skills/golang/golang-error-handling/SKILL.md:23,34` mandates wrapping and forbids bare propagation. [Go's official contract][go-wrap] makes wrapping an API-exposure decision. Add useful missing context; preserve identity when part of the caller contract; permit direct propagation or domain translation when appropriate. `%v` does **not** redact the rendered message. `%w`/Is/As require Go 1.13. |
| Use `errors.Is`, not `==` | Covered; retain with scope | `SKILL.md:28,35` and `references/error-wrapping.md:15-20` already teach sentinel matching. Use tree-aware matching for wrapped sentinels; ordinary `err != nil` success checks remain correct. Avoid a universal ban on equality detached from the caller contract. |
| Use `errors.As` for typed errors | Covered; retain, add an optional gated alternative | `SKILL.md:29` and wrapping reference `:23-29` already cover typed extraction. `As` finds the first matching error, not every validation failure. [Go 1.26][go126] adds `AsType`; add a Go-1.26+ reference example without removing older-compatible `As` or its broader target contract. |
| Aggregate independent validation errors with `errors.Join` | Missing from the inspected Go error skill/reference/eval; version-gated addition | [Go 1.20][go120] introduces multi-error wrapping. [Join][go-join] discards nil error interfaces, returns nil for empty/all-nil input, and exposes `Unwrap() []error`. [Is/As][go-errors] traverse the tree; `errors.Unwrap` alone does not unwrap joined children. Typed-nil pointers inside an error interface are not nil success. Join aggregates errors, not a field-response schema or concurrent execution. |
| Add operation/identifier context | Covered; qualify with safe-data policy | Preserve useful context and approved correlation fields. Do not assume every tenant/order identifier is non-sensitive or that joined/free-form messages are automatically scrubbed. Existing redaction rule: `skills/golang/golang-logging/SKILL.md:24,48`. |
| Log once at the top, never log and return | Single-owner convention already covered; no universal layer | Existing boundary ownership: logging skill `:22,39,45`, error skill `:22`. Choose the handling/translation owner per request/job/CLI, not always handler/service/middleware. Shared error eval `skills/common/common-error-handling/evals/evals.json:35-37` offers log-and-rethrow among alternatives without qualifying logging ownership. Reconcile that oracle with the Go single-owner convention rather than adding another logging rule. |
| No string error comparison | Covered; retain | Existing error skill `:35` already rejects brittle string matching. Preserve the sentinel/type contract rather than adding wording-only eval anchors. |
| Internal errors differ from client errors; no DB leakage | Covered; retain and align examples | `skills/common/common-error-handling/SKILL.md:29-46` already separates layers and forbids raw DB/stack leakage. Its `references/implementation.md:5-10` has a flat envelope while `references/api-error-contract.md:2-10` and eval `:6-7` nest under `error`. Align documentation to the named canonical contract without silently changing existing application responses. |

Additional concrete Go deltas:

- **Typed context key inconsistency:** logging skill `:23,47` requires typed keys; `references/slog-patterns.md:24-28` uses `ctx.Value("trace_id")`. Use the same private typed key/accessor for insertion and retrieval; pass the available request context to context-aware logging. Context alone does not extract attributes without handler support.
- **Loop-capture versioning:** `skills/golang/golang-concurrency/SKILL.md:38,47,56` applies older loop-capture advice unconditionally. [Go 1.22][go122] changes newly declared iteration variables. Qualify by effective module/per-file language semantics and distinguish `:=` from reassignment to an outer variable. No blanket upgrade or unconditional `task := task` requirement.

**Proof for later remediation:** exercise preserved versus intentionally hidden error identity, already-contextual propagation, empty/all-nil/typed-nil and nested joined errors, sibling sentinel matching and first typed match, approved client-envelope fields, secret-bearing nested messages, one intended boundary log, typed-key correlation propagation, and language-version-sensitive loop capture. Existing error/logging/concurrency evals mostly inspect words; they do not establish those outcomes.

## 3. Supported-language currency

“Freshness pin” below is the category's **reviewed upstream reference**, not a consumer runtime minimum. Pins and review dates are in `skills/metadata.json`. Source-observed versions are not instructions to upgrade every project.

| Language | Local guidance / freshness pin | Official stable/support observation | Action and consumer gate |
| --- | --- | --- | --- |
| Go | No language-wide minimum in `golang-language`; feature gates 1.13 errors / 1.21 slog. Pin **1.24.0**, reviewed 2026-06-17 (`metadata.json:556-564`). | [Release history][go-releases]: **1.27.4**, latest observed patches **1.27.4 / 1.26.11**; supported families **1.27 / 1.26** under the two-newer-major-release policy. No separate LTS claim. | Reconcile old review pin; do not describe 1.24 as security-supported. Preserve intentional source compatibility, inspect `go.mod`/`go.work`, and gate Join at 1.20, loop semantics at 1.22, AsType at 1.26. |
| JavaScript | **ES2022+** (`javascript-language/SKILL.md:3`); Node pin **22.0.0**, reviewed 2026-07-15 (`metadata.json:384-392`). | [Ecma publication][ecma]: **ECMAScript 2026**, 17th edition. [Node releases][node-releases]: **26.13.1 LTS**; 24 and 22 also LTS; 27 is alpha. ECMAScript itself does not provide Node's support lifecycle. | Retain ES2022 floor. Preserve `.cjs`/`.mjs`/package loader semantics; inspect browser/Node implementation before new built-ins. Node 22 remains a supported family; a category pin is not the newest patched deployment. |
| TypeScript | No explicit compiler minimum; `satisfies` used (`typescript-language/SKILL.md:34,62`). Pin **5.8.0**, reviewed 2026-07-15 (`metadata.json:360-368`). | [Download page][ts-download] and [release announcement][ts7]: **7.0** stable native compiler; exact latest patch unknown. 7.1 was observed as beta, not stable. Fixed maintenance/EOL horizon not established. | Gate `satisfies` at 4.9. Check locked compiler, target/lib, module resolution, runtime APIs, plugins and compiler-API consumers. TS7 does not ship a compiler API and changes defaults including `types`/`rootDir`; do not force an upgrade or assume diagnostics MCP availability. |
| Python | **3.11+** (`python-language/SKILL.md:3`). Pin **3.13.0**, reviewed 2026-06-29 (`metadata.json:780-788`). | [Downloads][python-downloads] identifies **3.15.2** source; [support table][python-support]: 3.15/3.14 bugfix, 3.13/3.12/3.11 security-only; 3.11 scheduled EOL October 2027. | Retain supported 3.11 compatibility. Distinguish future-stringized annotations from 3.14+ deferred evaluation; explicitly select text-file encodings across 3.15's UTF-8-default change. Do not inject new built-ins/syntax into a 3.11 consumer. |
| Java | **21+** (`java-language/SKILL.md:3`); tooling restricts LTS to 17/21 (`java-tooling/SKILL.md:26`). Pin **21**, reviewed 2026-07-15 (`metadata.json:628-636`). | [OpenJDK][java-ga]: **27.0.1.1 GA**. [Oracle roadmap][java-support]: **25 latest released LTS**, 27 non-LTS. Oracle customer support terms are vendor-specific, not universal OpenJDK guarantees. | Retain 21 minimum. Update closed LTS enumeration; separate stable virtual threads from preview StructuredTaskScope, and qualify pre-24 monitor-pinning advice. Verify vendor, build plugins, runtime, and preview policy. |
| Kotlin | **1.9+** (`kotlin-language/SKILL.md:3`). Pin **2.1.0**, reviewed 2026-07-15 (`metadata.json:604-612`). | [Official history][kotlin-releases]: **2.4.21** stable; 2.5.0 planned, not stable. The stated 2.4+ JVM-stdlib security window is not an all-components LTS promise. | Preserve old syntax where required. Fix cancellation swallowing independently of version upgrades. For 2.4 features, distinguish stable versus experimental and reconcile KGP/Gradle/AGP/compiler-plugin and JVM-target compatibility. |
| Swift | No language minimum; package example uses tools **5.9** (`swift-tooling/references/implementation.md:6-11`). Pin **6.1.0**, reviewed 2026-07-15 (`metadata.json:704-712`). | [Official installation page][swift-install] exposes **6.4.3-RELEASE** artifacts and distinguishes development snapshots from official releases. Fixed LTS/security-support horizon **unknown** from inspected policy. | Separate compiler, language mode, package tools version, SDK and deployment availability. Correct struct/thread-safety and Task-hierarchy claims. Swift 6 data-race checking is a language-mode contract; existing 5.9 consumers are not automatically invalid. |
| PHP | Generic **8.x**, mixed feature minima (`php-language/SKILL.md:3,36-43`). Pin **8.4.0**, reviewed 2026-05-16 (`metadata.json:756-764`). | [Release announcement][php86]: **8.6**, released 2026-11-19; exact latest patch unknown. [Support table][php-support]: 8.4/8.5/8.6 active, 8.2/8.3 security-only; 8.2 security ends 2026-12-31. | Fix invalid scalar intersection first. Label 8.0 union/match/promotion, 8.1 intersection/readonly, and 8.6 readonly defaults separately. Older syntax support is not a claim that an EOL engine is deployment-safe. |
| Dart | **3.x**, wildcard gate **3.7+** (`dart-language/SKILL.md:3,31`). Pin **3.8.0**, reviewed 2026-07-15 (`metadata.json:336-344`). | [Official stable-channel manifest][dart-stable]: **3.14.1**, dated 2026-11-17. [SDK policy][dart-sdk] supports latest stable only; this is distinct from package language compatibility. | Preserve feature minima and language version derived from SDK-constraint lower bound; respect Flutter's bundled Dart. Remove assert as sufficient production null proof. Keep 3.15 unreleased features out of defaults; no blanket floor uplift. |

### Relevant newer-release deltas: Kotlin, Swift and Dart

These are concrete comparisons with existing guidance, not a requirement to adopt every feature in a new stable release.

| Language / affected local guidance | New stable versus experimental behavior | Retain / adapt / defer decision and compatibility | Observable future verification |
| --- | --- | --- | --- |
| **Kotlin:** `skills/kotlin/kotlin-language/SKILL.md:28-36` covers older-compatible classes/extensions; `skills/kotlin/kotlin-best-practices/SKILL.md:33-34` prescribes private mutable backing properties with public read-only views. | [Kotlin 2.4 notes][kotlin24] stabilize **context parameters and explicit backing fields** at **2.4.0**. Explicit context arguments/callable-reference cases are excluded from the stable context-parameter guarantee; **collection literals remain Experimental**, requiring explicit opt-in. A stable compiler release does not make every feature on its release-notes page stable. | **Adapt a version-gated reference**, not the 1.9 default: show explicit backing fields as an alternative where they preserve the public read-only/private-mutable contract; retain the existing backing-property idiom for older projects. Context parameters are optional when an explicit contextual dependency helps, not a replacement for every ordinary parameter/DI boundary. **Defer experimental syntax by default** and mass rewrites. Check KGP, compiler plugins, Gradle/AGP, platform and bytecode targets. | A 1.9 consumer receives compatible backing-property code; a 2.4 consumer's alternative compiles and preserves external read-only access/internal mutation. A no-experimental-features scenario does not emit collection literals or experimental explicit context arguments. No such compilation or model evaluation ran. |
| **Swift:** `skills/swift/swift-language/SKILL.md:23-25,36-38` covers optional/protocol/value-type choices; the existing tools-5.9 package example remains a compatibility input. | [Swift 6.4 announcement][swift64] introduces optional opaque/existential shorthand (`some P?` / `any P?` instead of parenthesized forms), **borrow/mutate accessors**, and non-copyable ownership/collection facilities. It also adds async defer and task-cancellation shields. These are released 6.4 additions, not a guarantee that every related library API back-deploys to every Apple OS. | **Adapt an optional 6.4 reference** for optional-type syntax; retain older-compatible forms where required. Assess borrow/mutate accessors only for a concrete ownership/copying problem; **defer blanket collection/ownership rewrites**. Existing value semantics do not prove zero-copy behavior or thread safety. Keep compiler, language mode, tools version, SDK and per-API deployment availability separate; runtime availability of individual additions remains unverified here. | A tools-5.9/older-compiler task receives no 6.4-only syntax; a declared 6.4 example type-checks with the intended optional protocol type and ownership semantics. If ownership changes are later proposed, verify non-copyable lifetime/access rules and measure the actual copy/allocation claim; do not infer a speedup. Cleanup examples must exercise cancellation, not silently suppress it. |
| **Dart:** `skills/dart/dart-language/SKILL.md:26,34,44` prefers immutable fields and avoids complex/async constructor logic; traditional constructor guidance is not invalidated by newer shorthand. | [Official primary-constructor documentation][dart-primary] requires **language version 3.13+**. Declaring parameters induce fields only with `var` or `final`; the shorthand changes declaration syntax, not the intended runtime behavior. Primary constructors constrain additional generative constructors; const forms must satisfy final-field/initializer rules. | **Adapt a feature-gated reference**, retaining traditional constructors for older language minima and complex existing constructor/factory contracts. Prefer `final` where immutability is intended; preserve validation/initialization semantics and the existing no-complex-async-work invariant. **Defer mass conversion and a blanket 3.13 floor**. Check the package SDK-constraint lower bound/effective language version and Flutter's bundled SDK, not merely the installed compiler. | A package in pre-3.13 language mode receives traditional syntax; a 3.13+ fixture verifies induced final fields, parameter-versus-field initialization, and existing factory/redirecting-constructor behavior. Deliberately older language mode must reject the gated syntax. No analyzer/compiler or runtime case ran. |


## 4. Prioritized existing-rule corrections

Priority is remediation order, not a claim of an observed production incident. Corresponding category maintainers are proposed owners; approval to implement is still required.

| Priority / finding | Local evidence | Independent basis and minimal action | Observable future proof |
| --- | --- | --- | --- |
| **P1 PHP invalid example** | `skills/php/php-language/references/implementation.md:35-39`: `string&Countable` | [PHP declarations][php-types] permit only class types in intersections, since 8.1. Use a complete meaningful `Countable&Traversable` object example; keep union demonstration separate. | Complete example compiles and accepts an object implementing both interfaces; scalar intersection is rejected. |
| **P1 Java preview leakage** | `java-concurrency/SKILL.md:28`, `references/structured-concurrency.md:20-43`, language `references/example.md:40-49` | [JDK 21][scope21] and [JDK 27][scope27] StructuredTaskScope are preview; APIs changed. Separate stable virtual threads from explicitly opted-in, exact-JDK preview examples. | A previews-forbidden Java 21 scenario compiles with stable APIs; declared preview examples compile on their exact JDK and propagate sibling failure/cancellation. |
| **P1 Java stale pinning rationale** | `java-language/SKILL.md:45`; `java-concurrency/SKILL.md:32,39`; concurrency eval `:55-69` | [JEP 491][jep491], delivered in 24, removes monitor-related virtual-thread pinning. Remove blanket synchronized ban; retain appropriate locks, narrow contention and blocking guidance. | Advice distinguishes JDK 21–23 from 24+, while synchronization remains correct; performance claims require later measurement. |
| **P1 Kotlin swallowed cancellation** | `kotlin-coroutines/references/advanced-patterns.md:26-35` | [runCatching][run-catching] catches any Throwable; [official cancellation guidance][kotlin-cancel] requires cancellation propagation. Rethrow cancellation before mapping genuine operational failure; exception handlers are not interchangeable with local recovery. | Cancel a suspended repository call: cancellation propagates without ordinary error-state emission; operational exception still maps as intended. |
| **P1 Swift concurrency guarantees** | `swift-language/SKILL.md:38`; `swift-concurrency/SKILL.md:40` | [Swift concurrency chapter][swift-concurrency]: sendability requires safe state, and Task-initializer tasks are unstructured despite inherited context. Retain value-semantics preference but remove intrinsic thread-safety implication; assign ownership/cancellation to unstructured tasks. | Unsafe mutable reference state inside a struct is rejected/flagged across isolation boundaries; parent cancellation is not assumed to cancel an unstructured Task. |
| **P1 Dart assert-as-proof** | `dart-language/SKILL.md:42`; eval `:43-55` | [Dart assertions][dart-assert] are ignored in production. Remove debug assertion as sufficient proof before forced unwrap; use real narrowing/guards or an independently established invariant. | Nullable-input path remains safe with assertions disabled. |
| **P1 JS loader-contract conflict** | `javascript-language/SKILL.md:9,29,33`: matches `.cjs`, requires ESM-only | [Node package rules][node-packages] preserve `.cjs` as CommonJS. Prefer ESM for compatible new modules, not an implicit migration of existing consumers. | A maintained `.cjs` module still loads and preserves exports; new `.mjs` uses ESM with working callers. |
| **P1 Go abstraction/identity contract** | `golang-error-handling/SKILL.md:23,34` | [Official wrapping guidance][go-wrap]. Replace unconditional wrapping/bare-return ban with useful-context and caller-contract decisions. | Preserved caller-owned errors remain discoverable; intentionally hidden DB implementation identity does not become public; safe client text is separately verified. |
| **P2 Java/Kotlin malformed multiline rule** | `java-language/SKILL.md:31`; `kotlin-language/SKILL.md:36` name two quotes | [JEP 378][jep378] and [Kotlin strings][kotlin-strings] specify triple quotes; Java opening delimiter also requires its line terminator. Fix examples, no baseline uplift. | Complete JSON/SQL multiline examples compile and preserve intended newline/indentation semantics. |
| **P2 JS indiscriminate promisification** | `javascript-language/SKILL.md:29,42`; eval `:40-60` | [Node util][node-util]: promisify expects one-shot error-first completion; Promise-returning use deprecated since 20.8.0. Prefer native Promise APIs and preserve receivers/events/synchronous callback contracts. | Native Promise, error-first, receiver-dependent and repeated-event scenarios retain completion/error semantics. |
| **P2 Python annotations/encoding** | `python-language/SKILL.md:25,27,31-37` | [3.14 annotations][python314] differ from future-stringized behavior; [3.15][python315] changes default text encoding. Qualify future-import advice; name encoding at file boundaries. | Actual introspection consumer works on retained minimum and new interpreter; non-ASCII file bytes round-trip across locale/version configurations. |
| **P2 TypeScript compatibility preflight** | `typescript-language/SKILL.md:34,62,70`; testing reference `:5` | [TS7][ts7] native compiler/API/default changes and [lib documentation][ts-lib]. Add compiler/runtime/tool-peer preflight; gate satisfies at 4.9; use available project diagnostics instead of assuming one MCP tool. | Locked compiler catches a real cross-module defect; emitted code runs on declared runtime; compiler-API/Jest/Node-global consumers retain intended behavior. |
| **P2 PHP version/readonly semantics** | `php-language/SKILL.md:36-43`; eval `:23-36` | [Type minima][php-types], [readonly contract][php-properties], [8.6 release][php86]. Readonly prevents ordinary post-initialization modification, not “constructor-only initialization”; new defaults are version-specific. | Selected minimum accepts appropriate syntax; older engines reject gated newer syntax; later assignment after initialization is rejected. |
| **P2 Dart diagnostic oracle** | `dart-tooling/SKILL.md:38-45`; eval `:6-11` | [Modern required argument][dart-required] differs from documented legacy `@required` diagnostic. Teach the actual missing-argument outcome, not an exact legacy configuration key; do not claim the old key was universally removed. | Omitted modern required argument yields expected diagnostic; supplying it resolves that diagnostic. |

All unprefixed local language paths in this table are under `skills/<language>/`. Preserve existing valid APIs and consumers when repairing examples; do not silently replace public enums, error envelopes, or compiler/toolchain contracts.

## 5. Diagram Design: adapt ideas, retain architecture contracts

External reference: [cathrynlavery/diagram-design][diagram-repo], pinned source revision **`b228c5d77794a84150fca41b22940bb316b1398d`**. [Pinned MIT license][diagram-license] requires retaining copyright and permission notices for copies/substantial portions. Nothing was imported. Repository popularity, type count, manifest version, and visual claims are not evidence of system-design correctness or adoption readiness.

| Decision | Evidence / proposed improvement | Gate and future proof |
| --- | --- | --- |
| **Retain semantic JSON → draw.io** | Local `common-architecture-diagramming/SKILL.md:29-51` owns canonical semantics and editable presentation. Upstream [output contract][diagram-output] makes HTML its source of truth: a different authoring model, not a drop-in upgrade. | No new renderer. Later presentation changes must preserve node/edge identity, provenance and protected regeneration. |
| **Retain raster offline HTML and CSP** | Local `references/offline-export.md:18-51` already provides self-contained HTML with embedded PNG and forbids raw SVG/active content. Upstream [privacy policy][diagram-privacy] says diagrams/exports may contact Google Fonts; standalone SVG is not automatically network-free. | Inline SVG, font retrieval/embedding and external-brand scraping require separate design/security approval. Do not infer sanitization from well-formed XML. Browser and Desktop export are separate proof lanes. |
| **P2 adapt import fidelity accounting** | Local `references/source-extraction.md:44-51` maps mxCells and flags unmapped kinds. Upstream [output contract][diagram-output] reports merged/collapsed/dropped/retained content. Add selected pages, source-to-spec identities, relationship direction/grouping, and explicit semantic omissions. | Preserve meaningful unsupported/dangling/unlabeled content as unresolved instead of blindly pruning it. A reversed-arrow/group/unmapped-node fixture must be preserved or explicitly accounted for. No lossless-conversion claim. |
| **P2 adapt destination-readability checks** | Existing SKILL `:47-48` and offline export `:70-72` require inspection, but actual document width/projected slide/print is a different consumption context. Upstream [destination sizing][diagram-output] supplies useful guidance. | Extend the existing checklist; split views rather than shrink labels. Verify intended destination, narrow viewport, print, and both themes. No visual regression was observed in this audit. |
| **P2 adapt accessible semantic text** | Local `scripts/export_html.py:509-528` provides title/theme alt text and summaries, not a node/relationship transcript. | Derive escaped text/table from canonical JSON within current HTML/CSP constraints. Image-disabled/accessibility inspection must expose labeled relationships and direction while hostile labels remain literal. No WCAG conformance claim. |
| **P3 defer branding profiles** | Local accent/theme settings already exist; colors encode ownership and uncertainty. Upstream profile/onboarding contracts are useful design references, not verified isolation guarantees. | Require a concrete project branding need; preserve semantic colors, offline fonts/license constraints and cross-project isolation. Do not mutate shared installed standards. |

Local diagram paths above are under `skills/common/common-architecture-diagramming/`. Existing static exporter tests/evals are relevant starting points, but no rendering, browser, accessibility, network or import-roundtrip checks ran.

## 6. Minimal improvement strategy

1. **Repair incorrect rules and matching examples/evals together.** Prioritize P1 findings above and conflicting Go logging/envelope examples. Keep one canonical convention; do not add duplicate skill families.
2. **Add a small compatibility preflight to existing category guidance.** Inspect consumer language mode/minimum, locked compiler/runtime, preview policy, SDK/platform availability, and affected tool peers before emitting newer syntax or migrations. Put detailed version matrices in references, not the small SKILL core.
3. **Expand behavior-oriented verification only for demonstrated risks.** Reject advice that says “safe”, “preview”, “cancellation” or a version number while still violating the contract. Compile executable examples where appropriate; test cancellation, loader, nullability, error exposure and client decoding through actual consumers. These checks need separate implementation/evaluation authority.
4. **Use the existing freshness system.** `CONTRIBUTING.md:292-294` already documents weekly upstream checking and learning-ledger integrity. `scripts/freshness/check.ts:33-36` describes alias-specific version significance, including major.minor for Go; do not assume it is major-only. Reconcile `skills/metadata.json` pins and reviewed dates only after affected claims are genuinely reviewed. A successful metadata age/version check is not semantic freshness or runtime proof. The token-authenticated network job was not run.
5. **Keep optional modernization selective.** Join/AsType and qualified loop semantics are useful Go additions; Java LTS selection needs expansion; Kotlin/Swift/Dart new features remain consumer-gated. Existing Python/Java/ES2022 floors and supported Node 22 consumers can remain intentional. No measured effectiveness, latency, cost savings or token-return improvement is claimed.

## 7. Acceptance and follow-through

| Approved criterion | Audit evidence delivered | Boundary |
| --- | --- | --- |
| AC-GO | Section 2 classifications and Section 4 corrections | Static contracts, not executable reproduction |
| AC-DIAGRAM | Section 5 pinned/license-aware comparison and retained safety contracts | No adoption, rendering or full upstream security audit |
| AC-LANGUAGE | Section 3 includes all nine language families and compatibility/support distinctions | Consumer-specific build/SDK compatibility remains unverified; named unknowns retained |
| AC-RECOMMEND | Sections 2, 4–6 attach owners, minimal actions, compatibility gates and observable future proofs | Proposed changes are not implemented or approved for execution |
| AC-VERIFY | Existing eval/reference gaps and future behavior checks identified in research evidence and findings | No model efficacy, compilation, runtime, performance or live consumer PASS implied |

Remaining owner decisions: requester accepts/corrects audit findings and chooses a bounded remediation scope; corresponding maintainers validate consumer compatibility before changing baselines or public contracts. Swift fixed support horizon, exact TS7/PHP8.6 patch versions, browser targets, and application-specific API/logging contracts remain unknown where not established by the inspected evidence. Those unknowns do not erase the concrete source defects above.

Next action after human acceptance: scope a separate remediation plan. No automatic downstream workflow or source change follows this report.

## Primary sources

[go-wrap]: https://go.dev/blog/go1.13-errors
[go120]: https://go.dev/doc/go1.20#errors
[go126]: https://go.dev/doc/go1.26
[go122]: https://go.dev/doc/go1.22#language
[go-releases]: https://go.dev/doc/devel/release
[go-join]: https://go.dev/src/errors/join.go?m=text
[go-errors]: https://go.dev/src/errors/wrap.go?m=text
[ecma]: https://ecma-international.org/publications-and-standards/standards/ecma-262/
[node-releases]: https://nodejs.org/en/about/previous-releases
[node-packages]: https://nodejs.org/api/packages.html
[node-util]: https://nodejs.org/api/util.html#utilpromisifyoriginal
[ts-download]: https://www.typescriptlang.org/download/
[ts7]: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
[ts-lib]: https://www.typescriptlang.org/tsconfig/lib.html
[python-downloads]: https://www.python.org/downloads/
[python-support]: https://devguide.python.org/versions/
[python314]: https://docs.python.org/3.14/whatsnew/3.14.html#whatsnew314-deferred-annotations
[python315]: https://docs.python.org/3.15/whatsnew/3.15.html
[java-ga]: https://jdk.java.net/27/
[java-support]: https://www.oracle.com/java/technologies/java-se-support-roadmap.html
[scope21]: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/StructuredTaskScope.html
[scope27]: https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/util/concurrent/StructuredTaskScope.html
[jep491]: https://openjdk.org/jeps/491
[jep378]: https://openjdk.org/jeps/378
[kotlin-releases]: https://kotlinlang.org/docs/releases.html
[kotlin-strings]: https://kotlinlang.org/docs/strings.html#multiline-strings
[run-catching]: https://kotlinlang.org/api/core/kotlin-stdlib/kotlin/run-catching.html
[kotlin-cancel]: https://kotlinlang.org/docs/coroutines-cancellation.html
[swift-install]: https://www.swift.org/install/macos/
[swift-concurrency]: https://raw.githubusercontent.com/swiftlang/swift-book/main/TSPL.docc/LanguageGuide/Concurrency.md
[php86]: https://www.php.net/releases/8.6/en.php
[php-support]: https://www.php.net/supported-versions.php
[php-types]: https://www.php.net/manual/en/language.types.declarations.php
[php-properties]: https://www.php.net/manual/en/language.oop5.properties.php
[dart-stable]: https://storage.googleapis.com/dart-archive/channels/stable/release/latest/VERSION
[dart-sdk]: https://dart.dev/tools/sdk#support-policy
[dart-assert]: https://dart.dev/language/error-handling#assert
[dart-required]: https://dart.dev/tools/diagnostics/missing_required_argument
[diagram-repo]: https://github.com/cathrynlavery/diagram-design/tree/b228c5d77794a84150fca41b22940bb316b1398d
[diagram-license]: https://raw.githubusercontent.com/cathrynlavery/diagram-design/b228c5d77794a84150fca41b22940bb316b1398d/LICENSE
[diagram-output]: https://raw.githubusercontent.com/cathrynlavery/diagram-design/b228c5d77794a84150fca41b22940bb316b1398d/skills/diagram-design/references/output-spec.md
[diagram-privacy]: https://raw.githubusercontent.com/cathrynlavery/diagram-design/b228c5d77794a84150fca41b22940bb316b1398d/PRIVACY.md
[kotlin24]: https://kotlinlang.org/docs/whatsnew24.html
[swift64]: https://www.swift.org/blog/swift-6.4-released/
[dart-primary]: https://dart.dev/language/primary-constructors
