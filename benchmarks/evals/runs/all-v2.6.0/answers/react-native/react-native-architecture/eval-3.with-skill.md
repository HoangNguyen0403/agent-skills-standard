For a new Expo project, prefer Expo Router: it provides file-based routing, good web parity, and is built on React Navigation. Choose React Navigation directly when the app is legacy, has complex deep-linking requirements, or needs highly customized navigation behavior.

Whichever you choose, document the decision and keep navigation separate from feature business logic. For a React Navigation setup, use typed param lists and a dedicated navigation layer; for Expo Router, keep route files thin and colocate feature logic outside the route tree.



