# Diagnostic Decoder — symptom → cause for web verify failures

When login fails, navigation breaks, or a page renders unexpectedly, classify the symptom BEFORE retrying. Many failure modes look identical at first ("Login Failed") but have different root causes.

## Symptom table

| Symptom                                                                         | Likely cause                                            | Fix                                                                                       |
| ------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Console: `ERR_NAME_NOT_RESOLVED` for `*.{your-domain}` + UI says "Login Failed" | **VPN not connected** (corporate internal DNS)          | Connect company VPN. Add `host {api-host}` pre-flight to catch in 1 s.                    |
| UI: "Your account has been blocked by the administrator." + Login disabled      | **Account locked** by failed-attempt threshold          | Try next account in fallback list. Do NOT retry the same account.                         |
| UI: "Invalid username or password"                                              | **Stale creds** OR rotated test account                 | Try next account. Flag account list for QA refresh.                                       |
| URL redirects to `/maintenance` after login                                     | **Backend in maintenance window**                       | Stop. Mark verdict PARTIAL. Defer visual verify to post-deploy.                           |
| Login OK but empty page / wrong-country data                                    | **Wrong env loaded by dev server**                      | Check `package.json` `dev` script env-loader (vanilla / env-cmd / custom). |
| Login OK but unexpected `/select-customer` / customer dropdown empty            | **Account has no associated customer/shipto**           | Different account needed for this market.                                                 |
| Page renders but a section conditionally rendered (e.g. trending) is missing    | **Feature-flag or market-conditional gate**             | Inspect the conditional in code (e.g. `isMYMarket && featureFlag.X`). Force the right env. |
| Build succeeds but dev server crashes on first request                          | **Missing env var the server.js requires**              | Check overlay applied; restart dev with proper env merge. |
| Dropdown opens but visually invisible                                           | **Empty wrapper rendering with no children = 0 height** | Use DOM snapshot to confirm wrapper exists; inspect children = 0 = bug.                  |
| OAuth redirect lands on production callback instead of localhost                | **SSO is configured for production callback URL**       | Don't use SSO on localhost; use username/password form.                                  |
| `git commit` fails: `.husky/_/husky.sh: No such file or directory`              | **Worktree never ran `husky install`**                  | Run `npx husky install` in the project root.                                             |
| Cross-domain image embed (e.g. JIRA URL in ADO PR) renders broken               | **Auth-gated URL — receiving renderer has no session**  | Upload to receiving system's own attachment store; embed same-origin URL.                |

## Login-failed disambiguation flow

When the UI says "Login Failed", FIRST run a DNS probe to rule out VPN:

```bash
# Pull the API host from your project's env file
HOST=$(grep '^ORDER_API=' .env | head -1 | cut -d= -f2 | sed 's|https*://||;s|/.*||')
host "$HOST" 2>&1 | grep -q "has address" \
  || echo "VPN not connected — host $HOST is NXDOMAIN"
```

DNS resolves OK → it's actually creds. DNS fails → connect VPN, retry.

## Status & console rules (run after every navigation)

**HTTP status** (parse `playwright-cli network` output):

- Main document `>= 400` → `local_launch: FAIL`, verdict FAIL
- Any `/api/*` `>= 500` → include in console summary, mark Major
- Final URL ≠ expected (redirect to /login, /error, /404) → FAIL

**Console classification** (parse `playwright-cli console` output):

| Pattern (regex on message)                                                                                                                                                 | Class                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `Hydration failed` · `Cannot read propert(y|ies) of (null|undefined)` · `is not a function` · `is not defined` · `Loading chunk \d+ failed` · `Uncaught (in promise)`      | BLOCKING → FAIL                               |
| `Warning:.*deprecated` · `MUI:.*sx prop` · `[GA]`/`gtag`/Segment/Mixpanel                                                                                                  | IGNORABLE → log count, no verdict change      |
| Anything else                                                                                                                                                              | OTHER → include in summary, no verdict change |
