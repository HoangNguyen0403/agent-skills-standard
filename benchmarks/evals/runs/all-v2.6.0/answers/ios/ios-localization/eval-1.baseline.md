Implement iOS localization by using Apple’s built-in localization system consistently:

- Put user-facing strings in `Localizable.strings` files, one per language in the correct `.lproj` folders.
- Never hardcode visible text directly in views or view controllers.
- Use stable localization keys with clear naming, like `settings.title` or `login.button.continue`.
- Retrieve strings with `NSLocalizedString` or a small wrapper helper so usage stays consistent.
- Localize pluralization, variable interpolation, and formatting with the proper APIs instead of manual string building.
- Keep translators in mind: add comments for ambiguous strings and avoid reusing one English string for different meanings.
- Test layouts with longer languages and right-to-left languages to catch truncation and alignment issues.
- Localize dates, numbers, currency, and units with formatters rather than custom text formatting.
- Include localization in CI or review checks so newly added user-facing strings are not missed.
- Regularly review unused keys and missing translations to keep the files maintainable.

If you want, I can also show a simple Swift example structure for `Localizable.strings` and `NSLocalizedString` usage.

