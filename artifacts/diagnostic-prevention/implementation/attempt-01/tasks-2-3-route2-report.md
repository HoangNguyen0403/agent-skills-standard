
## Correction history — route-2 follow-up (authorized once)

Parent-observed failure (actual run, attributed evidence; not reproduced here): helper suite
`28 tests, 21 PASS / 7 FAIL, 4.09s`. Failing fixtures were the valid-complete, fenced-positive,
existing-output and symlink cases, all exiting 5 with `verification owner` and `correction route`
reported missing.

Root cause (parent-confirmed by source inspection, matched against this source):
`_CONTRACT_LABELS` spells `Verification Owner` and `Correction Route`, while the canonical fixture
and `references/templates.md` use `Verification owner` / `Correction route`. `_label_value` called
`re.match` without `re.IGNORECASE`, so those two labels never matched their own contract text and
every otherwise-complete fixture was refused.

Fix: added `re.IGNORECASE` to the `_label_value` match. Nothing else in the parser changed — label
and colon still allow horizontal whitespace only, values are still same-line, fences are still
excluded with matching marker/length, and validation still runs before workspace resolution.
Mixed-case labels such as `**Verification Owner:**` and `**CORRECTION ROUTE:**` are now accepted;
empty values still cannot consume the next label.

Test corrections:

- Removed incidental stderr wording assertions from the contract-refusal tests, including the exact
  `scope / owned write set` message and the `refusing to overwrite` phrase. Refusal is now asserted by
  the stable exit code (`5` contract refusal, `4` publication refusal), plus the actual behavior:
  no output file, destination bytes unchanged, symlink still a symlink with its target bytes intact,
  default CLI still creates no `.agent`/`.gitignore` state. The historical-plan test now asserts a
  non-empty diagnostic (a diagnostic exists) rather than its wording.
- Dropped the per-variant field-name expectations from the individually-emptied-fields test; each
  variant now asserts the `5` exit and absence of output, so it cannot pass by borrowing another
  field's wording.
- Added one bounded positive: mixed/upper-case labels (`Verification Owner`, `CORRECTION ROUTE`,
  `real ingress`) are accepted. Existing canonical fixtures only exercised lowercase, so
  case-insensitivity had no coverage.

Not changed: all four `evals.json` oracles remain frozen as delivered (prompts, expected outputs and
the four assertions per case are byte-identical to the previous message); `quality`/alignment for the
changed case IDs is parent-reported 0 issues. No engine, schema, gate or threshold change.

Verification: NOT RUN here by assignment (no tests/probes/shell). Parent runs the helper suite and the
scorer tests. The single authorized corrective follow-up was used for this label-case fix; no profile
switch and no delegation.

Coordination: helper freeze sent to the current installed-helper owner `057a1711-86a1-40c0-b7fd-ec3bfcfba47a`
(the former `754d6e3c` is not the owner); Task 5 owner `d179acde` informed that the JSON is unchanged
and calibration can continue against the frozen bytes.
