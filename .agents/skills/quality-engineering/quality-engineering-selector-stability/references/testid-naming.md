# Test-ID Naming Convention

Pattern: `<screen>-<element>-<role>`, all kebab-case, no abbreviations that aren't
already used in the codebase.

| Screen | Element | Role | Id |
|---|---|---|---|
| checkout | submit | button | `checkout-submit-button` |
| login | email | input | `login-email-input` |
| profile | avatar | image | `profile-avatar-image` |

Do not encode index/position (`checkout-item-0`) unless the list itself is the
thing under test — prefer scoping the locator to a parent test id and then
using role/text within that scope.
