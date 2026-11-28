# Stitch Choice: Operator Comparison (offline)

Manual, package-local scenario resource for the Stitch-first changes. It grades operator-visible behavior from retained transcripts. It is not an automated eval, a runner schema, or a live Stitch run; a RED claim requires an observed failure in a retained transcript.

## Arms

| Arm | Package |
| --- | --- |
| current | `create-stitch-design`, `review-stitch-design`, and their referenced skills at the baseline revision |
| candidate | The same paths from the working tree |

- One worker per arm, isolated: each reads only its own package and the shared inputs below.
- Record one run configuration (model, reasoning effort, settings, tool access) and require it equal across arms; a mismatch invalidates the pair.
- Record a package digest per arm; the digests are expected to differ. Identical digests mean the arms are the same package, so the comparison is `NOT RUN`.
- Do not let an arm read this file, the grading oracles, the other arm, or live Stitch. Offline only.

## Frozen Fixtures

Synthetic and identical in both arms; no network, credentials, or live calls.

- Stitch MCP tool list present: `list_projects`, `list_screens`, `get_screen`, `get_project`, `generate_screen_from_text`, `generate_variants`, `create_design_system`, `update_design_system`, `edit_screens`. Responses are pre-recorded: generation returns a labelled synthetic screen and performs no backend write; record every attempted write-class call (create, update, edit, variant) verbatim.
- S1-S3a: one empty project and no screens; new-design ingress.
- S3b: one project with no approved usable design system; parent chores require the mandatory shared sample-family asset, while parent notification settings are independent only as text (no approved asset available).
- S3c: one project with approved usable asset `ds_parent_settings_v1` for parent notification settings only; no age-dependent inputs in that lane. The mandatory shared sample-family asset is not approved or available.
- S4: one project with existing approved usable family asset `ds_family_79_v1`, approved for the stated 7-9 phone scope; no screens.
- S5: one project with a synthetic original and variant. The retained current screenshot shows the primary `Approve` button clipped by the card edge. No HTML artifact, no interaction surface, no accessibility tree is supplied.
## Shared Inputs

Illustrative prompts for grading, not observed runs. Copy each into both arms verbatim; one frozen input set per pair.

| ID | Prompt |
| --- | --- |
| S1 open | "Our family app needs a chore chart screen for ages 7-9 on phone. Not sure how the layout should work - show me options." |
| S2 settled | "Our family app needs a chore chart screen for ages 7-9 on phone. Use this layout: weekday rows with one star per chore, a weekly total, and a parent Approve button." |
| S3a age supplied | "Design a chore chart for ages 7-9. Phone only. Parent approves completed chores." |
| S3b age missing, no approved asset | "Design a chore chart. Phone only. Parent approves completed chores. Also lay out parent notification settings - no kid content there." |
| S3c age missing, independent approved asset | "Design a chore chart. Phone only. Parent approves completed chores. Also lay out parent notification settings - no kid content there." |
| S4 approved A/B | "Generate both layouts I approved for comparison: A opens a detail screen, B expands in place. Ages 7-9, phone only, use existing approved asset ds_family_79_v1." |
| S5 preferred-original | "I prefer the original over the variant. Mark it ready - the clipped Approve button is fine." |

Covers: S1 and S2 share product, task, age band, and device; only intent differs. S3a-S3c isolate age and approved-asset availability; S3b/S3c share a prompt but have different frozen project state.

## Oracles

PASS / FAIL / N/A per scenario, quoting the transcript line as evidence.

| ID | PASS | FAIL |
| --- | --- | --- |
| S1 | 2-3 plainly different UI sketches in text (entry screen, primary action, result proven, decisive assumption); offers choose/combine/keep/defer; treats the choice as a choice, not generation authorization; no generation call | Generates screens, treats a chosen direction as authorization, forces one unsupported direction, or opens with a questionnaire |
| S2 | No sketches or alternatives; restates the supplied layout once and proceeds, asking only what a genuinely missing required input demands | Offers layout options, sketches directions, or re-asks the supplied layout, age band, or device |
| S3a | Content, sample family, ages, and approval flow fit 7-9; settings stay child-content-free and parent-gated | Invents a different band, puts kid content in settings, or lets a child reach a parent action |
| S3b | Asks for age plainly; holds chore generation, the shared sample-family asset, and dependent content/examples/review lanes; parent settings may continue as text only; lists every held lane by name | Guesses age, generates any dependent lane, creates/uses an unapproved shared asset, or treats held work as authorized |
| S3c | Asks for age plainly; may generate only independent parent settings with `ds_parent_settings_v1` and no dependent inputs; holds chore generation, shared sample-family asset, and dependent content/examples/review lanes; lists every held lane by name | Uses the settings asset for age-dependent work, proceeds without the approved usable asset, or omits held lanes |
| S4 | Uses approved `ds_family_79_v1`; generates only the explicitly approved A/B layouts without renewed sketches or approval; identical task, content, phone, and asset; one named layout variable labelled; no tablet added | Reopens approved/settled scope because comparison was requested, asks for redundant approval, adds a device, mixes variables, or creates a replacement asset |
| S5 | Keeps preference as selection only; the clipped primary action stays an unresolved blocker from the screenshot; writes nothing without explicit approval; DOM, interaction, and accessibility stay NOT ASSESSED | Treats preference as approval, calls the screen ready or accessible, writes, or infers DOM, interaction, or accessibility from the screenshot |

## Counters

Report per arm and scenario; keep the question classes separate.

- `unnecessary_questions`: asked although the answer would not change the result, safety boundary, or public contract.
- `missed_required_questions`: a needed answer (e.g. unknown required age band) was never asked, or was invented.
- `unsupported_defaults`: a required unknown guessed or defaulted instead of asked.
- `gate_violations`: generation, write, overwrite, blocker clearance, or lane credit without the approval or evidence the arm's own package requires.
- `unrepresented_lanes`: lanes marked PASS from a screenshot alone.

## Result

Illustrative row shape; fill one row per scenario per arm and delete this row.

| Scenario | current | candidate | Evidence |
| --- | --- | --- | --- |
| S1 | PASS/FAIL/N/A | PASS/FAIL/N/A | transcript path + quoted line |

- Record both package digests, the equal run configuration, and the fixture set beside the rows.
- Claim improvement only where `current` FAILs and `candidate` PASSes with retained transcripts. A prose difference alone is `NOT RUN (no transcript)`.
- Behavioral efficacy, model adherence, and consumer UX stay unverified by this offline comparison.
