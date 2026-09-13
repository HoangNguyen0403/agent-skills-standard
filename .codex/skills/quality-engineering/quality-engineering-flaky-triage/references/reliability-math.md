# Reliability Math

`quality-engineering-automation-health` computes `suite_reliability_pct` from red runs; in plain words, the share of red runs the team could trust. Quarantine changes that number in two ways; report both.

- **Trusted-red share**: `100 * (red runs caused by a real defect or real infra outage) / (all red runs)`. A quarantined test that still fails does not count as a red run of the gating suite, so quarantine raises this number only by removing the untrusted reds, never by hiding them.
- **Quarantine load**: `quarantined tests / total tests` and the age of the oldest open quarantine ticket. Report next to `release_confidence`; a rising load with flat fixes means the suite is being hollowed out.

Thresholds to state in every report:

| Signal | Target |
| --- | --- |
| Trusted-red share | at or above 90% |
| Quarantine load | under 2% of the suite |
| Oldest open quarantine | under 14 days |
| Un-quarantine criterion | 10 consecutive isolated green runs after the fix |

A suite with 100% pass rate and 5% of its tests in quarantine is less reliable than a suite at 97% with none.
