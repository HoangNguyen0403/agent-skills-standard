# BABOK-informed SDLC — source and reuse register

Status: **proposed T4 engineering reuse boundary; parent/independent acceptance pending**. Date: 2026-10-23. Companion: [practice ownership crosswalk](practice-crosswalk.md). This register records provenance and exclusions, not legal permission, IIBA endorsement, source-completeness certification or measured model improvement.

## Selected reuse decision

Public changes are independently authored repository-specific practices and owner/caller decisions. No converter implementation, upstream prompt/template, book passage, full table, figure, detailed source card or proprietary task–technique matrix is selected for public copying/adaptation. Source identifiers and concise navigation labels support traceable conceptual citation; they are not a redistributed book synopsis. Independent wording and citation alone do not establish redistribution rights or non-infringement.

Private processing and public registry authoring are separate activities. The maintainer authorized bounded private preparation/conversion and original registry integration subject to review. Private reference acceptance is bounded source-fidelity evidence, **not permission to distribute that reference**. Detailed packets, extraction, completeness manifests, prompts, provider receipts and source-derived notes remain outside public delivery. Member identifiers and local private paths are excluded.

## Converter provenance

Upstream: [virgiliojr94/book-to-skill at immutable revision](https://github.com/virgiliojr94/book-to-skill/tree/a24e62f4d8caf2ee433f6e48d9073800f56f906e), commit `a24e62f4d8caf2ee433f6e48d9073800f56f906e`. The earlier selected-file inspection recorded these Git blob identities, not local SHA-256 measurements or whole-package security attestations:

| Selected pinned source | Git blob ID | Engineering disposition |
| --- | --- | --- |
| [LICENSE.md](https://github.com/virgiliojr94/book-to-skill/blob/a24e62f4d8caf2ee433f6e48d9073800f56f906e/LICENSE.md) | `b000bdffeaa2b2576273fbf2c9b848b34859ceae` | MIT, copyright (c) 2025 virgiliojr94. Governs selected converter software/documentation, not input-book rights. |
| [SKILL.md](https://github.com/virgiliojr94/book-to-skill/blob/a24e62f4d8caf2ee433f6e48d9073800f56f906e/SKILL.md) | `aebe394108e76bebdf7b8848eceddc756e844ec4` | Conceptual extraction/synthesis separation; no instructions/templates copied into registry. Default discovery/publication destinations not adopted. |
| [scripts/extract.py](https://github.com/virgiliojr94/book-to-skill/blob/a24e62f4d8caf2ee433f6e48d9073800f56f906e/scripts/extract.py) | `52d699f046714fcae1723ec262c95e3a30361e05` | Inspected wrapper; not vendored or executed for this crosswalk. |
| [book_to_skill/cli.py](https://github.com/virgiliojr94/book-to-skill/blob/a24e62f4d8caf2ee433f6e48d9073800f56f906e/book_to_skill/cli.py) | `27de59aa1fc9b4605ba824a5b9b54753a6a7f775` | Inspected extraction entrypoint; no implementation reuse. |
| [book_to_skill/utils.py](https://github.com/virgiliojr94/book-to-skill/blob/a24e62f4d8caf2ee433f6e48d9073800f56f906e/book_to_skill/utils.py) | `4ed93c170378fffd5236fcd4397e5ce671df8556` | Selected extraction/token-estimation/metadata paths inspected; no whole-file audit claimed. No code copied. |
| [book_to_skill/parsers/pdf.py](https://github.com/virgiliojr94/book-to-skill/blob/a24e62f4d8caf2ee433f6e48d9073800f56f906e/book_to_skill/parsers/pdf.py) | `0bd22d6e343abc3ab96e928de1500ecd8e794f36` | Parser inspected; destructive page cleanup not adopted for provenance master; no code copied. |

The selected upstream inspection also covered dependency/configuration/optional-inspector/package declarations; it was not an audit of all dependencies or execution safety. The private preparation route used installed local extraction tooling rather than the upstream automatic agent installation/publication workflow. This T4 task did not run extraction, converter code, network capture or installation. The pin and blob identities above are carried from recorded earlier inspection, not newly fetched here.

If direct converter reuse is later selected, reopen this decision with exact revision/path/bytes, modifications and destination. Retain the applicable MIT copyright/permission notice in all copies or substantial portions, carrying the complete license and warranty disclaimer with the reused material. Review separate dependency licenses. No MIT permission is asserted over BABOK, figures, tables, inputs or third-party components.

## Book and conceptual sources

| Source | Provenance / use | Public boundary |
| --- | --- | --- |
| IIBA, *A Guide to the Business Analysis Body of Knowledge (BABOK Guide)*, v3 | Privately supplied edition; source SHA-256 `10a97b1e16a52ae56c6c51163c946bae1e584db97bd35495366d2795216db00b`. Concept IDs §§1–11 and appendices A–D inform the crosswalk. | Hash identifies the private artifact, not an accessible distribution or rights grant. No PDF, extraction, cards, member artifact or matrix published. |
| [IIBA task navigation](https://www.iiba.org/knowledgehub/business-analysis-body-of-knowledge-babok-guide/tasks/) | Public conceptual navigation for task references. | Citation, not a substitute for private source review and not redistribution permission. |
| [IIBA AI/BA article](https://www.iiba.org/business-analysis-blogs/your-new-colleague-doesnt-replace-the-babok-guide-they-read-it/) | Intake motivation only; earlier direct access returned 403 and indexed material was used. | No newly verified substantive article claim or efficacy result is asserted. |
| [BACS overview](https://www.bacs.vn/vi/blog/nghe-nghiep/babok-la-gi-vi-sao-babok-duoc-xem-la-kinh-thanh-cho-business-analyst-19865.html) | Supplied orientation link; earlier reader exposed metadata rather than substantive text. | Not treated as source-fidelity, permission or behavioral evidence. |
| [Existing repository reuse precedent](../product-evidence-sdlc/source-reuse-register.md) | Independent-authorship/exclusion and immutable provenance pattern. | Its approvals/licenses do not transfer to BABOK or this change. |

## Source-derived concepts versus project rules

Conceptual inputs include proportionate BA planning, stakeholder engagement and elicitation confirmation; requirements quality versus need fit; temporary transition needs; limitation diagnosis and potential versus realized value. Task/technique/competency/perspective identifiers are navigation, not instructions to perform every item.

Repository choices remain project-authored: BRD Why / PRD What / SRS How ownership; a single shared modeling reference; stable requirement IDs; no parallel ledger/schema; low-risk equivalent-ticket routing; sensitive design/human floor; affected-only reopening and ready-only PARTIAL; existing value-review enums and human action authority. These are not attributed to BABOK as universal policies. Meaning distinctions do not create a mandatory seven-gate process.

## Acceptance and change control

Parent owns final gap/write-set freeze; independent reviewer checks provenance, leakage, owner duplication and boundary claims before implementation acceptance. Maintainer remains authority for public delivery and any unresolved rights question; seek qualified advice where needed. An agent cannot grant legal clearance.

Any proposal to copy/adapt book text, translate a source passage, reproduce a table/figure, distribute private notes or introduce upstream templates stops the affected publication lane and reopens rights/reuse review. Do not relabel a derivative as independent to bypass this boundary. Generator success, paraphrasing, local storage, source citation and bounded fidelity PASS do not settle rights.

No new runtime, smoke, evaluation or legal review was performed by this analysis. The proposed crosswalk records source-grounded integration choices; actual native consumption and semantic benefit need separately authorized evidence. Merge, release and installed-consumer activation are not supplied by this register.
