gofmt formats Go source code into the standard Go style. It fixes spacing, indentation, and some layout, but it does not manage imports.

goimports does everything gofmt does, and also updates import lines: it adds missing imports and removes unused ones.

Which to use:

- Use `gofmt` if you only want formatting.
- Use `goimports` if you want formatting plus automatic import cleanup.

In practice, many Go developers use `goimports` in their editor or on save, because it usually covers both needs.

