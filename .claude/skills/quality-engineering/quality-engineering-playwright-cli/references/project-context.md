# Frontend — playwright-cli Context

Project-specific reference for the Next.js frontend (`datasource/frontend/`). Load this alongside `playwright-cli/SKILL.md` when in that repo or its worktrees, to skip discovery and avoid the env-loader / market / VPN / cred traps.

## Project Facts

| Property              | Value                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------ |
| Repo                  | `datasource/frontend/`                                                                |
| Stack                 | Next.js 14 (Pages Router) + React 18 + TypeScript 5.5 + Apollo + MUI + TailwindCSS         |
| Dev server script     | `cross-env NODE_ENV=development env-cmd -f .env node server` ← **uses env-cmd**            |
| Custom server         | `server.js` (express + http-proxy-middleware) — proxies `/api/*` to GraphQL backends       |
| Markets               | 13: HK / ID / KH / KR / MM / MY / PH / SG / TH / TW / VNP / VNS / VNM                      |
| Markets source-of-truth | `.vscode/launch.json` — 40+ debug configs, one per market × env                          |
| Test creds            | `integration_test/src/env/uat-{market}.env` (extracted from `integration_test/src/env.zip`)|
| Local URL             | `http://localhost:3000` (dev), `https://uat-{market}.yourdomain.com` (UAT — DO NOT verify pre-commit) |
| Backend hosts         | `*-uat-{market}.yourdomain.com` (corporate internal — VPN required)                              |

## Env-Loader Critical Gotcha

`package.json` `dev` script is `env-cmd -f .env node server`. **`env-cmd` OVERWRITES shell exports AND ignores `.env.local`.** The only way to switch market env is to **edit `.env` directly** (gitignored — safe).

### Market-switch recipe (mandatory pre-build)

```bash
# 1. Backup current .env
cp .env .playwright-cli/env-backup-original

# 2. Extract target-market env block from launch.json (JSONC — strip comments first)
TARGET="UAT-{MARKET} - debug in localhost"
sed -E 's|[[:space:]]*//[^"]*$||' .vscode/launch.json | jq -r --arg name "$TARGET" \
  '.configurations[] | select(.name==$name) | .env | to_entries | map("\(.key)=\(.value)") | .[]' \
  > /tmp/overlay.env

# 3. Merge: keep non-overridden keys from original, append overlay (later wins)
OVERRIDE=$(cut -d= -f1 /tmp/overlay.env | sort -u | tr '\n' '|' | sed 's/|$//')
grep -v -E "^($OVERRIDE)=" .playwright-cli/env-backup-original > .env.new
cat /tmp/overlay.env >> .env.new
mv .env.new .env

# 4. Sanity check
grep "^COUNTRY_CODE=" .env  # must show {MARKET}
```

### Cleanup (CRITICAL — restore on exit)

```bash
[ -f .playwright-cli/env-backup-original ] && mv .playwright-cli/env-backup-original .env
```

Skipping the restore leaks the verify-run market into the developer's next `npm run dev`.

### Verify proxies actually point at target market

```bash
grep "Proxy created" .playwright-cli/dev.log | head -3
# Must show *-uat-{market}.yourdomain.com URLs. Wrong market = overlay didn't apply.
```

## VPN Pre-flight (mandatory)

Backend hosts are on internal DNS — without VPN, `*.yourdomain.com` returns NXDOMAIN and login renders a misleading "Login Failed" UI.

```bash
HOST=$(grep '^ORDER_API=' .env | head -1 | cut -d= -f2 | sed 's|https*://||;s|/.*||')
host "$HOST" 2>&1 | grep -q "has address" \
  || { echo "FAIL: $HOST is NXDOMAIN — connect Company VPN before retrying"; exit 1; }
```

## env.zip Auto-Extract

Test credentials live in `integration_test/src/env.zip` (gitignored after extraction). If unextracted, `uat-{market}.env` files are missing.

```bash
[ ! -d integration_test/src/env ] && [ -f integration_test/src/env.zip ] \
  && (cd integration_test/src && unzip -o env.zip > /dev/null)
```

## Husky Bootstrap (fresh worktree)

```bash
[ -f .husky/pre-commit ] && [ ! -f .husky/_/husky.sh ] && npx husky install
```

## Test Account Fallback (UAT, all markets)

The credential file `integration_test/src/env/uat-{market}.env` has 5+ accounts. Try in this order (3-attempt cap per `common-web-visual-testing/login-and-test-data.md`):

| Order | Account key      | Password key     | Role          |
| ----- | ---------------- | ---------------- | ------------- |
| 1     | `client_user`    | `client_pwd`     | client_user   |
| 2     | `client_user_2`  | `client_pwd_2`   | client_user   |
| 3     | `client_user_5`  | `client_pwd_5`   | myclientuser (cross-market access) |

**`myclientuser` (account 5)** has access across multiple markets — useful when the first 2 fall through.

> **Note:** env file format has spaces before `=` on entries 3-5 (e.g. `client_user_3 =auto2_test`) — handle with `grep -E "^client_user_5\s*="`.

## Customer-Picker Dialog Handling

After login, the user must select a delivery customer before the search bar enables. The picker is multi-section — clicking the FIRST section's customer rows often does nothing (it's a recently-viewed cache); the actual selectable list is in the LOWER section with `[separator]` elements between rows.

```bash
# Select first SELECTABLE customer (lower section), then Confirm
SNAP=$(playwright-cli -s={SESSION} snapshot 2>&1)
LOWER_ROW=$(echo "$SNAP" | sed -n '180,260p' | grep -B1 'Customer Code:' | head -1 | grep -oE 'ref=e[0-9]+' | head -1 | sed 's/ref=//')
playwright-cli -s={SESSION} click "$LOWER_ROW"
sleep 2
CONFIRM=$(playwright-cli -s={SESSION} snapshot 2>&1 | grep -oE 'button "Confirm" \[ref=e[0-9]+\]' | head -1 | grep -oE 'e[0-9]+' | head -1)
playwright-cli -s={SESSION} click "$CONFIRM"
```

## SearchBar Market Quirk

`useCategorySearchHeader.tsx` gates `enableSearchWithCategory` on `isMYMarket && featureFlag.enable_search_with_category === 'true'`. Result:

- **MY market**: search dropdown shows TRENDING categories section → empty wrapper bug HIDDEN by content
- **Non-MY (SG/TH/PH/etc.)**: dropdown variant has no trending → empty wrapper bugs VISIBLE

For SearchBar verification, **always test on a non-MY market** (SG is the default reference).

## Worktree node_modules Strategy

Worktrees from `make worktree-add` don't inherit node_modules. Symlink to avoid 5-min reinstall:

```bash
SRC=/Users/.../datasource/frontend
WT=/Users/.../datasource/worktrees/{TICKET}/frontend
[ -d "$SRC/node_modules" ] && [ ! -e "$WT/node_modules" ] && ln -s "$SRC/node_modules" "$WT/node_modules"
```

Safe because the worktree shares the parent repo's git history → same `package-lock.json` → same dep tree.

## PR Evidence Attachment (ADO)

ADO MCP (`mcp__azure_devops__*`) doesn't expose a PR-attachment-upload tool. Use raw REST POST with `az`-CLI bearer for inline-renderable image embeds:

```bash
ADO_TOKEN=$(az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798 --query accessToken -o tsv)
curl -sS -X POST -H "Authorization: Bearer $ADO_TOKEN" -H "Content-Type: application/octet-stream" \
  --data-binary "@<file.png>" \
  "https://dev.azure.com/{ORG}/{PROJECT}/_apis/git/repositories/{REPO_NAME}/pullRequests/{PR_ID}/attachments/<filename>?api-version=7.1"
# Response: {"url": "https://dev.azure.com/.../attachments/<filename>", ...}
# Embed in PR description / threads as: ![alt](returned-url)
```

Method is **POST** (PUT returns 405). JIRA URLs render as text-links (cross-domain auth) — only ADO same-origin URLs render inline.

## Anti-Patterns (project-specific)

- **No assuming shell-export overrides .env**: env-cmd overwrites shell vars. Edit `.env` directly with backup/restore.
- **No skipping `.env` restore on cleanup**: `mv env-backup-original .env` BEFORE removing other artifacts.
- **No verifying SearchBar on MY market**: TRENDING section masks empty-wrapper bugs. Use SG/TH/PH.
- **No iterating account list past 3 attempts**: Cascade-locks team test accounts.
- **No JIRA URLs as inline embeds in ADO**: Cross-domain auth blocks. Upload to ADO via REST.
- **No UAT navigation pre-commit**: Localhost only. UAT serves the deployed build, not your fix.
