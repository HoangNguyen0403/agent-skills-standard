Do not mark the registry `HEALED` yet. An exit-0 run after changing an assertion only proves the modified test passed; it does not prove the underlying defect was fixed. The “native verdict: healed” signal is insufficient when the test oracle changed.

Registry signoff needs:

- The original failure and its root cause.
- A reviewed diff showing the assertion remains semantically valid and was not weakened.
- Evidence the implementation satisfies the intended behavior, including relevant regression coverage.
- At least one clean rerun of the unchanged or independently validated test path, with logs/artifacts.
- Reviewer approval and confirmation that no known failures were suppressed.

If release timing requires proceeding, record the status as pending/waived with the risk and owner—not `HEALED`.
