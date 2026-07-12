A 40% trigger rate is below the ≥80% target (the checklist targets ≥90% activation). Treat it as an activation-evaluation problem.

1. Rewrite the description as third-person What + When: name 5–8 concrete capabilities, user phrases, file types, and artifacts; keep it under 100 words.
2. Build labeled should-trigger and should-not-trigger queries covering direct terms, synonyms, abbreviations, file cues, and adjacent domains.
3. Run the trigger evaluation and inspect false negatives and false positives separately.
4. Revise only the activation anchor with surgical terms; never compensate with broad patterns such as `src/**` or `**/*`.
5. Rerun, compare accuracy and false-positive rate, and retain only a measured improvement. Then evaluate implementation and pressure scenarios independently, preserving a baseline snapshot.

Red flags: “40% is close enough,” generic keyword stuffing, or claiming the body compensates for a weak description. Completion evidence is the labeled query set, measured result, and final description.

