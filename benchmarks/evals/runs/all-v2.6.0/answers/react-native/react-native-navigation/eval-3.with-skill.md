Treat the userId as untrusted input. Type the route parameter, validate its format before the request, and handle a missing or unauthorized record as an explicit not-found or error state instead of assuming the fetch succeeds. Render loading, error, and 404 or redirect-to-Home states without dereferencing missing data.

The linking configuration should map the URL to the typed route, while the screen or service performs validation and the backend remains authoritative. Avoid manual URL parsing and never let an invalid deep link crash the navigation tree.



