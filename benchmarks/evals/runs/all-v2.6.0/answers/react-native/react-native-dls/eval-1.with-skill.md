Create a token layer such as theme/colors.ts, theme/spacing.ts, and theme/typography.ts. Replace each literal color with a color token, each spacing value with a spacing token, and each font size with a typography token. Import those tokens into component styles and define the styles with StyleSheet.create.

For light and dark themes, expose the same token shape from separate theme objects or a theme provider so components do not contain mode-specific literals. Migrate incrementally, starting with the shared tokens and highest-use components, and add review or lint checks so new literals do not return.



