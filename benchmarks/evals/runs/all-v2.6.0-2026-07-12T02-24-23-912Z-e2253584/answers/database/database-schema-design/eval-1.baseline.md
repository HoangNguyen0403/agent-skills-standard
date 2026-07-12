A solid schema for comments, attachments, and audit history in a ticketing system should separate each concern into its own table, keep immutable history where accuracy matters, and use foreign keys plus indexes around the most common read paths.

At a high level, I would model:

- `tickets`
- `users`
- `comments`
- `attachments`
- `ticket_audit_events`
- optional join tables or child tables for richer audit detail

The core idea is:

- comments belong to a ticket and are authored by a user
- attachments can belong either directly to a ticket or to a specific comment
- audit events record important changes to the ticket over time and should usually be append-only

A practical relational design would look like this.

`tickets`

- `id` (PK)
- `title`
- `description`
- `status`
- `priority`
- `reporter_user_id` (FK to `users`)
- `assignee_user_id` (FK to `users`, nullable)
- `created_at`
- `updated_at`
- `closed_at` (nullable)

`comments`

- `id` (PK)
- `ticket_id` (FK to `tickets`, not null)
- `author_user_id` (FK to `users`, not null)
- `body` (text, not null)
- `is_internal` (boolean, default false) if some comments are staff-only
- `parent_comment_id` (nullable FK to `comments`) if threaded replies are needed
- `created_at`
- `updated_at`
- `deleted_at` (nullable) for soft delete if you need moderation or recovery

Why this shape:

- comments are a one-to-many child of tickets
- separate `author_user_id` preserves authorship even if ticket ownership changes
- `parent_comment_id` is optional and only needed for nested discussions
- soft delete is often better than hard delete for business systems

Recommended indexes for comments:

- `(ticket_id, created_at)` for rendering a ticket conversation efficiently
- `(author_user_id, created_at)` if user activity lookups matter
- `(parent_comment_id)` if threaded comments are used

`attachments`

- `id` (PK)
- `ticket_id` (FK to `tickets`, not null)
- `comment_id` (nullable FK to `comments`)
- `uploaded_by_user_id` (FK to `users`, not null)
- `storage_key` or `file_url`
- `original_filename`
- `content_type`
- `file_size_bytes`
- `checksum` or `hash` for integrity/dedup checks
- `created_at`
- `deleted_at` (nullable)

Important rule:

- every attachment should belong to a ticket
- some attachments also belong to a comment

That supports both use cases:

- ticket-level files such as logs or screenshots
- files attached as part of a specific discussion comment

You can enforce consistency with a check such as:

- `comment_id` is null for ticket-level attachments
- if `comment_id` is not null, that comment must belong to the same `ticket_id`

In some databases that second rule is enforced in application logic or with a trigger, because a simple foreign key cannot guarantee cross-table ticket alignment by itself.

Recommended indexes for attachments:

- `(ticket_id, created_at)`
- `(comment_id)` for comment detail views
- `(uploaded_by_user_id)`
- unique or selective index on `checksum` if deduplication matters

`ticket_audit_events`

- `id` (PK)
- `ticket_id` (FK to `tickets`, not null)
- `actor_user_id` (FK to `users`, nullable if system-generated)
- `event_type` (not null)
- `event_time` or `created_at` (not null)
- `summary` or short description
- `metadata_json` for structured extra details

This table should be append-only in most systems. Audit history is strongest when old events are never edited in place.

Typical `event_type` values:

- `ticket_created`
- `status_changed`
- `priority_changed`
- `assignee_changed`
- `comment_added`
- `comment_edited`
- `attachment_uploaded`
- `attachment_deleted`
- `ticket_closed`
- `ticket_reopened`

If you want detailed before/after field tracking, add a child table:

`ticket_audit_field_changes`

- `id` (PK)
- `audit_event_id` (FK to `ticket_audit_events`, not null)
- `field_name`
- `old_value`
- `new_value`

This is better than overloading one row with many nullable columns because:

- one audit event can describe multiple field changes
- the schema stays flexible as ticket fields evolve
- it is easier to query change history for one field

For example, changing both status and assignee in one action can produce:

- one row in `ticket_audit_events`
- two rows in `ticket_audit_field_changes`

Recommended indexes for audit history:

- `(ticket_id, event_time)`
- `(actor_user_id, event_time)` if actor investigations are common
- `(event_type, event_time)` for reporting

Design choices and tradeoffs:

1. Keep comments separate from audit history.
   A comment is user-authored content. An audit event is a system record of what changed. Sometimes one action creates both, but they serve different purposes.

2. Prefer append-only audit logs.
   Updating or deleting audit rows weakens trust. If correction is needed, add a compensating event instead.

3. Use soft delete selectively.
   Soft delete is useful for comments and attachments. It is usually less appropriate for audit events.

4. Store files outside the database.
   Usually the database keeps metadata while the actual file lives in object storage such as S3-compatible storage.

5. Use structured metadata for audit extensibility.
   `metadata_json` works well for contextual details like automation source, IP, integration name, or bulk update reason, while core queryable fields stay relational.

6. Think about permission boundaries.
   If internal comments exist, model that explicitly. Do not rely only on frontend filtering.

Example lifecycle:

- user creates ticket -> row in `tickets`, audit event `ticket_created`
- agent adds comment -> row in `comments`, audit event `comment_added`
- user uploads screenshot with comment -> row in `attachments` linked to both ticket and comment, audit event `attachment_uploaded`
- manager changes status from open to resolved -> audit event `status_changed` plus field change row with old/new values

If I had to summarize the best baseline shape in one sentence: use normalized child tables for comments and attachments, and an append-only audit event model with optional field-level change rows for trustworthy history.

