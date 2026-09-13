---
name: quality-engineering-visual-baseline
description: Captures, masks, compares, and updates screenshot baselines for web and mobile suites, with per-region thresholds and a reviewed-diff rule for every baseline change. Use when a screenshot assertion fails, a baseline needs updating, or visual checks are being added; not for deciding what to verify.
guardrail: true
metadata:
  triggers:
    files:
      - "**/__screenshots__/**"
      - "**/*-snapshots/**"
      - "**/__image_snapshots__/**"
    keywords:
      - visual baseline
      - screenshot baseline
      - update snapshots
      - toHaveScreenshot
      - pixel diff
      - mask dynamic
      - baseline diff
---
# Quality Engineering: Visual Baseline

## **Priority: P1 (HIGH)**

## Capture

- One baseline per scenario, viewport, theme, and locale that the plan names; never one baseline per developer machine. Capture in the CI image only; a locally captured baseline is a draft.
- Freeze animations and the clock before capture; wait for network idle and fonts loaded.
- Name baselines `<screen>-<state>-<viewport>[-dark][-<locale>].png` next to the spec in the tool's snapshot folder.

## Mask, Then Threshold

- Mask every dynamic region before comparing: clocks, counters, avatars, ads, maps, third-party embeds, randomised ids. A masked region is compared as a solid block, so a layout shift inside it still fails.
- Thresholds are per region and small: text and controls `0.1%` max diff pixels, images and charts `1%`. A suite-wide threshold above `1%` is a disabled check.
- Full detail in [Masking and Thresholds](references/masking-and-thresholds.md).

## Classify a Failure

A screenshot diff is `VISUAL_DIFF`. It is `REAL_REGRESSION` unless the whole diff lies inside a region that should have been masked or thresholded (then fix the mask, not the baseline). Layout shift, missing element, wrong color, or clipped text is a product change until the product owner says otherwise.

## Update a Baseline

- A baseline changes only through a reviewed diff: before and after images in the PR, the intended product change linked, and an approver named in the commit. See [Baseline Update Review](references/baseline-update-review.md).
- Never blind `--update-snapshots`: it approves every diff in the run, including the regression you have not seen yet.
- Update only the baselines whose diff was reviewed, scoped with `--grep` and the spec path; regenerate the rest from the same commit so unrelated drift stays visible.

## Red Flags

"just update the snapshots" · "bump the threshold to 5%" · "mask the whole header" · "it looks the same to me" — each accepts a regression sight unseen. Stop; review the diff image, name the intended change, then update the one baseline.

## Anti-Patterns

- **No blind snapshot update**: `--update-snapshots` without a reviewed diff approves an unreviewed visual regression.
- **No threshold inflation**: raising the threshold to make a diff pass disables the check for every future diff.
- **No mask as fix**: masking the region that regressed hides the regression; mask only genuinely dynamic content.
- **No local baselines**: a baseline captured outside the CI image fails on the next runner.

## References

- [Masking and Thresholds](references/masking-and-thresholds.md)
- [Baseline Update Review](references/baseline-update-review.md)
- [Tool Matrix](references/tool-matrix.md)
