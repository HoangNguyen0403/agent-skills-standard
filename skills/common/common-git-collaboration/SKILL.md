---
name: common-git-collaboration
description: Enforce version control best practices for commits, branching, pull requests, and repository security. Use when writing commits, creating branches, merging, or opening pull requests.
metadata:
  triggers:
    keywords:
    - commit
    - branch
    - merge
    - pull-request
    - git
---
# Git & Collaboration

## **Priority: P0 (OPERATIONAL)**

## 1. Write Conventional Commits

- Format: `<type>(<scope>): <description>` (e.g., `feat(auth): add login validation`).
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`.
- Use imperative mood: "add feature" not "added feature".
- One commit = one logical change — no mega-commits.

See [implementation examples](references/implementation.md) for conventional commit examples.

## 2. Manage Branches

- Name with prefixes: `feat/`, `fix/`, `hotfix/`, `refactor/`, `docs/`.
- Create new branch for every task to keep main stable and deployable.
- Never push directly to `main` or `develop` — use Pull Requests.
- Pull before you push to resolve conflicts locally.
- Prefer `git rebase` over merge for linear history on feature branches.
- Use `git rebase -i` to squash messy commits before pushing.

## 3. Submit Quality Pull Requests

- Limit to < 300 lines of code for effective review.
- State what changed, why, and how to test. Link issues (`Closes #123`).
- Self-review for obvious errors before requesting peers.
- PRs must pass all CI checks (lint, test, build) before merging.

## 4. Protect Secrets and Metadata

- Never commit `.env`, keys, or certificates — use `.gitignore` strictly.
- Use `husky` or `lefthook` for local Git Hooks enforcement.
- Tag releases with SemVer (`vX.Y.Z`) and update `CHANGELOG.md`.

## Anti-Patterns

- **No direct push to main**: All changes via PR, no exceptions.
- **No mega-commits**: One commit = one logical change. Split large ones.
- **No secrets in history**: Use `git filter-repo` to purge; rotate secret.

## References

- [Clean Linear History & Rebase Examples](references/CLEAN_HISTORY.md)