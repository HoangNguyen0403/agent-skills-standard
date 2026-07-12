Use two commits. Fixing the login bug and adding a user profile feature are separate logical changes, so they should be independently reviewable, revertible, and deployable.

Use Conventional Commit messages in the imperative mood, for example:

```text
fix(auth): correct login validation
feat(profile): add user profile feature
```

If the work is currently mixed together, separate the changes carefully before committing. Put the commits on a task branch such as `fix/login-and-profile` or, preferably, use separate focused branches if the changes will be reviewed or released independently. Do not push directly to `main`; pull/rebase as appropriate and submit the changes through a pull request.
