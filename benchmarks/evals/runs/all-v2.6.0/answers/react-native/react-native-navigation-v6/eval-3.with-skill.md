Configure a linking prop on NavigationContainer with prefixes for the custom scheme and universal-link domain, then map URL paths to typed routes through linking.config. Handle unmatched paths with a 404 or safe fallback and validate all incoming parameters before using them.

On iOS, configure Associated Domains and the apple-app-site-association file. On Android, configure the intent filter and assetlinks.json for the App Link. Test cold start, warm start, and invalid URLs on both platforms; do not manually parse URL strings.



