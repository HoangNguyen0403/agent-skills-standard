White-team control should:

1. Immediately pause or stop the affected exercise activity—treat it as **scope drift** and do not make a silent scope change.
2. Preserve safety: do not alter production, use real credentials, contact real targets, or cross the synthetic-data boundary.
3. Notify the exercise lead and authorizing authority, then log the stop with the time, authority, scope reference, trigger, evidence, limitations, and accountable owner.
4. Hand the observation to independent adjudication; white-team control must not self-adjudicate the result.
5. Restart only after fresh authorization and runtime safety gates are confirmed and a recorded restart decision exists. Otherwise, terminate the live activity and use an offline inject.
