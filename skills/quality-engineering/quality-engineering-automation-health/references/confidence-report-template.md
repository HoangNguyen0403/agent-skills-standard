# Automation Health Report Template

```md
# Automation Health: [suite or release]
Window: [dates or run count]

## Three Questions
| Question | Answer | Evidence |
| --- | --- | --- |
| Core workflows intact | yes / no / unknown | [scenario ids or run link] |
| No serious regression | yes / no / unknown | [diff of failing vs baseline] |
| Fast feedback | yes / no / unknown | [median minutes] |

## Four Metrics
| Metric | Value | Target | Trend |
| --- | --- | --- | --- |
| feedback_loop_minutes | | | |
| suite_reliability_pct | | | |
| release_cadence | | | |
| prod_escape_rate | | | |

## Verdict
release_confidence: high | medium | low
reason: [one sentence tied to the failing question or metric]

## Next Actions
- [action, owner, metric it moves]
```
