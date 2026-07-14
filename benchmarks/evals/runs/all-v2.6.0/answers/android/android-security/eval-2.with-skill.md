# Enforce HTTPS

Disable cleartext traffic in the app's network security configuration, then reference that configuration from the manifest.

`res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false" />
</network-security-config>
```

`AndroidManifest.xml`:

```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
</application>
```

Also make every client URL use `https://`, avoid raw URL concatenation (use `Uri.Builder` or OkHttp's `HttpUrl`), and review redirects and third-party SDK endpoints so they cannot downgrade requests to HTTP. For a high-security app, consider certificate pinning for controlled domains, with a documented rotation/expiry strategy. Never log tokens or other sensitive request data.

