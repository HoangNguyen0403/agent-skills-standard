Split the 400-line screen by responsibility and keep the screen mostly declarative:

- Keep JSX and screen-level event wiring in the screen component.
- Move API calls and business rules into a feature service and a custom hook.
- Colocate the screen, hook, service, and feature-specific components in one feature directory.
- Move genuinely reusable UI to shared components, with styles defined through StyleSheet.create.

The hook should expose loading, error, data, and actions; the screen should render those states rather than implement the rules itself. Keep files single-purpose, avoid circular feature dependencies, and use typed absolute imports.



