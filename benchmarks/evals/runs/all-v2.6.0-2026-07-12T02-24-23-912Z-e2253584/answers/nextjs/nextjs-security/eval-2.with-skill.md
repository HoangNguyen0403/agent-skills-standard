Avoid raw `innerHTML`; render text as escaped React content whenever possible. If trusted rich HTML is required, sanitize it with a well-maintained sanitizer such as DOMPurify before using `dangerouslySetInnerHTML`, and enforce a restrictive CSP. Store no secrets in the component, and treat the content as untrusted even if it came from an authenticated user.

