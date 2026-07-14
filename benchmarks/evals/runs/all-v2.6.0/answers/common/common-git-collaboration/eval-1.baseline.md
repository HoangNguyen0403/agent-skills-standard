Use two commits, provided the changes are logically independent:

1. Commit the login bug fix.
2. Commit the new user profile feature.

Each commit should be focused, buildable, and tested on its own. This makes review easier, allows either change to be reverted or cherry-picked independently, and keeps the history clear. Use imperative, specific commit messages such as `fix(auth): handle expired login session` and `feat(profile): add user profile management`.

If the feature necessarily depends on the bug fix, still keep separate commits when possible and document the dependency. Before committing, inspect the staged diff with `git diff --cached`, ensure unrelated files are excluded, and run the relevant tests. Do not split a single tightly coupled change merely to make the commit count larger.
