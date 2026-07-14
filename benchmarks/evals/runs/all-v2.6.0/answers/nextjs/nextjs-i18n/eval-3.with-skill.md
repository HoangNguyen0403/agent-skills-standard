Choose one canonical locale URL shape, preferably `/en/about` and `/fr/about`, and migrate every page to it. Use `middleware.ts` for detection and redirects, `app/[lang]/` for App Router locale segments, and one consistent locale source of truth. Update links and canonical/`hreflang` metadata so shared links resolve predictably; do not mix locale prefixes and suffixes across routes.

