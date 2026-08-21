# Login + Multi-Account Fallback + Force-State Recipes

Generic patterns for authenticating into a web app under test and forcing specific data states.

## Multi-account fallback (3-attempt cap)

Real backends lock accounts after N failed login attempts. **Limit fallback to 3 attempts** — repeated failures cascade-lock additional test accounts.

### Pattern

```bash
# Try saved auth state first (fastest)
playwright-cli state-load .playwright-cli/local-auth.json 2>/dev/null || true

SNAP=$(playwright-cli snapshot 2>/dev/null)
if echo "$SNAP" | grep -qE "Page URL.*\/login"; then
    ATTEMPT=0
    for ACCOUNT in <account_1> <account_2> <account_3>; do
        [ "$ATTEMPT" -ge 3 ] && { echo "STOP: 3-attempt cap reached"; break; }
        ATTEMPT=$((ATTEMPT+1))
        # Read username/password from project's cred store
        USER=$(... project-specific lookup)
        PASS=$(... project-specific lookup)
        # fill username/password using fresh refs from snapshot ...
        sleep 5
        SNAP=$(playwright-cli snapshot 2>/dev/null)
        URL=$(echo "$SNAP" | grep -E "^- Page URL" | head -1)
        case "$SNAP" in
            *"blocked by the administrator"*) echo "[$ACCOUNT] BLOCKED — try next"; continue ;;
            *"Invalid username or password"*) echo "[$ACCOUNT] INVALID — try next"; continue ;;
        esac
        case "$URL" in
            *"/maintenance"*) echo "[$ACCOUNT] MAINTENANCE — abort, verdict PARTIAL"; break ;;
            *"/home"*|*"/products"*|*"localhost:3000/"*) 
                echo "[$ACCOUNT] LOGIN OK"
                playwright-cli state-save .playwright-cli/local-auth.json
                break ;;
            *) echo "[$ACCOUNT] still on login after 5s — try next"; continue ;;
        esac
    done
fi
```

### Account-rotation hygiene rules

1. **STOP at 3 failed attempts.** Do not iterate the entire account list — every failed login on the real backend counts toward that account's lockout.
2. **Save state on first success** to skip the loop on subsequent runs.
3. **Classify the failure** before retrying:
   - `BLOCKED` → administrator action; never retry the same account
   - `INVALID` → stale creds; rotate to next, flag for QA refresh
   - `MAINTENANCE` → backend issue; abort run with PARTIAL verdict
   - Still on `/login` after timeout → network or unknown; rotate

## Force-state recipes (test data prep)

When the bug only appears in a specific data state (empty list, "no results", over N items), force that state without polluting the database.

### Force empty state

| Approach | When | How |
|---|---|---|
| Filter to no results | List supports filters | Apply filter that returns 0 rows (`status=Overdue` on a customer with no overdue invoices) |
| Fresh user | Recent-searches dropdown | Log in as a test user with no activity history |
| Disable feature flag | Feature-gated section | Override flag in localStorage (`localStorage.setItem('feature_X', 'false')`) |

### Force loading state

| Approach | When | How |
|---|---|---|
| Throttle network | Spinner / skeleton verification | Browser DevTools Network throttle |
| Mock slow endpoint | Specific endpoint loading state | Intercept API call, delay response |

### Force populated state

| Approach | When | How |
|---|---|---|
| Pre-populate localStorage | Recent searches, recent items | `localStorage.setItem('RECENT_SEARCH', JSON.stringify([...]))` |
| Use account with history | "My orders" with rows | Pick an account known to have order history |

## Anti-patterns

- **No iterating past 3 attempts** — locks more accounts.
- **No reusing state across markets/envs** — clear `local-auth.json` when env-overlay changes.
- **No clear-text passwords in logs** — pipe through `tr -d` or use env vars.
- **No production accounts** — test creds only.
