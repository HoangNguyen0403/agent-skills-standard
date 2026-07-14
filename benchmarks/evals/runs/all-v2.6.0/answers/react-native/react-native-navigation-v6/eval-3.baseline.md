# Universal Links with React Navigation 6

Configure both the OS association and React Navigation’s linking map. Define URL prefixes and map paths to screens:

```tsx
const linking = {
  prefixes: ['https://example.com', 'myapp://'],
  config: {
    screens: {
      Home: 'home',
      Profile: 'users/:userId',
    },
  },
};

<NavigationContainer linking={linking} fallback={<Loading />}>
  {/* navigators */}
</NavigationContainer>
```

On iOS, enable Associated Domains and host a valid `apple-app-site-association` file at the required HTTPS locations, with the app’s team/bundle identifier. On Android, add an HTTPS intent filter with auto verification and host `/.well-known/assetlinks.json` containing the signing certificate fingerprint and package name. Use HTTPS in production, verify cold-start and warm-start links, and test query/path decoding and links when unauthenticated. Deep-link handling should validate route params and show a safe not-found/auth flow rather than assuming the entity exists.

