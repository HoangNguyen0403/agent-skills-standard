Handoff action — F-RESTORE:

Assumption: use a single, pre-approved maintenance window with a 2-hour execution cap.

Schedule one joint database/media restore drill. Measure elapsed time from restore start to recovery readiness, then verify media-to-record associations using a representative sample. Record timings, validation results, gaps, and evidence. Stop at the 2-hour cap or on safety-impacting conditions; report incomplete recovery as a failure.

Status: maintainer authorized writes, but plan-file creation failed before any file existed. No retry was performed. No saved plan artifact, review link, or architecture-entry link exists.
