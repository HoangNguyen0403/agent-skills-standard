Yes. Tokens in deep-link URLs can leak through OS logs, analytics, browser history, notification previews, referrers, screenshots, and copied links. Remove the token from the URL and use a short-lived one-time code that the app exchanges over HTTPS, then store the resulting credential in the platform keychain/keystore.

Also whitelist the expected scheme and host, validate and sanitize route parameters, and never log the raw URL. Deep links should be treated as untrusted input, with the backend performing the final authorization check.



