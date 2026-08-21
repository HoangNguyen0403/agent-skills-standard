# Git Rebase Reference

Examples of maintaining a clean, linear git history.

## 🔄 Updating Feature Branch

Instead of merging `develop` into your feature branch:

```bash
# BAD: Creates a messy merge commit
git checkout feat/my-feature
git merge develop

# GOOD: Keeps history linear
git checkout feat/my-feature
git rebase develop
```

## 🔨 Interactive Rebase (Squashing)

Before opening a PR, clean up your commits:

```bash
# INTERACTIVE REBASE: Last 3 commits
git rebase -i HEAD~3
```

In the editor:

```text
pick f7f3f6d feat: add auth service
fixup 310154b style: fix lint errors in auth
fixup 4c6192a test: add unit tests for login
```

## 🚢 Mainline Rebase Strategy

1. `git fetch origin`
2. `git rebase origin/develop`
3. Resolve any conflicts locally.
4. `git push --force-with-lease` (Use with caution on own feature branches).
