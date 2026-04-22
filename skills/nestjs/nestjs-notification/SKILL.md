---
name: nestjs-notification
description: Build dual-write notification services with database persistence and FCM push delivery in NestJS. Use when creating notification entities, sending push via FCM, or implementing in-app notification feeds.
metadata:
  triggers:
    files:
    - 'notification.service.ts'
    - 'notification.entity.ts'
    keywords:
    - notification
    - push
    - fcm
    - alert
    - reminder
---
# NestJS Notification Architecture

## **Priority: P0 (Standard)**

Implement "Dual-Write" notification system: persist to Database (In-App) and send via FCM (Push).

## Workflow: Send Notification

1. **Save to database** — Persist notification entity with type enum and metadata.
2. **Check FCM token** — Verify recipient valid `fcmToken`; skip push if missing.
3. **Send push** — Call FCM inside `try/catch`; never let FCM failure block request.
4. **Serialize data** — Convert Dates to ISO strings; keep FCM `data` payload flat (IDs only).

## Dual-Write Service Example

See [implementation examples](references/implementation.md)

## Structure

See [implementation examples](references/implementation.md)

## Implementation Guidelines

- **Use Dual-Write**: Save to DB _first_, then attempt FCM. Catch FCM errors so they don't block logic.
- **Define Granular Types**: Use `NotificationType` Enum (e.g., `APPOINTMENT_REMINDER`) for frontend icon/color logic.
- **Stringify Metadata**: Store routing data (IDs) as JSON string in DB, but Map to string-only Key-Values for FCM `data`.
- **Handle Tokens**: Check for `fcmToken` existence before sending. Fail gracefully if missing.
- **Serialize Dates**: Convert Dates to ISO strings before sending to FCM.

## Anti-Patterns

- **No Generic Types**: Avoid `type: string`. Always use Enum.
- **No Blocking FCM**: Never `await` FCM without `try/catch`. It shouldn't crash request.
- **No Complex Data in Push**: Keep FCM `data` payload flat and minimal (IDs only). Fetch details on open.

## References

- [Service Pattern (Dual-Write)](references/service.md)
- [Type Definitions](references/types.md)