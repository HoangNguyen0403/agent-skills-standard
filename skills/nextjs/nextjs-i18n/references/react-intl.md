# react-intl Patterns for Next.js

Standardized setup for `react-intl` to ensure no hardcoded user-facing strings and proper SSR support.

## Guidelines

- **Use useIntl Hook**: Prefer the `intl.formatMessage` hook for dynamic strings in functional components.
- **FormattedMessage Components**: Use `<FormattedMessage />` for static text in JSX.
- **Hierarchical Keys**: Use descriptive, dot-notated keys (e.g., `cart.order_summary.total`) to organize large dictionary files.

## Performance

- **Selective Loading**: Only load the specific locale JSON file needed for the current request.
- **SSR Hydration**: Ensure the `IntlProvider` is initialized on the server with the correct locale and messages to prevent hydration mismatch.

## Anti-Patterns

- **Inline Conditionals**: Do not use `condition ? 'Yes' : 'No'`. Use two distinct localized keys.
- **Raw Strings**: Never commit `<span>Submit</span>`. Always use the translation engine.
