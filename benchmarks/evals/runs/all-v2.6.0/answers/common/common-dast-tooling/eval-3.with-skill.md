Server version disclosure is usually a P1 information-leakage finding in this standard, with a suggested deduction of 10 points. It reveals technology and version information that can make targeted exploitation and vulnerability matching easier. It is not, by itself, proof of compromise, and severity should be adjusted for context: an exact outdated version with a known exploitable CVE, broad internet exposure, or other correlated weaknesses raises the practical risk; a generic banner on an isolated staging service is lower risk.

Confirm the finding by checking the raw response headers from the affected route and whether the disclosure comes from the application, reverse proxy, web server, or an upstream error page. Also check whether the banner exposes framework/runtime versions or other environment details. Do not report it solely from static configuration if dynamic responses do not contain it.

Remediate by disabling or minimizing `Server`, `X-Powered-By`, framework debug/version headers, and equivalent proxy banners at every gateway and backend layer. Keep detailed version data in internal inventory and logs rather than client responses. Add a regression check to the staging scan and verify normal and error responses after deployment. Separately patch unsupported or vulnerable components; hiding the banner is defense-in-depth, not a substitute for updates.


