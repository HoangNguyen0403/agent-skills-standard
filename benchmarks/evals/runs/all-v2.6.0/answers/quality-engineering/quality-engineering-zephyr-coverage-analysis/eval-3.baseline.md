I cannot calculate the actual percentage or risk for `{PROJECT}-{ID}` without retrieving its ACs, linked Zephyr TCs, and execution status. The report should state its snapshot time and use a transparent formula such as:

`AC coverage = atomic ACs with at least one relevant, valid linked TC / total atomic ACs × 100`.

Break the result down by AC, platform, role, market, and criticality where applicable. Separate linked-but-not-executed, failed, blocked, stale, and passing tests; a linked test is not proof of release readiness. The risk assessment should identify business-critical uncovered or failing ACs, the likelihood and impact of shipping them, mitigations, and an explicit ship/no-ship recommendation agreed with the release criteria.
