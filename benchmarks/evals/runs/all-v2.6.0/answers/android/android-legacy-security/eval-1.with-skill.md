Do not enable JavaScript merely because the WebView loads a URL. Keep it disabled for arbitrary or untrusted user URLs; JavaScript increases the attack surface and can be dangerous if the page can reach privileged native bridges.

If a trusted, allowlisted HTTPS site genuinely requires JavaScript, enable it only for that controlled WebView and do not expose broad native APIs through `@JavascriptInterface`. Restrict navigation with a `WebViewClient` (and use a tightly controlled `WebChromeClient` only when needed), allowing only the expected HTTPS schemes, hosts, and paths. Do not let an untrusted page navigate to a privileged origin.

At minimum, configure the WebView defensively:

```kotlin
webView.settings.apply {
    javaScriptEnabled = false // true only for a strictly required, trusted origin
    allowFileAccess = false
    allowContentAccess = false
    allowFileAccessFromFileURLs = false
    allowUniversalAccessFromFileURLs = false
}
```

Also reject unexpected URL schemes and hosts in navigation callbacks, avoid loading sensitive local content in the same WebView, use HTTPS, and disable cleartext traffic through the app's network security configuration. Never rely on the URL alone for authorization, and never add a JavaScript interface unless its methods and accepted inputs are narrowly validated.

