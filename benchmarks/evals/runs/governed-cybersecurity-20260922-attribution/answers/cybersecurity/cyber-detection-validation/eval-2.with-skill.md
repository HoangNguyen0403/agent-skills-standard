No. An action record without a usable, linked observation is a **telemetry-gap**, not `detected`.

Record:

- **Action evidence:** exists, linked by test ID/entity/time/source.
- **Observation evidence:** absent or unusable; record observation time and limitation.
- **Finding status:** telemetry-gap.
- **Do not classify as:** `blocked`, `prevented`, `detected`, or `responded`; detection is not response.
- Include scope reference, owner, skill/version/source, and framework/version/ID/relation/rationale/source/review status.

Remediate by validating runtime telemetry, repeating the controlled synthetic/offline fixture if authorized, and confirming an identifiable observation before assigning `detected`.
