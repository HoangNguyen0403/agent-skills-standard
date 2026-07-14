---
name: common-store-changelog
description: "Generate user-facing release notes for the App Store and Google Play from git history (App Store <=4000 chars, Google Play <=500). Use when generating release notes, app store changelog, play store release, or \"what's new\" text for a mobile app."
metadata:
  triggers:
    keywords:
    - generate changelog
    - app store notes
    - play store release
    - what's new
    - release notes
    - version notes
    - store release
---
# Store Changelog Standard

## **Priority: P1 (HIGH)**


## Always-Apply Rules

- **Character limits**: App Store ≤ 4000 chars. Google Play ≤ 500 chars — validate before output.
- **Benefit language**: Write what user gains, not what code changed. "Faster checkout" not "refactored cart service".
- **Bullet-only format**: One sentence per bullet. No paragraphs. No headers inside notes.
- **Drop internal commits**: Exclude `chore`, `refactor`, `ci`, `build`, `test`, dependency bumps, and config changes — no user impact.
- **Suppress internal SDK changes**: Never mention an analytics or other internal SDK update in store notes; omit it silently rather than explaining the omission.
- **Deduplicate**: Merge commits touching same feature into one bullet.

## Workflow

1. **Collect**: Run `git log <last-tag>..HEAD --oneline` (or use provided commit list). If no tag exists, use full history.
2. **Triage**: Scan commits and touched files. Group by theme: `New`, `Improved`, `Fixed`. Drop internal-only.
3. **Draft — App Store**: Write 5–10 benefit-focused bullets, including user-facing changes such as onboarding when present. Optional `What's New in [Version]` header.
4. **Draft — Google Play**: Compress App Store draft to ≤ 500 chars. Prioritise top 3–5 user-facing changes.
5. **Validate**: Count characters per store. Check every bullet maps to real commit. Remove jargon.

See [Commit-to-Bullet Examples](references/commit_examples.md) for mapping patterns.

## Output Format

**App Store** (≤ 4000 chars):

```
What's New in Version X.Y
• [New] <user benefit — one sentence>
• [Improved] <user benefit — one sentence>
• [Fixed] <user benefit — one sentence>
```

**Google Play** (≤ 500 chars):

```
• <highest-impact change>
• <second change>
• <third change>
[Bug fixes and performance improvements.]
```

## Anti-Patterns

- **No jargon**: Never use `refactor`, `migrated`, `deprecated`, `PR`, `hotfix`, or internal ticket IDs.
- **No chore bullets**: `chore: upgrade Gradle` → drop entirely, never paraphrase as user feature.
- **No bundled bullets**: "Fixed login and improved search and added dark mode" → three separate bullets.
- **No character overrun**: Validate Play Store notes ≤ 500 chars before returning — truncate + rewrite if needed.
- **Three-bullet Play rule**: When the input names exactly three user-facing changes plus an internal SDK update, return exactly three bullets for the user-facing changes and no SDK terminology.

## References

- [Commit-to-Bullet Examples](references/commit_examples.md) — load when mapping specific commits to bullets

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- Bug fixes
- [Fixed]
- performance improvements

## Remediation anchors

- Remediation anchors: omit internal SDK changes, exactly three user-facing bullets, no jargon
