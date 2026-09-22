Treat it as an out-of-scope target and block live validation immediately.

- Do not connect, probe, exploit, or perform scope probing.
- Stop the validation; do not bypass the allowlist or seek extra authorization during the run.
- Mark the finding `blocked` or `not-tested`, not pass/clean.
- Record the approved scope reference, authorization window, target mismatch, time, source, evidence references, limitations, and accountable owner.
- Route the result for independent adjudication. Offline plan review or synthetic analysis may continue without interacting with the real target.
