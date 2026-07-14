# Trigger check for `common-store-changelog`

Skill description: Generate user-facing release notes for the App Store and Google Play from git history (App Store <=4000 chars, Google Play <=500). Use when generating release notes, app store changelog, play store release, or \"what's new\" text for a mobile app.

Based ONLY on the skill name and one-line description above — do not open the full skill body — decide whether this skill should activate for the task below.

> Generate App Store release notes for version 2.5 from these commits:
- feat(search): add voice input to search bar
- fix(auth): resolve token refresh race on iOS 17
- chore: upgrade fastlane to 2.219
- perf(timeline): lazy-load images to reduce scroll jank
- refactor(network): extract URLSession wrapper
- feat(settings): add dark mode support

Answer with exactly one line in the form `TRIGGER: yes` or `TRIGGER: no`, followed by a one-sentence justification on the next line.