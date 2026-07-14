Assuming the missed skill is `common-security-standards`, add these trigger keywords:

```yaml
keywords:
  - api endpoint
  - api endpoints
  - endpoint
  - rest api
  - http handler
  - route
  - controller
  - middleware
  - authentication
  - authorization
  - input validation
  - request validation
  - security
```

Trigger miss:

- Skill: `common-security-standards`
- Indirect phrase: “writing API endpoints”
- Fix: add API/route/controller aliases to the skill’s keyword triggers.

Apply the change across configured agent skill directories, update `AGENTS.md` if its index references triggers, and append a `Session retrospective` entry to `AGENTS_LEARNING.md`.
