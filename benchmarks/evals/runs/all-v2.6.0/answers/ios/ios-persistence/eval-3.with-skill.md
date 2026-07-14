The main anti-patterns in iOS persistence are:

- Doing heavy I/O on the main `viewContext` instead of using a private or background context
- Using string-based predicates instead of typed KeyPaths or generated helpers
- Omitting an explicit merge policy, which can cause conflict-resolution bugs
- Storing sensitive data like tokens or PII in `UserDefaults` instead of secure storage
- Using `UserDefaults` as a general database instead of limiting it to small flags and preferences

