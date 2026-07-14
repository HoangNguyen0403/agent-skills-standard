Create a shared Button interface and split the implementation into Button.ios.tsx and Button.android.tsx. React Native resolves the platform-specific file automatically, with Button.tsx as a fallback when appropriate.

Keep shared types, contracts, and data behavior in a platform-neutral module; put only the genuinely divergent UI or native behavior in the platform files. If the implementations are mostly alike, keep one component and use Platform.select instead. Test both implementations and avoid duplicating business logic.



