# App Router i18n

Use a single URL-first locale convention, such as `/en/...` and `/fr/...`, with `next-intl`. Add `messages/en.json` and `messages/fr.json`, detect or redirect locales in `middleware.ts`, and place pages under `app/[lang]/`. Load messages in Server Components, generate locale params with `generateStaticParams`, and emit correct `hreflang` metadata. Run `next build` and verify both locale trees render.

