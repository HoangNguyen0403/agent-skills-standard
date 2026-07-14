# Deep linking in React Navigation

Configure the app’s URL prefixes and route-to-path mapping on `NavigationContainer`:

```tsx
const linking = {
  prefixes: ['myapp://', 'https://example.com'],
  config: {
    screens: {
      Home: 'home',
      Product: 'products/:productId',
    },
  },
};

<NavigationContainer linking={linking} fallback={<Loading />}>
  <RootNavigator />
</NavigationContainer>
```

Register the custom scheme and platform URL/universal-link association files in iOS and Android. Test cold start, a running app, background state, query parameters, malformed URLs, and authenticated versus unauthenticated users. Use a loading/bootstrap state while restoring navigation and auth. Route params are untrusted input: validate and decode them, handle unknown routes/entities safely, and avoid placing secrets in URLs. For nested navigators, reflect the nesting in the linking config rather than manually parsing every URL.

