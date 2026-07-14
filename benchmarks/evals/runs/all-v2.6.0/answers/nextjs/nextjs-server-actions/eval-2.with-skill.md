Use Server Actions for mutations when the project uses the App Router; no custom API endpoint is required for a form in the same application. Put the action in `actions.ts`, validate `FormData`, authenticate and authorize inside it, call the DAL/service, then revalidate the owning tags or paths. Use a Route Handler instead when a public HTTP API or non-React client needs the boundary.

