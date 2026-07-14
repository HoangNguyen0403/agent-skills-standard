Common anti-patterns to avoid in iOS localization:

- Hardcoding user-facing strings in Swift or Storyboards/XIBs instead of using localized resources.
- Using the source English sentence itself as the lookup key, which makes copy changes risky and harder to manage.
- Concatenating localized fragments like `"Hello " + name`, which often breaks grammar in other languages.
- Assuming word order, sentence structure, or plural rules are the same across languages.
- Not using pluralization support for counts and quantities.
- Embedding layout assumptions that only work for English, like fixed-width buttons or labels that cannot expand.
- Ignoring right-to-left language support.
- Localizing visible text but forgetting accessibility labels, error messages, notifications, and empty states.
- Reusing one translation for multiple contexts when the meaning differs.
- Formatting dates, times, numbers, and currency manually instead of using locale-aware formatters.
- Storing localized strings in inconsistent places or naming keys poorly, which makes maintenance difficult.
- Failing to test the app in multiple locales, including long-text and RTL scenarios.
- Letting translators work without context such as screenshots or comments.
- Mixing localization logic directly into business logic instead of keeping it centralized and maintainable.

