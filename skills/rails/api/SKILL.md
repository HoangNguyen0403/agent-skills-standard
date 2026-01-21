---
name: Rails API
description: Rails API standards (controllers, serialization, errors, CORS).
metadata:
  labels: [rails, api, json, cors]
  triggers:
    files: ['app/controllers/**/*.rb', 'config/routes.rb', 'Gemfile']
    keywords: [render, json, status:, Jbuilder, rack-cors]
---

# Rails API

## **Priority: P1 (HIGH)**

Build consistent JSON APIs with explicit contracts.

## Rules

- **Error format**: Standardize error response shape (code/message/details).
- **Validation**: Validate inputs; return 4xx with actionable messages.
- **Serialization**: Centralize serialization (serializer/jbuilder), not ad-hoc hashes in controllers.
- **Pagination**: Use stable pagination strategy (cursor/offset) and document it.


