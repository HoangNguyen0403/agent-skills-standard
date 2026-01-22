---
description: Automatically prepare a release by analyzing changes, bumping versions, and updating changelog/readme.
---

# Smart Release Preparer Workflow

Use this workflow to automate the tedious parts of a release.

## Steps

1. **Analyze Changes**:
   Identify files changed since the last release tag:

   ```bash
   # Get latest tag
   LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "HEAD")
   # List changed files
   git diff --name-only $LATEST_TAG..HEAD
   # Get commit logs
   git log $LATEST_TAG..HEAD --pretty=format:"- %s"
   ```

2. **Smart Detect Version**:
   - **CLI**: If `cli/` changes exist, recommend a **PATCH** (unless feat/breaking).
   - **Skills**: If `skills/<category>/` changes exist, recommend a **PATCH** for that category.
   - **Root**: If only `README.md` or root docs changed, consider skipping version bump.

3. **Synchronize Metrics**:
   Run the token calculation to ensure documentation and metadata are up to date:

   ```bash
   pnpm calculate-tokens
   ```

4. **Update Artifacts**:
   Apply high-density edits to:
   - `cli/package.json` & `cli/src/index.ts` (Version bump).
   - `skills/metadata.json` (Version & `last_updated` bump).
   - `CHANGELOG.md` (Add structured entry under "Unreleased" or new tag).
   - `README.md` (Update version badges in the support table).

5. **Review & Commit**:
   - Present a summary of all changes to the user.
   - // turbo
     ```bash
     git add . && git commit -m "chore(release): prepare release for [VERSION]"
     ```
