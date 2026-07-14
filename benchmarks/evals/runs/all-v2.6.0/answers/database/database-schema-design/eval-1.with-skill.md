Start from the hot reads and ownership model:

- A ticket detail page needs: ticket fields, ordered comments, attachment list, and recent audit history.
- A write path needs: add comment, upload attachment, update ticket status/assignee/priority, and record every material change in audit history.
- Ownership should be explicit: tickets own comments and attachments; audit history records changes against a ticket and optionally against a child record.

Recommended relational shape

1. `tickets`
   - One row per business ticket.
   - Core columns: `id`, `project_id`, `reporter_user_id`, `assignee_user_id`, `title`, `description`, `status`, `priority`, `created_at`, `updated_at`, `deleted_at`.
   - Constraints:
     - `title` not null.
     - `status` constrained to allowed workflow values.
     - `deleted_at` nullable with clear soft-delete meaning.
   - Indexes:
     - `(project_id, status, updated_at desc)` for queue/list views.
     - `(assignee_user_id, status, updated_at desc)` for “my tickets”.

2. `ticket_comments`
   - One row per user-visible comment.
   - Core columns: `id`, `ticket_id`, `author_user_id`, `body`, `visibility`, `created_at`, `updated_at`, `deleted_at`.
   - Cardinality: one ticket to many comments.
   - Why separate table: comments are unbounded, ordered, independently moderated/edited, and hot-read as a list.
   - Constraints:
     - `ticket_id` foreign key to `tickets.id`.
     - `body` not null.
     - `visibility` constrained if internal-only comments exist.
   - Indexes:
     - `(ticket_id, created_at asc, id asc)` for rendering the thread.
   - Lifecycle:
     - Prefer soft delete if auditability matters.

3. `ticket_attachments`
   - One row per attachment metadata record, not the binary itself.
   - Core columns: `id`, `ticket_id`, `comment_id` nullable, `uploaded_by_user_id`, `storage_key`, `file_name`, `content_type`, `byte_size`, `checksum`, `created_at`, `deleted_at`.
   - Cardinality:
     - one ticket to many attachments.
     - zero or one comment to many attachments if files can belong to a specific comment.
   - Why separate table: attachments have different lifecycle, size, and storage concerns from comments.
   - Constraints:
     - `ticket_id` foreign key required.
     - `comment_id` foreign key nullable, but if present it must reference a comment on the same ticket.
     - `storage_key` unique.
   - Indexes:
     - `(ticket_id, created_at asc)`.
     - `(comment_id, created_at asc)` if comment-level rendering is common.

4. `ticket_audit_events`
   - Immutable append-only history of important state changes.
   - Core columns: `id`, `ticket_id`, `actor_user_id`, `event_type`, `entity_type`, `entity_id`, `old_values_json`, `new_values_json`, `occurred_at`.
   - Cardinality: one ticket to many audit events.
   - Purpose:
     - Track status changes, reassignment, priority changes, comment edits/deletes, attachment add/remove, and ticket field updates.
   - Why event table instead of only updated timestamps:
     - audit history is write-once, time-ordered, and queried differently from current state.
   - Constraints:
     - `ticket_id` foreign key required.
     - `event_type` constrained to known domain events.
     - `entity_type` constrained to `ticket`, `comment`, `attachment`.
   - Indexes:
     - `(ticket_id, occurred_at desc, id desc)` for recent activity.
     - `(entity_type, entity_id, occurred_at desc)` if admins inspect record history directly.

Recommended rules for tricky relationships

- Do not model comments and attachments in one polymorphic “items” table. They differ in validation, lifecycle, and access patterns.
- Do not embed attachments or audit history as JSON arrays on `tickets`; both are high-churn, unbounded collections.
- If an attachment can exist without a comment, keep `comment_id` nullable with explicit meaning: attached to the ticket itself.
- If many-to-many tagging of attachments is ever needed later, add a join table later; do not introduce it now without a concrete read path.

Audit design guidance

- Keep `ticket_audit_events` immutable.
- Store a compact structured diff, not only free text. Example:
  - `event_type = 'ticket_status_changed'`
  - `old_values_json = {"status":"open"}`
  - `new_values_json = {"status":"in_progress"}`
- Also keep actor and timestamp first-class columns so common reads do not need JSON extraction.
- If compliance requirements are strong, comments edits and deletes should create audit events instead of overwriting without trace.

Consistency conventions

- Use the same ID type everywhere.
- Use `created_at`, `updated_at`, and `deleted_at` consistently across mutable tables.
- Soft-delete semantics should be uniform:
  - comments/attachments may be hidden from default reads when `deleted_at` is set;
  - audit events should never be soft-deleted in normal operation.

Minimal example DDL shape

```sql
create table tickets (
  id uuid primary key,
  project_id uuid not null,
  reporter_user_id uuid not null,
  assignee_user_id uuid,
  title text not null,
  description text,
  status text not null,
  priority text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table ticket_comments (
  id uuid primary key,
  ticket_id uuid not null references tickets(id),
  author_user_id uuid not null,
  body text not null,
  visibility text not null default 'public',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table ticket_attachments (
  id uuid primary key,
  ticket_id uuid not null references tickets(id),
  comment_id uuid references ticket_comments(id),
  uploaded_by_user_id uuid not null,
  storage_key text not null unique,
  file_name text not null,
  content_type text not null,
  byte_size bigint not null,
  checksum text,
  created_at timestamptz not null,
  deleted_at timestamptz
);

create table ticket_audit_events (
  id uuid primary key,
  ticket_id uuid not null references tickets(id),
  actor_user_id uuid not null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  old_values_json jsonb,
  new_values_json jsonb,
  occurred_at timestamptz not null
);
```

Why this shape fits the access pattern

- Ticket page reads stay simple: one ticket row plus three bounded child queries keyed by `ticket_id`.
- Hot reads avoid avoidable fan-out because comments, attachments, and audit history each have direct `(ticket_id, time)` access.
- Business invariants are explicit through foreign keys, uniqueness, nullability, and enumerated state rules.
- The model evolves additively: reactions, attachment virus-scan status, or richer audit metadata can be added without redesigning current tables.

