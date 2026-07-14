Treat the entire incoming implicit Intent as untrusted. If the Activity is internal, make it `android:exported="false"` and use an explicit Intent instead. If it must receive a deep link or another external request, validate all of the following before performing any action:

- Allow only the expected action, categories, MIME type, and data scheme/host/path. Reject unexpected or missing values; do not accept arbitrary `file://` data.
- Read each extra with the expected type (`getStringExtra`, `getIntExtra`, or a typed Parcelable API), then validate format, length, range, and allowed values. Treat null, malformed, oversized, duplicate, or unexpected extras as invalid. Do not blindly deserialize untrusted `Serializable` or `Parcelable` data.
- Do not use an extra such as `user_id`, role, path, or “is_admin” as proof of identity or authorization. Re-check authorization against the authenticated account and server-side state. If only a trusted caller may invoke the component, enforce a platform signature-level permission or another authenticated caller mechanism; do not trust a package name supplied in an extra.
- If the Intent carries a URI or stream, require the expected `content://` provider and validate the authority and resource before reading it. Use only the temporary grant needed for that resource.

For a sensitive operation, reject the request on any failed check, log only safe diagnostic metadata, and avoid launching another implicit Intent with unvalidated values. For outgoing implicit Intents, separately verify `resolveActivity(packageManager)` before starting them; that check does not make incoming Intent data trustworthy.

