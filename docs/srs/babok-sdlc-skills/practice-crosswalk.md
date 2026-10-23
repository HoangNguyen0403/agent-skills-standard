# BABOK-informed practice ownership crosswalk

Status: **proposed T4 analysis; parent acceptance and independent review pending**. Date: 2026-10-23. This is an independently authored repository integration decision, not a replacement for the Guide, certification, legal clearance, or measured model improvement. Existing-covered means inspected guidance supplies the relevant repository behavior, not exhaustive BABOK equivalence or observed agent compliance.

## Scope, evidence and ownership

Concept identifiers refer to BABOK Guide v3, chapters 1–11 and appendices A–D. See [IIBA task navigation](https://www.iiba.org/knowledgehub/business-analysis-body-of-knowledge-babok-guide/tasks/) and the [source/reuse register](source-reuse-register.md). Private bounded source reviews accepted their respective segments; some material remains partial synthesis or source-navigation-only. This public document does not reproduce their detailed completeness manifests, source paragraphs, figures or task–technique associations.

Canonical owner key; paths below are repository-relative, not installed/native copies:

| Key | Existing canonical owner and inspected evidence |
| --- | --- |
| BRD | [Business requirements](../../../skills/product-management/product-business-requirements/SKILL.md), discovery/quality gate; [BRD template](../../../skills/product-management/product-business-requirements/references/brd-template.md), objectives, stakeholders, scope, value and risks; [checklist](../../../skills/product-management/product-business-requirements/references/checklist.md). |
| PRD | [Product requirements](../../../skills/product-management/product-requirements/SKILL.md); shared [requirements modeling](../../../skills/product-management/product-requirements/references/requirements-modeling.md), §§1–6: proportionality, capability scope, single rule ownership, unknowns, views and scoped change. |
| DISC | [Customer discovery protocol](../../../skills/product-management/product-customer-discovery/references/discovery-protocol.md), §§1–4: contextual research, consent, non-leading inquiry, observation/inference. |
| STRAT | [Strategy protocol](../../../skills/product-management/product-strategy/references/strategy-protocol.md), §§1–5: authority, diagnosis, coherent action, alternatives and risks. |
| SRS | [Software requirements](../../../skills/common/common-software-requirements/SKILL.md), discovery and verification mapping: contracts, NFRs, migration and trace. |
| QE | [Business-analysis QE](../../../skills/quality-engineering/quality-engineering-business-analysis/SKILL.md), investigation, actors, permissions, boundaries and story contracts; [analysis patterns](../../../skills/quality-engineering/quality-engineering-business-analysis/references/analysis_patterns.md), conflict example. |
| MET | [Value review protocol](../../../skills/product-management/product-metrics/references/value-review-protocol.md), §§1–6: measurement, attribution, costs, advisory decisions and retained delivery state; [metric protocol](../../../skills/product-management/product-metrics/references/metrics-protocol.md), measurement contracts and unavailable data. |

Dispositions: **C** = existing-covered at the stated concern; **D** = bounded-delta-proposed, extending the named owner; **N** = justified no-change/not-in-product-scope. A consumer is not a second definition owner. Technique navigation below does not claim a dedicated implementation of every named method.

## Thirty task-level dispositions

Each ID is individually accounted. Concern descriptions and decisions below express repository needs rather than a copied source task summary. Evidence uses the owner key above and the workflow table below.

| Source ID | Repository concern | Definition owner / consumers | Disposition and inspected evidence |
| --- | --- | --- | --- |
| 3.1 | Choose proportionate analysis effort | BRD / brainstorm-feature | D: add approach rationale and revisit conditions; current BRD gate already protects direct low-risk work. |
| 3.2 | Plan participation and communication | BRD / plan-feature | D: extend current stakeholder impact/approval table with actual participation, accessibility and decision needs; no mandatory roster/cadence. |
| 3.3 | Establish analysis decision responsibilities | BRD / PRD, readiness | D: connect existing owners/approvals to change/escalation arrangements; do not invent authority. |
| 3.4 | Keep analysis information usable and controlled | BRD / PRD | D: proportionate source/access/reuse handling; reuse PRD single-rule and existing evidence references, not a new store. |
| 3.5 | Improve analysis work from evidence | BRD / retro-learn | D: review analysis effectiveness and causes when warranted; reuse authorized retrospective lane, not automatic standards edits. |
| 4.1 | Prepare evidence-seeking activity | BRD / QE, DISC when research-specific | D: identify purpose, sources, participants and useful confirmation route; DISC interviews are not the only elicitation mode. |
| 4.2 | Capture information without premature agreement | BRD / QE | D: retain capture provenance/uncertainty; existing DISC observation/inference handling stays research-specific. |
| 4.3 | Check captured meaning with its source | BRD / QE, PRD | D: single general confirmation procedure; participant correction is neither need validation nor approval. Reachable without BRD intake. |
| 4.4 | Communicate for shared understanding | BRD / plan-feature | D: audience/decision/understanding feedback extends stakeholder handoff; sending a file does not imply agreement. |
| 4.5 | Manage participation and disagreement | BRD engagement; PRD conflict semantics / QE | D: engagement under BRD; preserve competing positions and resolution authority under shared modeling. |
| 5.1 | Link need, contract and proof | PRD / traceability-audit | C: modeling §§2,6 and trace map already preserve lineage and changed artifacts; no new IDs/ledger. |
| 5.2 | Maintain current approved meaning | PRD / readiness | C: modeling §6 retains IDs and affected links; readiness checks freshness/authority. Reuse needs current context. |
| 5.3 | Prioritize with ownership and rationale | PRD / plan-feature, STRAT | C: owner/priority/status and legitimate alternatives already explicit; no universal score introduced. |
| 5.4 | Assess a proposed change locally | PRD / readiness, sdlc | C: modeling §6 already updates affected ACs/contracts/approvals/evidence only. Conflict delta must reuse it. |
| 5.5 | Obtain the actual scoped decision | PRD / readiness | D only for preserved dissent/resolution record; existing approval/ready-only PARTIAL semantics retained. |
| 6.1 | Ground the present problem | BRD / STRAT, DISC | C: current-state, business objective, evidence and diagnosis already owned; avoid exhaustive enterprise modeling. |
| 6.2 | Define outcome and scope of desired change | BRD / STRAT, MET | C: target/date/owner, future state, non-goals and measurement contracts already present. |
| 6.3 | Assess uncertainty affecting options | STRAT / BRD, design-solution | C: four product risks plus BRD risk/mitigation owner and technical failure analysis; no new risk framework. |
| 6.4 | Compare ways to reach the target | STRAT / BRD, PRD | D only for explicit temporary transition requirements through PRD; current no-build/buy/defer options and strategic authority remain unchanged. |
| 7.1 | Express scope and behavior for its audience | PRD / QE, SRS | C: modeling §§2–5 already select purposeful views and single rules; retain behavior-based ACs. |
| 7.2 | Assess requirement/model quality | PRD / QE, SRS | D: explicitly separate clarity/consistency/testability review from evidence-backed need validation; reuse existing checklists. |
| 7.3 | Assess fit to business need | PRD / BRD validation owner, SRS | D: link need/objective evidence, assumptions and accountable validator; a testable statement alone is insufficient. |
| 7.4 | Keep requirements coherent together | PRD / SRS | C: hierarchy, shared-rule ownership, view selection and overlap review already exist; trace links alone are not coherence proof. |
| 7.5 | Compare feasible solution approaches | SRS / PRD, STRAT | C: design-solution owns technical choices; brainstorm-feature already preserves buy/defer/substitute/no-build options. |
| 7.6 | Recommend an option without claiming realized return | STRAT / BRD, MET | C: strategy tradeoffs, BRD expected benefits/cost and advisory authority already present; estimates remain estimates. |
| 8.1 | Define and collect relevant measures | MET / verify-work | C: metric contracts name baseline/exception, query, cohort, owner, window and review trigger; pilot observations are not post-release ROI. |
| 8.2 | Interpret observed performance honestly | MET / review-product-value | C: attribution, confounders, unavailable/immature data and actual costs already explicit. |
| 8.3 | Diagnose limits inside the solution | MET / SRS, QE | D: within existing limitations narrative, distinguish defect/capacity/design constraint and evidence needed; no new REV field. |
| 8.4 | Diagnose surrounding organization limits | MET / BRD, STRAT | D: distinguish policy/process/skills/adoption constraints and ownership; do not prescribe a software fix from KPI shortfall alone. |
| 8.5 | Recommend action proportionate to cause | MET / review-product-value | D only for linking limitation diagnosis to the existing advisory recommendation; current action authority and delivery state remain intact. |

## Fifty technique navigation dispositions

This is a repository ownership inventory, **not** the book's task–technique matrix. Each row has N disposition: keep existing owner navigation, select by actual question, and do not implement a technique catalog or mandate use. Where a practice delta above matters, use that owner rather than duplicating its method here. Specialized methods not implemented locally remain source/reference-only, not falsely covered.

| Source ID | Navigation label | Existing owner / explicit no-change boundary |
| --- | --- | --- |
| 10.1 | Acceptance/evaluation criteria | PRD, MET; distinguish delivery conditions from value evaluation. |
| 10.2 | Backlog handling | PRD; existing priority/slice planning. |
| 10.3 | Balanced scorecard | STRAT, MET; specialized method reference-only, no prescribed scorecard. |
| 10.4 | Benchmark/market comparison | STRAT; contextual evidence, no universal benchmark. |
| 10.5 | Idea generation | BRD; existing brainstorm options. |
| 10.6 | Capability analysis | PRD, BRD; existing capability scope, not exhaustive enterprise maps. |
| 10.7 | Business case | BRD; existing value/cost/risks. |
| 10.8 | Business model canvas | STRAT; source-reference-only format, not a new template. |
| 10.9 | Rule analysis | PRD, QE; single rules and interacting-condition tables. |
| 10.10 | Collaborative games | BRD; optional facilitation method, not implemented as a game catalog. |
| 10.11 | Concept modeling | PRD; question-driven views and terminology. |
| 10.12 | Data dictionary | SRS; contract terms/data ownership, no new data catalog. |
| 10.13 | Data-flow diagrams | SRS; existing view selection, no mandatory diagram. |
| 10.14 | Data mining | MET; specialist method reference-only, no analytics engine. |
| 10.15 | Data modeling | SRS; technical storage/interface owner. |
| 10.16 | Decision analysis | STRAT; existing alternatives and tradeoffs. |
| 10.17 | Decision modeling | PRD, QE; existing rules/table views. |
| 10.18 | Document analysis | BRD; evidence-source selection, not authority from document text. |
| 10.19 | Estimation | PRD; existing provisional slices/confidence. |
| 10.20 | Financial analysis | BRD, MET; projected vs actual costs/value, no new financial calculator. |
| 10.21 | Focus groups | DISC; optional research method, no new mandatory research event. |
| 10.22 | Functional decomposition | PRD; existing capability hierarchy/stop rule. |
| 10.23 | Glossary | BRD; existing owned terminology. |
| 10.24 | Interface analysis | SRS; existing input/output/error contracts. |
| 10.25 | Interviews | DISC for customer research, BRD for general elicitation; confirmation stays BRD-owned. |
| 10.26 | Item tracking | PRD; retain existing IDs/issues, no parallel tracker. |
| 10.27 | Lessons learned | retro-learn; existing proposal/maintenance authority. |
| 10.28 | Metrics/KPIs | MET; existing measurement contracts. |
| 10.29 | Mind mapping | PRD; optional view, no new renderer/template. |
| 10.30 | NFR analysis | SRS; existing measurable constraints and categorical invariants. |
| 10.31 | Observation | DISC; existing contextual inquiry and inference limits. |
| 10.32 | Organizational modeling | BRD; contextual stakeholder view, no enterprise-modeling product. |
| 10.33 | Prioritization | PRD; existing owner/priority/status, no universal weighting. |
| 10.34 | Process analysis | BRD; current/future process concern. |
| 10.35 | Process modeling | PRD, BRD; existing process views. |
| 10.36 | Prototyping | SRS, STRAT; exploration evidence, not approval or realized value. |
| 10.37 | Reviews | PRD, QE; quality review with assigned authority. |
| 10.38 | Risk analysis | STRAT, BRD; existing risk boundaries. |
| 10.39 | Roles/permissions matrix | QE, SRS; existing actor/permission analysis. |
| 10.40 | Root-cause analysis | MET, retro-learn; diagnosis before action, not causal claims from correlation. |
| 10.41 | Scope modeling | PRD; existing scope classification. |
| 10.42 | Sequence diagrams | SRS; existing optional interaction view. |
| 10.43 | Stakeholder maps/personas | BRD; engagement context, not invented participant evidence. |
| 10.44 | State modeling | PRD; entity lifecycle view, not temporary transition requirements. |
| 10.45 | Surveys/questionnaires | DISC; optional evidence method, sampling limits retained. |
| 10.46 | SWOT | STRAT; optional framing/reference-only, not proof or scoring gate. |
| 10.47 | Use cases/scenarios | PRD, SRS; existing actor/goal and alternate/error paths. |
| 10.48 | User stories | QE; existing story/AC contract. |
| 10.49 | Vendor assessment | STRAT, SRS; existing buy/options and integration concerns; procurement method reference-only. |
| 10.50 | Workshops | BRD; optional engagement mode, not mandatory ceremony. |

## Concepts, competencies and contextual lenses

Foundations (§§1–2): business analysis is not restricted to a job title or software delivery. Need, change, stakeholder, solution, value and context are interdependent considerations, not six workflow stages. BRD/STRAT already frame need/context and alternatives; PRD/SRS separate need from technical realization; MET separates potential from observed value. N: no standalone BACCM skill or duplicated glossary. Business/stakeholder/functional/non-functional classifications stay with current owners. D: PRD adds temporary transition classification with readiness, ownership and exit/retirement conditions, traced through existing IDs rather than a new ID family. Wider enterprise context is relevant when it affects the actual change, not an excuse for exhaustive analysis.

All six competency groups and all 29 topics have explicit navigation below. Disposition is N for a separate competency curriculum/certification or staffing rubric; operational deltas use the owners already named. Grouping is an inventory, not copied effectiveness criteria.

| Source IDs / group | Topics individually accounted | Existing navigation / no-change decision |
| --- | --- | --- |
| 9.1.1–9.1.7 / analytical thinking | Creative Thinking; Decision Making; Learning; Problem Solving; Systems Thinking; Conceptual Thinking; Visual Thinking | STRAT/PRD/SRS for alternatives, relationships and purposeful views; retro-learn for evidence-backed learning. No competency scoring. |
| 9.2.1–9.2.5 / behavioral characteristics | Ethics; Personal Accountability; Trustworthiness; Organization and Time Management; Adaptability | BRD engagement/governance, DISC ethics, existing owner/authority boundaries. Do not infer trust or ethical adequacy from generated prose. |
| 9.3.1–9.3.5 / business knowledge | Business Acumen; Industry Knowledge; Organization Knowledge; Solution Knowledge; Methodology Knowledge | BRD/STRAT/SRS contextual evidence; missing domain knowledge remains an owned question, not fabricated expertise. |
| 9.4.1–9.4.4 / communication | Verbal Communication; Non-Verbal Communication; Written Communication; Listening | BRD audience/confirmation delta and DISC inquiry; no claim that text-only agents observe non-verbal cues. |
| 9.5.1–9.5.5 / interaction | Facilitation; Leadership and Influencing; Teamwork; Negotiation and Conflict Resolution; Teaching | BRD engagement; PRD conflict owner; QE consumer. Facilitation/influence is not decision authority. |
| 9.6.1–9.6.3 / tools | Office Productivity Tools and Technology; Business Analysis Tools and Technology; Communication Tools and Technology | Existing package/workflow resources; no tool installation, new platform or technology proficiency certification. |

Five perspectives are overlapping contextual lenses, not new pipelines:

| Source | Existing owner navigation / disposition |
| --- | --- |
| 11.1 Agile | BRD proportional approach, PRD incremental refinement, readiness ready-only slices. N: no mandated method/iteration; applicable audit/compliance duties are not waived by lightweight documentation. |
| 11.2 Business Intelligence | SRS data/interface contracts, MET measure quality, BRD stakeholder alignment. N: no BI platform or analytics-method curriculum; missing data/skill remains explicit. |
| 11.3 Information Technology | SRS/QE contracts, end-to-end verification, business UAT and objective trace. N: existing owners retained; technical blueprinting and business need are distinct. |
| 11.4 Business Architecture | STRAT/BRD enterprise fit, PRD coherent scope, MET outcome interpretation. N: no mandatory architecture board/reference model; actual authority and measurement ownership must be established locally. |
| 11.5 Business Process Management | BRD process boundary, PRD rules/needs, MET performance and limitation diagnosis. N: retain manual/non-software and do-nothing options; D only through existing limitation/transition deltas, no BPM implementation product. |

Appendices: **A** terminology navigation → existing BRD glossary/PRD classification, N for republishing the glossary. **B** task–technique relationships → source-navigation-only, N for reproducing the matrix or inferring mandatory selection from it. **C** contributors → non-practice excluded; no identity publication. **D** earlier-edition comparison → historical reference-only, N for treating it as present implementation requirements. Index/front matter → navigation/non-practice; no product change.

## Ten existing workflows and downstream authority

All canonical paths are `.agents/workflows/<name>.md`. References describe inspected current behavior; D pointers proposed below are not already implemented.

| Workflow | Evidence / disposition |
| --- | --- |
| brainstorm-feature | Steps Frame/Ground/Decide/Approve already size work, preserve alternatives and scope approval. D: a conditional pointer to BRD analysis/elicitation reference, never mandatory BRD intake for elicitation. |
| plan-feature | Steps Load context/Draft PRD load shared modeling and QE, retain stable IDs/ready slices. D: consume BRD confirmation and shared conflict/quality-vs-need/transition guidance without redefining it. |
| design-solution | Steps Load inputs/Define contracts/Plan verification already consume shared modeling and own migration/recovery. C: technical transition realization; no parallel business-confirmation procedure. |
| implementation-readiness | Step Check readiness already handles conflicts/current authority/design and scoped PARTIAL. D: consume shared quality/need and applicable transition evidence; keep independent approved slices ready. |
| traceability-audit | Steps Build trace map/Classify each AC already map objectives through release evidence. C: new accepted items use the same trace; no second ledger. |
| verify-work | Steps 1–6 prove approved behavior and retain delivery status while value is unknown. C: technical proof is not confirmation, business acceptance, release authority or causal ROI. |
| uat-signoff | Steps Walk signoff/Capture decision record actual approver/per-AC outcome. C: business acceptance remains separate from release authorization and post-release value. |
| review-product-value | Steps Assess attribution/Formulate recommendation preserve limitations, advisory action and released state. D: point to MET limitation diagnosis, not duplicate it or expand schema. |
| retro-learn | Steps Classify/Propose/Evaluate require evidence and authorized maintenance. C: reuse for BA performance proposals; no autonomous policy edit from poor value results. |
| sdlc | Steps Choose next workflow/Enforce handoff already preserve low-risk direct routing, sensitive floor and local reopening. C: no new BABOK route or blanket restart. Existing UAT → release routing does not grant execution permission. |

Release authority remains with the existing authorized deployment/governance lane; no new authority is assigned here. Participant-accuracy confirmation, need validation, contract approval, technical proof, business acceptance, release authority and realized-value review answer different questions. They are **not a mandatory seven-gate sequence**; apply only the evidence and authority checks relevant to the consuming action.

## Proposed smallest implementation boundary

- **T5 / BRD:** add one lazy `references/analysis-planning-and-elicitation.md` owning proportionate approach, engagement, governance/information/performance and result confirmation. Add a body entry reachable for general elicitation without drafting a BRD. Qualified discovery keywords such as `elicitation results` and `stakeholder elicitation` may be proposed; never broad `analysis`. Keyword changes require the existing keyword audit. Discovery/strategy packages stay unchanged on current evidence.
- **T6 / PRD integration:** extend existing shared modeling for conflict preservation, quality verification versus need validation, and temporary transition requirements; retain affected-only reopening. QE and SRS consume that owner. QE must also link directly to BRD's confirmation reference for general BA/elicitation, without routing through full BRD intake. Only the four D workflow pointer sites above need consideration; seven conceptual distinctions do not justify seven gates.
- **T7 / MET:** diagnose internal-solution versus surrounding-enterprise limits using the existing limitations narrative, supporting evidence, uncertainty and action owner. T6 owns the value-workflow pointer. No schema, enum, record kind, product-state or delivery-state change.

Parent freezes exact write sets and acceptance scenarios after independent review. These proposals do not authorize implementation, live evaluations, publication, merge, release or activation. Preserve low-risk equivalent tickets, sensitive human/design floor, stable IDs, ready-only PARTIAL, current evidence schemas and advisory value decisions. Structural/source review is not measured behavioral improvement.
