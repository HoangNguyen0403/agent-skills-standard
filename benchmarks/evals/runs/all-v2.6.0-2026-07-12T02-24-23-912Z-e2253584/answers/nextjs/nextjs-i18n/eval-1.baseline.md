Use one locale segment for every localized route, for example:

```text
app/[lang]/layout.tsx
app/[lang]/page.tsx
app/[lang]/about/page.tsx
```

The resulting URLs are `/en`, `/fr`, `/en/about`, and `/fr/about`. Generate the supported static params:

```ts
const languages = ['en', 'fr'];
export function generateStaticParams() {
  return languages.map((lang) => ({ lang }));
}
```

Load a server-side dictionary based on `lang` in the layout/page and pass only translated strings or safe translation data to Client Components. Add middleware to detect a preferred locale when no locale prefix is present, but redirect to one canonical prefix rather than creating multiple URL forms. Set `html lang={lang}`, provide language switch links that preserve the pathname, and add locale-aware metadata/alternate links. A mature i18n library can handle pluralization and formatting; do not build translation selection from ad hoc string concatenation.

