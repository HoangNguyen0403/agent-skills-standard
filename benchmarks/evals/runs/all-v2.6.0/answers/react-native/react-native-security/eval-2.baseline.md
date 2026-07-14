# Certificate pinning

Pinning can reduce the risk of a compromised CA but increases operational risk: certificate rotation, expired pins, proxies, and emergency recovery can take the app offline. Decide whether the threat model requires it with the API/security team before implementing it.

If required, implement pinning in a maintained native networking layer or vetted library that covers every relevant request path, rather than assuming a JavaScript fetch wrapper pins TLS. Prefer public-key/SPKI pins and ship backup pins for planned rotation. Define an update and emergency fallback strategy before release; do not silently disable validation in production or rely on a remote switch that an attacker can alter. Keep the pin set environment-specific, test real devices and all API hosts, and monitor failures without logging sensitive request data.

Verify that redirects, downloads, third-party endpoints, certificate chains, IPv4/IPv6, and both iOS/Android paths are covered. Document the rotation runbook and coordinate server certificate changes with a released app version.

