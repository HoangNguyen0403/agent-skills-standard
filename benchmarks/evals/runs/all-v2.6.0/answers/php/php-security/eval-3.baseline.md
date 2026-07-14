Escape output for its destination context, not at input time. For HTML text or attribute output, use htmlspecialchars with UTF-8 and ENT_QUOTES; use context-specific encoders for JavaScript, CSS, URLs, and SQL.

~~~php
echo htmlspecialchars(
    $userProvidedName,
    ENT_QUOTES | ENT_SUBSTITUTE,
    'UTF-8'
);
~~~

Use a templating engine with auto-escaping where possible, and do not mark untrusted content as raw or trusted without sanitization.

