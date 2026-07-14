Write it as an atomic, market- and platform-scoped AC:

**[BOTH] [Market: VN]**  
**Given** the Actor’s market `Variable = VN`  
**When** the tender status `Variable = Available`  
**Then** `{APP_NAME}` displays the `Tender Available` tag.

Assuming the behavior applies to both Web and Mobile, `[BOTH]` is appropriate. If parity is unconfirmed, create separate `[WEB]` and `[MOBILE]` ACs.

Additional implied ACs:

- **[BOTH] [Market: VN]** Given tender status is not `Available`, when the Actor views it, then the tag is not displayed.
- **[BOTH] [Market: non-VN]** Given the Actor’s market `Variable` is not `VN`, when the tender is available, then the VN-specific tag is not displayed unless another market rule permits it.
- **[BOTH] [Market: VN]** Given the Actor uses a supported locale, when the tag is displayed, then the correct localized label is shown. Define the translation key/value in a separate translation AC.
- If controlled by a feature toggle, add explicit `Toggle: <FlagName> = ON` and `Toggle: <FlagName> = OFF` ACs for both visibility outcomes.

A Truth table should confirm the combinations of market (`VN`/non-`VN`) and tender status (`Available`/not available).
