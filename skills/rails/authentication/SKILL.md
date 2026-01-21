---
name: Rails Authentication
description: Authentication standards (Devise and session/token basics).
metadata:
  labels: [rails, authentication, devise]
  triggers:
    files: ['Gemfile', 'config/initializers/devise.rb', 'app/**/*.rb']
    keywords: [Devise, authenticate_user!, current_user]
---

# Rails Authentication

## **Priority: P1 (HIGH)**

Keep authentication explicit, testable, and consistent.

## Rules

- **Devise**: Prefer standard Devise flows; keep custom overrides minimal.
- **Controller boundary**: Use `before_action` for authn, but keep business flows in services.
- **Token/session**: Do not roll your own crypto; use proven libs and rotate secrets.


