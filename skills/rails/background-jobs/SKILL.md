---
name: Rails Background Jobs
description: Background job standards (ActiveJob, Sidekiq/Resque/Delayed Job).
metadata:
  labels: [rails, background-jobs, activejob, sidekiq]
  triggers:
    files: ['app/jobs/**/*.rb', 'Gemfile']
    keywords: [ActiveJob, perform, Sidekiq, queue]
---

# Rails Background Jobs

## **Priority: P1 (HIGH)**

Keep jobs idempotent, observable, and safe to retry.

## Rules

- **Idempotency**: Jobs must be safe to retry; avoid non-transactional side effects.
- **Arguments**: Pass IDs, not full objects.
- **Retries**: Use bounded retries; handle poison messages explicitly.
- **Observability**: Log job id + key parameters; avoid logging PII/secrets.


