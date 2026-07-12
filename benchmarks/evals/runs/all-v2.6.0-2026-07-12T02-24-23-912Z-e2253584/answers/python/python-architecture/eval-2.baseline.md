Separate the workflow into an orchestration/use-case layer and focused collaborators:

- A repository or query port fetches typed records.
- A pure policy service computes the report decision from those records.
- A formatter renders the resulting report model as Markdown.
- A Telegram gateway sends the rendered message.
- An application service coordinates those steps and handles transaction, retry, and error policy.

Inject those dependencies into the application service. Keep SQL and Telegram SDK details in adapters, and keep policy and formatting independently unit-testable. The application service should not contain SQL, Markdown construction, and transport-specific code in one function.
