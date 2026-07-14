Extract the JSX text into stable translation keys and load a dictionary per locale instead of copying English strings into conditionals:

```tsx
<h1>{t('account.title')}</h1>
<p>{t('account.greeting', { name })}</p>
```

Keep dictionaries organized by feature or namespace, for example `messages/en/account.json` and `messages/es/account.json`, and use an i18n library that supports interpolation, pluralization, date/number formatting, fallback locales, and missing-key diagnostics. For App Router, load translations in Server Components where possible; wrap interactive Client Components with the library's client provider or pass the minimal translated values they need. Do not use visible English text as the long-term key, because copy changes then look like missing translations. Audit attributes, validation messages, metadata, emails, notifications, and accessibility labels—not only visible JSX—and add a lint/check that all required locales contain the keys.

