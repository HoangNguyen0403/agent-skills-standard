Treat an incoming implicit Intent as untrusted input: any app may be able to send it unless the component is protected. Validate it before using the data or performing an action.

- Check the action, categories, MIME type, and data URI against a strict allowlist. Validate the URI scheme, host, port, authority, path, and encoding; do not accept a merely similar host or blindly follow redirects.
- For every extra, check presence, type, nullability, length, count, and numeric bounds. Accept only the primitive, string, or byte-array types the contract defines. Do not deserialize arbitrary `Serializable` or `Parcelable` objects from an untrusted sender, and handle malformed bundles or `BadParcelableException` safely.
- Reject unexpected extras and validate nested Intents, `PendingIntent`s, and component/package names before launching or forwarding them. Never let an extra select an arbitrary component, file path, shell command, SQL fragment, or WebView URL without independent validation.
- Treat text as data and encode or parameterize it at its eventual sink; do not use Intent extras for authentication, authorization, or other security decisions. Re-check authorization and sensitive state at the point of use, including on the server when applicable.
- If the Activity is not intended for arbitrary callers, make it non-exported or protect it with an appropriate signature-level permission. Caller identity checks can supplement this but should not replace input validation; `getCallingPackage()` may be absent or unsuitable for all launch paths.

Use a documented input contract, fail closed on invalid values, and avoid crashing or partially executing the requested operation when validation fails.

