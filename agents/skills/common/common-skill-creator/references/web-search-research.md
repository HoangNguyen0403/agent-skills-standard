# Web Search Research Phase

Use before writing SKILL.md for unfamiliar or non-engineering domains (marketing, SEO, finance, legal, store optimization, etc.).

## When to Run

- Domain is unfamiliar (no existing skill to reference)
- Skill is non-engineering: no file extensions, purely conversational triggers
- You need to know what practitioners actually do, not what seems logical

## Research Query Patterns

| Goal             | Query pattern                                       |
| ---------------- | --------------------------------------------------- |
| Find standards   | `"[domain] best practices [year]"`                  |
| Find checklists  | `"[domain] checklist [specific task]"`              |
| Find frameworks  | `"[domain] framework guide [authoritative source]"` |
| Find mistakes    | `"[domain] common mistakes to avoid"`               |
| Find terminology | `"[domain] glossary terms"`                         |

**Examples for a store-optimization skill:**

- `"app store optimization best practices 2024"`
- `"ASO keyword research checklist"`
- `"Google Play Store ranking factors"`
- `"common ASO mistakes to avoid"`

## What to Extract

| Source                                   | Maps to                               |
| ---------------------------------------- | ------------------------------------- |
| Key terminology found in results         | Trigger keywords for `description`    |
| Standard workflows / step-by-step guides | Implementation Guidelines in SKILL.md |
| Common mistakes lists                    | Anti-Patterns section                 |
| Authoritative reference docs             | `references/` files to link           |

**Rule**: Extract the 20% of findings that cover 80% of real use cases. Skip edge cases on first pass.

## Non-Engineering Trigger Design

Engineering skills use file globs (`**/*ViewModel.kt`). Non-engineering skills must use conversational triggers only.

**Description formula:**

```text
"[What it does]. Use when user mentions '[term1]', '[term2]', '[term3]', or asks about '[task1]' or '[task2]'."
```

**Example (store-optimization skill):**

```yaml
description: >
  Guide app store listing optimization for iOS App Store and Google Play.
  Use when user mentions 'ASO', 'app store ranking', 'keyword density',
  'store listing', 'conversion rate', 'featured graphic', 'app description',
  or asks how to get more downloads or improve store visibility.
```

**Target**: 5-8 specific intents in description. Cover formal phrasing, casual phrasing, and domain jargon.

## Multi-Agent Compatibility Check

After research, verify skill content doesn't depend on agent-specific tools:

| Tool dependency                      | Compatible agents        |
| ------------------------------------ | ------------------------ |
| `web-search`, `WebFetch`             | Claude only              |
| File reading, `getDiagnostics`       | Claude, Cursor, Windsurf |
| No tool dependencies (pure guidance) | All agents               |
| `web-search`, `WebFetch`             | Claude only              |
| File reading, `getDiagnostics`       | Claude, Cursor, Windsurf |
| No tool dependencies (pure guidance) | All agents               |

- **If skill requires web-search at runtime**: note this in SKILL.md as "Claude only" or split into a research reference and a separate action skill.
- **Windsurf**: 32k token budget — target 40-60 lines, not 100.

## Output Checklist

After research, before writing SKILL.md:

- [ ] 5+ trigger keywords identified for description
- [ ] 3-5 implementation guidelines extracted from standards/checklists
- [ ] 3-4 anti-patterns identified from "common mistakes" sources
- [ ] At least 1 authoritative reference doc URL found to link in references/
- [ ] No runtime tool dependencies (or dependency noted explicitly)
