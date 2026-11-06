# Receipt: metadata digest overflow — CSS wrap correction

- Status: **completed**
- Scope: bounded actual-surface correction inside approved AC-04 metadata readability
- Owned write set: `skills/common/common-architecture-diagramming/scripts/export_html.py` (CSS only) and this receipt
- Explicitly untouched: frozen `test_export_html.py` and other exporter tests, `validate_manifest.py`, renderer/style/checker sources, `references/offline-export.md` (its behavior description does not document layout, so no correction was needed)
- Config unchanged: existing profile settings; no installs, delegation, commits, publication or live evaluation

## Defect

Parent browser evidence at 1440px viewport (`.playwright-cli/AC-04-light-after.png`, `AC-04-dark-after.png`): the unbroken `sha256:<64 hex>` source digest overflowed its metadata-grid card and the page's right edge; fullpage width 1544 vs viewport 1440. Root cause: grid items default to `min-width: auto`, so the min-content width of the single-token digest sized the track beyond its `minmax(200px, 1fr)` share; no wrap opportunity existed for the token.

## Change (CSS only, in `build_html_page`)

```css
.metadata-grid > *,
.details-grid > * {
  min-width: 0;
}
.metadata-grid dd,
.details-grid dd,
.details-grid p {
  overflow-wrap: anywhere;
}
```

- `min-width: 0` lets `repeat(auto-fit, minmax(…, 1fr))` tracks shrink to their assigned share instead of the item's min-content.
- `overflow-wrap: anywhere` allows long metadata tokens — the SHA-256 digest plus the version/scope values — and citation `<code>` runs to break inside the card. It also reduces the item's min-content contribution, so it complements `min-width: 0` rather than relying on painting-level overflow.
- `overflow-wrap: anywhere` (not `break-word` alone) is required here because only `anywhere` affects intrinsic min-content sizing; `break-spaces` wording is not needed since the values contain no preserved whitespace runs.

## Preserved

- Full digest and literal text: no truncation, no ellipsis, no `overflow: hidden`, no clipping, no width cutoffs, no fixed 1500px envelope, no JS, no new resources or network access.
- Same rule class is applied to `.details-grid` cards because the evidence citation list sits there in a `<p>`; that is the same overflow defect class, not new UI capability.
- All prior exporter behavior (trusted ancestors, staging-only cleanup, exclusive publication, escaping/CSP, manifest capture binding) untouched.

## Verification

NOT RUN here — per brief no tests/build/lint/formatters mid-flight. Parent acceptance remains: actual browser `document.scrollWidth <= viewport` at 1440px and full digest text still present after the next final package; no permanent CSS/substring source test was added, per instruction that the real consumer smoke is sufficient.

## Limits

- Only the metadata/details card wrapping is corrected; the wide-viewport layout at other breakpoints was not re-measured independently here.
- Prior receipts (`exporter-residual-receipt.md`, `exporter-test-repair-receipt.md`) remain the evidence for the capture-binding and test-fixture work and are unmodified by this change.
