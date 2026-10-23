# Analysis Planning and Elicitation

Use this reference when a business-analysis or elicitation question needs guidance without requiring a BRD. Scale effort to the decision, uncertainty, impact, and risk; an approved low-risk equivalent ticket can remain in-chat. Do not create a roster, workshop, cadence, or formal artifact unless the context needs it.

## Plan useful analysis

Before gathering information, state the objective or decision, what is already known, material gaps, and the evidence needed. Select proportionate sources and methods, including existing documents, available data, stakeholder input, observation, or facilitated sessions as appropriate. Identify affected participants and decision owners from actual context; note relevant access, communication, and participation needs. State how information will be used, who may rely on it, and any applicable handling constraints. Revisit the approach when evidence, uncertainty, or the decision changes.

## Elicit and confirm meaning

Capture material statements with their source and context. Separate what a participant said from analyst interpretation, assumptions, and unresolved disagreement. Share a concise representation with the relevant participant or source when checking accuracy; invite correction and record the response and provenance. If corrected, retain the original statement as history, mark the rejected paraphrase as superseded, and record the corrected meaning. Do not present an unresolved or disputed account as settled.

Confirmation establishes only whether the captured account represents the participant's meaning. It does not validate business need or value, approve a requirement or policy, accept a solution, or authorize release. Route those decisions to the relevant accountable owner and existing workflow. For competing positions, affected changes, or requirement quality versus need fit, use [shared requirements modeling](../../product-requirements/references/requirements-modeling.md); do not duplicate its rules here.

## Review the work

When useful, compare the analysis outcome with its objective: whether it informed the intended decision, what remains uncertain, and what should change in the approach or work product. Keep feedback and follow-up proportionate; do not turn every elicitation into a retrospective or standards change.

## Manual behavior review examples

Use these synthetic examples for independent semantic grading of a native consumer. Grade whether the answer preserves the facts and their relationships, not whether it repeats a phrase. A paraphrase passes when it preserves the same attribution, correction, scope, and authority distinctions. Treat each listed failure as a fail even if the answer recites the guidance correctly.

### Correcting an elicitation record

- **Scenario:** Mara, the dock coordinator, says, “Returns must be staged at the east dock by 14:00; dispatch logs stay held until the seal is scanned.” The analyst summarizes this as “dispatch logs are released before the seal scan.” Mara corrects the summary: the logs remain held until the scan. The request is to correct the elicitation note and say what her confirmation establishes.
- **Pass:** Retains Mara’s original attributed statement as history; identifies the analyst’s reversed paraphrase as inaccurate/superseded; records Mara’s corrected meaning with attribution; limits her confirmation to accuracy of the captured meaning, not approval or authorization to change a release rule.
- **Fail:** Deletes or loses the original statement/attribution; leaves the reversed paraphrase authoritative; merges the two accounts so the sequence is unclear; or treats confirmation as policy/requirement approval.

### Eliciting within an approved low-risk ticket

- **Scenario:** The approved ticket is limited to adding a read-only inventory lookup to the staff terminal; stock adjustments and outbound shipment flow are explicitly excluded. Nina (day shift) and Omar (evening shift) are named participants. The request is to learn how they recognize stale lookup data and check that the notes represent their answers before refining help text.
- **Pass:** Proposes a brief, proportionate check with Nina and Omar focused on stale-data cues, then confirms the captured account with them; leaves the approved scope and exclusions intact; proceeds without inventing roles or requiring BRD intake, a workshop, or a new formal artifact.
- **Fail:** Requires BRD/workshop/formal intake before the check; invents an approver or participant; reopens or expands the already-approved ticket; or treats participant confirmation as approval to change inventory policy or scope.


Conceptual navigation: [IIBA BABOK task navigation](https://www.iiba.org/knowledgehub/business-analysis-body-of-knowledge-babok-guide/tasks/) (elicitation and collaboration; analysis planning and monitoring). This repository guidance is an independently authored application, not a substitute for the Guide or a claim of complete BABOK coverage.
