# DOM Snapshot vs Screenshot — when to use which

The agent's screenshot Read is rendered at ~320 px wide (downsampled). **Sub-3 px symptoms vanish** in the preview but are clearly visible to humans at full resolution. For pixel-scale CSS bugs, the screenshot Read **lies**.

## Decision matrix

| Defect class                                          | Primary evidence            | Why                                                |
| ----------------------------------------------------- | --------------------------- | -------------------------------------------------- |
| Element absence/presence (empty wrapper, stray strip) | DOM snapshot                | Snapshot literal: `grep '#recent'` returns or not |
| Text content / wording / i18n                         | DOM snapshot                | Snapshot includes literal rendered text           |
| Border / hairline / 1–3 px stripe                     | DOM snapshot                | Pixel preview hides; `grep` for offending element |
| Border-radius missing                                 | DOM snapshot + screenshot   | Snapshot confirms element; screenshot shows shape |
| Layout / alignment / spacing (>5 px)                  | Screenshot (Read full-res)  | Visual perception is the source of truth          |
| Color / contrast / branding                           | Screenshot                  | Pixel values matter                                |
| Z-order / overlay                                     | Screenshot + DOM bbox check | Hidden elements show in DOM but not pixels        |
| Hover/focus reveal                                    | DOM snapshot                | Confirm hover-only DOM additions appear           |

## The pixel-scale rule (mandatory)

For any CSS-only fix targeting:
- 1–3 px strips, hairlines, missing borders
- Sub-em alignment shifts
- "Empty wrapper visible as thin rectangle"

→ **DOM snapshot is the primary proof. Screenshot is supplementary.**

### How to verify pixel-scale fixes

```bash
# 1. Capture buggy state on develop (or before fix)
playwright-cli -s={SESSION} snapshot 2>&1 | grep "id='<offending-element-id>'"  # confirm element renders

# 2. Apply fix, restart dev, re-capture
playwright-cli -s={SESSION} snapshot 2>&1 | grep "id='<offending-element-id>'"  # absent (or restyled per diff intent)

# 3. Optional screenshot for the human reviewer
playwright-cli -s={SESSION} hover <surrounding-ref>
playwright-cli -s={SESSION} screenshot --filename=.playwright-cli/<TICKET>-after.png
```

If the agent's screenshot Read shows "looks clean" but the DOM still has the offending element → **the fix is incomplete**. Trust the DOM snapshot.

## The trap (real example)

PR fixed `border-t-solid` → `border-t-0`. Code review approved, agent declared PASS based on screenshot Read. But the empty dropdown wrapper still rendered with `bg-white` + side + bottom borders → visible as a thin white "extension strip" below the search input on click. The strip was 1–2 px tall — the agent's downsampled preview showed it as a single anti-aliased pixel = invisible.

The user caught it from full-res. Proper fix required `{isShowSearchBox && hasDropdownContent ? <div> : null}` — gating wrapper render on actual content. Confirmed via DOM snapshot showing `#recent` div absent on focus-without-content.

**Lesson:** "I can't see it in the preview" ≠ "it's not there". Trust DOM snapshot for sub-3 px symptoms.
