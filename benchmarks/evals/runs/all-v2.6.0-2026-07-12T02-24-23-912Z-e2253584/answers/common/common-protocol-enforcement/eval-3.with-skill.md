Before marking a task complete, check all of the following:

1. Active skills and workflows were retrieved and loaded before any source was written.
2. An adversarial audit found no standard defaults where project rules should govern behavior.
3. The current diff and file contents were freshly read after the write and checked against the active skills' anti-patterns.
4. Relevant tests, linters, builds, or other validation were run on the current state, including meaningful edge or failure cases.
5. A concrete command and artifact provide evidence for the completion claim.
6. No execution shortcut weakened the protocol: inspect for local mocks replacing shared fakes, hardcoded styles replacing tokens, non-standard error handling, and a missing pre-write audit log.
7. If a violation is found, fix it and repeat the scan; do not report success first.

Do not rely on memory, an earlier test run, or the small size of the change. Functional success is not sufficient until the protocol and evidence checks pass.

