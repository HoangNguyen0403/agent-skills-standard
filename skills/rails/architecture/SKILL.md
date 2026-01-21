---
name: Ruby on Rails Architecture
description: Rails architecture standards (layers, boundaries, conventions).
metadata:
  labels: [rails, architecture, mvc, boundaries]
  triggers:
    files: ['config/application.rb', 'config/routes.rb', 'app/**/*.rb']
    keywords: [ApplicationController, ActiveRecord, ActionController, routes]
---

# Rails Architecture

## **Priority: P0 (CRITICAL)**

Use Rails conventions while keeping domain logic isolated and testable.

## Structure

- **Controllers**: Thin; parameter parsing + authorization + orchestration only.
- **Models**: Keep persistence concerns; avoid business workflows in callbacks.
- **Domain/Services**: Put business workflows in service objects (e.g. `app/services/**`).
- **Form/Query Objects**: Use for complex validation/query building.
- **Serializers**: Centralize response shaping (avoid formatting logic in controllers).

## Rules

- **No heavy callbacks**: Avoid `after_commit`/`before_save` for core workflows.
- **No N+1**: Use `includes/preload/eager_load` and monitor query counts.
- **Transactions**: Use explicit `ActiveRecord::Base.transaction` for multi-write flows.
  - **Scope**: Keep transactions short; do not perform external IO (HTTP, email, S3) inside a transaction.
  - **Retries**: Handle transient DB errors (deadlocks/serialization failures) with bounded retries at the service layer.
  - **Consistency**: Prefer “write-then-enqueue” patterns; if you enqueue jobs, do it after commit (`after_commit` or outbox pattern).

## Concurrency & Locking

- **Row locking**: Use `with_lock` / `lock!` when updating shared counters/state that can be modified concurrently.
- **Avoid lost updates**: Prefer atomic updates (`update_all`, `increment_counter`) or lock rows before read-modify-write.
- **Deadlock hygiene**:
  - Lock rows in a consistent order across codepaths.
  - Keep lock scopes minimal; avoid locking more rows than needed.
  - Avoid nested locks across different tables unless order is consistent.


