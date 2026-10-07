At 100 requests/second, multi-region failover should be justified by business availability, RTO, and RPO—not traffic volume alone.

Assuming this is a non-critical internal admin tool, a single region with:

- Multi-AZ deployment
- Automated backups and restore testing
- Documented recovery procedures
- Defined RTO/RPO
- Basic health monitoring and alerting

is likely sufficient. The review should record multi-region failover as a deferred requirement or risk acceptance.

If the tool must remain available during a regional outage, implement a right-sized active-passive design: replicated infrastructure in a second region, database replication or regularly validated backups, health-checked DNS/traffic-manager failover, and a tested failover runbook. A reviewer should specify the required RTO/RPO rather than failing the system solely because it lacks multi-region failover.
