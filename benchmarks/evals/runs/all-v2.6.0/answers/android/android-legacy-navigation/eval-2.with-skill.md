# Prefer nested navigation graphs

For a large XML-based app, keep one host activity with one primary `NavHostFragment` and organize the graph into nested or included graphs, such as separate `nav_auth.xml` and `nav_main.xml` graphs.

Nested graphs keep each feature’s destinations and actions readable while preserving a centralized `NavController`, back stack, SafeArgs contracts, and deep-link handling. Define explicit `<deepLink>` elements in the navigation graph rather than manifest intent filters.

Use multiple `NavHostFragment`s only when the UI genuinely needs independent navigation stacks at the same time—for example, separate simultaneously visible panes. They add coordination and back-stack complexity, so they should not be the default way to modularize a large graph.

