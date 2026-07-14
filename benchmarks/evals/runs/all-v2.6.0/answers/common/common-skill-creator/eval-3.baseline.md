Low trigger accuracy means the skill’s activation contract is underspecified or ambiguous. Diagnose it with a labeled test set rather than changing the description blindly.

Build examples from real requests: clear positives, paraphrased positives, domain-adjacent requests, and clear negatives. For each missed positive, identify the missing cue: task intent, technology, artifact, or terminology. For each false positive, identify which phrase is too broad. Keep a held-out set so the revised description is not tuned only to the examples used for diagnosis.

Rewrite the description to name the user goal, the relevant technologies/artifacts, and the scope boundary. Include common synonyms and natural-language variants, for example both “create a skill” and “write a SKILL.md” when those are genuinely equivalent. Avoid generic terms such as “best practices,” “development,” or “automation” unless constrained by the domain. State explicit exclusions when neighboring skills are likely to compete.

Improve the body only where it supports correct routing: put trigger-specific cues near the beginning, make the first steps concrete, and remove unrelated content that dilutes the skill’s identity. Do not solve routing problems by making the trigger so broad that unrelated tasks activate it.

Re-run the positive/negative suite and report precision, recall, false-positive rate, and false-negative rate. Compare against the original 40% recall (if that is what “fires” measures), and separately report any change in precision. Review overlapping skills for competing descriptions and adjust boundaries or precedence rules rather than duplicating all of their content.

Keep the changes minimal and versioned. Preserve a regression set containing every previously fixed miss and false positive. A skill is ready when it consistently activates for the intended request family, stays quiet for neighboring work, and its activation wording accurately matches what the workflow actually teaches.

