Enforce the policy at both the application and transport layers:

1. Use `https://` endpoints everywhere and remove HTTP fallbacks. Ensure HTTP redirects cannot cause sensitive requests to be retried over cleartext, and configure the HTTP client to perform normal certificate-chain and hostname validation. Never ship a trust-all `TrustManager` or permissive `HostnameVerifier`.

2. Add an explicit Network Security Configuration, for example `res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false" />
</network-security-config>
```

Reference it from the `<application>` element:

```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    android:usesCleartextTraffic="false"
    ... />
```

The explicit setting makes the intent clear and protects against accidental cleartext connections made by supported platform networking APIs. Apps targeting Android 9/API 28 and later already default to disallowing cleartext in many cases, but relying on the default is weaker than declaring the policy and testing it.

If a development service genuinely needs HTTP, put any exception in a debug-only configuration or a narrowly scoped domain configuration; never leave a global release exception. Avoid allowing cleartext merely because a server certificate is inconvenient. Test release builds, including WebView and third-party SDK traffic, and use static checks plus runtime/network inspection to confirm that no sensitive request uses HTTP. For WebView, also prevent mixed content and load only HTTPS content.

