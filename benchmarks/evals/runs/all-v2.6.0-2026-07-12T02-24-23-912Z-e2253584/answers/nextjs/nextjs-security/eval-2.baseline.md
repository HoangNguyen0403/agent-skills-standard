Do not assign untrusted content to `innerHTML`. React's normal text rendering escapes strings:

```tsx
<article>{userContent}</article>
```

If the product requirement is genuinely to render a restricted HTML subset, sanitize on a trusted boundary with a maintained sanitizer configured with an allowlist of tags, attributes, URL schemes, and safe protocols. Sanitize again when the content can change or comes from another trust domain, and never allow event-handler attributes, scripts, dangerous URLs, or unrestricted SVG. For server rendering, use an environment-compatible sanitizer and test its output; do not assume a browser-only `DOMPurify` setup is safe or functional on the server. Keep content encoded in storage when possible, apply a strong Content Security Policy as defense in depth, and review any markdown-to-HTML pipeline. Avoid a blanket `dangerouslySetInnerHTML` wrapper that makes future call sites unsafe by default.

