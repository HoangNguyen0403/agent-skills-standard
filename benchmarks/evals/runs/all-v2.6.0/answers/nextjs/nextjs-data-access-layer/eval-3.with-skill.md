# Client access to database data

A Client Component must not import the DAL or database client. Keep the query in a server-only DAL function, authenticate and authorize there, and return a minimal serializable DTO through one of these bridges:

- Fetch it in a parent Server Component and pass the DTO as props.
- Use a Server Action for a mutation or user-triggered read.
- Use a Route Handler when the client needs an HTTP boundary.

Do not fetch your own internal API from a Server Component; call the DAL directly on the server.

