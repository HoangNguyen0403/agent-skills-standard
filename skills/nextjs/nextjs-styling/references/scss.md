# SCSS & SASS in Next.js

Best practices for using SCSS for styling in Next.js projects.

## Standards

1.  **SCSS Modules**: Always use `.module.scss` to ensure styles are scoped and prevent global namespace collisions.
2.  **Variables and Mixins**: Centralize your theme tokens in a `styles/variables.scss` or `styles/mixins.scss` file.
3.  **No Global Pollution**: Only use global SCSS for resets and root-level CSS variables in `app/globals.scss` or `pages/_app.tsx`.

## Setup

In `next.config.js`:

```js
const path = require('path');

module.exports = {
  sassOptions: {
    includePaths: [path.join(__dirname, 'styles')],
    prependData: `@import "variables.scss";`, // Auto-inject variables into every module
  },
};
```

## Anti-Patterns

- **Deep Nesting**: Avoid nesting more than 3 levels deep. It makes CSS hard to maintain and increases specificity unnecessarily.
- **Direct Global Styles**: Avoid `@import` in component-level SCSS that produces global side effects.
