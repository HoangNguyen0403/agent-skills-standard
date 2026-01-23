---
name: Git & Collaboration Standards
description: Universal standards for version control, branching, and team collaboration.
metadata:
  labels: [git, collaboration, commits, branching]
  triggers:
    keywords: [commit, branch, merge, pull-request, git]
---

# Git & Collaboration - High-Density Standards

Universal standards for version control, branching, and team collaboration.

## **Priority: P0 (OPERATIONAL)**

Universal standards for effective version control, branching strategies, and team collaboration.

## 📝 Commit Messages (Conventional Commits)

- **Format**: `<type>(<scope>): <description>` (e.g., `feat(auth): add login validation`).
- **Types**: `feat` (new feature), `fix` (bug fix), `docs`, `style`, `refactor`, `perf`, `test`, `chore`.
- **Atomic Commits**: One commit = One logical change. Avoid "mega-commits".
- **Imperative Mood**: Use "add feature" instead of "added feature" or "adds feature".

## 🌿 Branching & History Management

- **Naming**: Use prefixes: `feat/`, `fix/`, `hotfix/`, `refactor/`, `docs/`.
- **Branch for Everything**: Create a new branch for every task to keep the main branch stable and deployable.
- **Main Branch Protection**: Never push directly to `main` or `develop`. Use Pull Requests.
- **Sync Early**: "Pull Before You Push" to identify and resolve merge conflicts locally.
- **Prefer Rebase**: Use `git rebase` (instead of merge) to keep a linear history when updating local branches from `develop` or `main`.
- **Interactive Rebase**: Use `git rebase -i` to squash or fixup small, messy commits before pushing to a shared branch.
- **No Merge Commits**: Avoid "Merge branch 'main' into..." commits in feature branches. Always rebase onto the latest upstream.

## 🤝 Pull Request (PR) Standards

- **Small PRs**: Limit to < 300 lines of code for effective review.
- **Commit Atomicness**: Each commit should represent a single, complete logical change.
- **Description**: State what changed, why, and how to test. Link issues (`Closes #123`).
- **Self-Review**: Review your own code for obvious errors/formatting before requesting peers.
- **CI/CD**: PRs must pass all automated checks (lint, test, build) before merging.

## 🛡 Security & Metadata

- **No Secrets**: Never commit `.env`, keys, or certificates. Use `.gitignore` strictly.
- **Git Hooks**: Use tools like `husky` or `lefthook` to enforce standards locally.
- **Tags**: Use SemVer (`vX.Y.Z`) for releases. Update `CHANGELOG.md` accordingly.

## 📚 References

- [Clean Linear History & Rebase Examples](references/CLEAN_HISTORY.md)
