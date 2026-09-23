Assumption: `route handler` is an indirect phrase for an existing skill, not a reason to create a new skill.

**Trigger miss**

- Skill: affected existing skill ID, confirmed from `AGENTS.md`
- Missed phrase: `route handler`
- Root cause: routing/trigger gap
- Evidence: the task used `route handler`, but the matching skill was not loaded
- Proposed fix: add the exact keyword `route handler` to that skill’s canonical trigger list; update `AGENTS.md` only if its index must reflect the change
- Scope: edit the canonical registry source, regenerate exports with existing tooling, and do not modify installed copies

Before promotion, require:

- Concrete correction evidence linked to the session or redacted log; never persist credentials, customer identifiers, or raw incident data.
- Held-out evaluation comparing current guidance, the candidate, and a no-skill baseline with model and tools fixed.
- Preserved failures and separate review of any invalid grader or benchmark result.
- Fresh evaluation results showing the trigger now loads the intended skill without material regressions.
- Independent maintainer approval. The proposing agent cannot approve its own patch; its offered approval is not independent or authenticated.
- A `common/common-learning-log` entry in `AGENTS_LEARNING.md` recording the redacted evidence, candidate status, source revision, evaluation run, review reference, and rollback version.

Until those proofs and independent approval exist, the patch remains unpromoted.
