`android:exported` controls whether components can be reached by other applications. It is not automatically a vulnerability, but setting it incorrectly can expose a receiver as an IPC entry point.

If this receiver is only an internal implementation detail, declare it explicitly as:

```xml
<receiver
    android:name=".MyReceiver"
    android:exported="false" />
```

Use explicit intents from within the app. For Android 12/API 31 and later, every activity, service, and receiver with an intent filter must explicitly declare `android:exported`; otherwise the app may fail to install. Do not solve that build error by setting every component to `true`.

If other apps or a required system integration must send the broadcast, `android:exported="true"` can be intentional, but secure that public boundary. Require the narrowest appropriate permission, preferably a signature-level permission for app-to-app IPC, and validate the caller/permission, action, data, and every extra. Do not trust values from the intent, return sensitive data in an implicit broadcast, or perform privileged operations solely because a broadcast was received. Prefer explicit broadcasts where possible and use protected/system broadcasts when the platform provides them.

Review the receiver's intent filters and all callers, including dynamically registered receivers. For runtime registration, use the appropriate exported/not-exported receiver flag; on newer APIs this is commonly `RECEIVER_NOT_EXPORTED` for app-internal events. Confirm that any system broadcast still required by the app is delivered under the chosen visibility and permission model, then test both the intended sender and an unauthorized third-party app.

