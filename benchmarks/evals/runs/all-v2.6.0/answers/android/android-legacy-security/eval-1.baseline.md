Enable JavaScript only when the site genuinely requires it. It increases the attack surface, so leave it disabled for simple content and never enable it as a blanket requirement for arbitrary user URLs.

For an untrusted or user-controlled URL:

- Allow only HTTPS URLs and an explicit allowlist of hosts, schemes, ports, and redirect destinations. Reject `file:`, `content:`, `javascript:`, `data:`, and unexpected custom schemes unless they are deliberately handled.
- Use a `WebViewClient` and validate every navigation and redirect. Do not silently continue after TLS certificate errors.
- Disable local file/content access when not needed (`setAllowFileAccess(false)` and `setAllowContentAccess(false)`). On older Android versions also disable file-URL universal access and file-URL access to other files.
- Disallow mixed content (`MIXED_CONTENT_NEVER_ALLOW`), cleartext traffic, and third-party cookies unless a documented use case requires them. Enable WebView Safe Browsing where available.
- Do not expose `addJavascriptInterface` to untrusted pages. If a bridge is unavoidable, expose a minimal API, annotate only intended methods, and enforce the page origin; do not pass secrets through it.
- Keep WebView debugging disabled in release builds, avoid storing sensitive data in WebView state, and keep the Android System WebView and app dependencies updated.

The page should also be isolated from privileged app operations: treat its DOM, messages, downloads, and external intents as attacker-controlled, and require explicit validation before acting on any of them.

