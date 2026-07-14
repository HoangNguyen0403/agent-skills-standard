# `BroadcastReceiver` and `android:exported`

Make the receiver's trust boundary explicit:

```xml
<receiver
    android:name=".InternalReceiver"
    android:exported="false" />
```

Use `android:exported="false"` when the receiver is only for broadcasts from your own app. If it has an `intent-filter`, Android 12+ requires an explicit exported value, so do not leave the attribute implicit.

Set `android:exported="true"` only when external apps or the system must invoke it. In that case, restrict access with the narrowest appropriate permission (prefer a signature-level permission for trusted callers), use explicit broadcasts for internal flows, and treat every incoming action, extra, URI, and type as untrusted input. Validate the expected schema and reject unexpected callers/data. Do not expose sensitive operations or data through an unnecessarily exported receiver.

