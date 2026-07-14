# Using `DomSanitizer` safely

Usually, do not mark HTML as trusted. Angular automatically applies contextual escaping or sanitization for normal interpolation and property bindings. For example, `[innerHTML]="html"` is safer than a direct DOM assignment because Angular treats the value as HTML and sanitizes it.

The `bypassSecurityTrust*` methods are escape hatches, not general-purpose sanitizers. Calling `bypassSecurityTrustHtml(value)` tells Angular to trust the value and can turn attacker-controlled markup into XSS. Never use it to silence a warning, to fix a binding type error, or on values that come from users, URLs, query parameters, databases containing user content, or external APIs without a rigorous trust boundary.

If the application must support rich HTML, first apply a reviewed, allowlist-based sanitizer that permits only the required tags, attributes, protocols, and origins. Keep that sanitized output separate from raw input and bind it normally. You can also use `DomSanitizer.sanitize(SecurityContext.HTML, value)` for Angular's HTML-context sanitization, but a product that needs a strict rich-text policy may need an additional maintained sanitizer and server-side sanitization.

For non-HTML contexts such as URLs, styles, resources, and scripts, validate against an explicit allowlist and expected origin or protocol. Do not trust a value merely because it was produced by application code if any input influenced it. If a bypass is truly unavoidable, isolate it behind a small reviewed service, document the invariant that makes the value safe, add regression tests, and keep the trusted value's scope as narrow as possible.

