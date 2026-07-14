Assuming you have the Jira key and Zephyr permissions:

1. Identify the affected Jira issue by its unique key (for example, `TICK-123`) and review its Summary, Description, Acceptance Criteria, Components, reporter, assignee, and Story Points.

2. Use **Get Issue Link Test Cases** for that issue. Compare each linked Zephyr test case against the current checkout behavior and ACs.

3. Remove or unlink outdated Zephyr test cases and delete obsolete Jira links/comments. Remove unused labels, including `has-zephyr-tests` if no valid tests remain linked.

4. Update existing valid tests or create replacement Zephyr cases. Link each current case with **Create Test Case Issue Link**, using its Zephyr Scale key such as `PROJ-T123`.

5. Add one concise Jira comment per link:

   `Linked Zephyr Test Case: PROJ-T123`

6. Reapply `has-zephyr-tests` once valid test cases are successfully linked, and verify every Jira AC has at least one current linked Zephyr test.

Also identify sibling issues sharing the same Component or VN/MY/SG market variant, since the refactor may have made their linked test cases stale too.
