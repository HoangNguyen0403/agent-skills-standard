# Handling a missing entity from a deep link

Treat the URL parameter as untrusted input and make the destination screen resilient. Parse and validate the ID, show a loading state while fetching, and handle a not-found response without dereferencing missing data. Render a friendly not-found screen with a safe action such as returning home. Handle unauthorized responses by routing through the sign-in flow and preserving only the non-sensitive destination intent.

Do not assume the deep link target exists just because the route matched. Centralize this behavior in the screen’s data hook or a link-intent resolver so notification links and regular URLs follow the same rules. Catch request failures, support retry, and avoid logging tokens or sensitive URL contents. If the route itself is malformed, configure a fallback/not-found route or ignore it safely rather than allowing an exception to escape during navigation initialization.

