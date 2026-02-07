---
name: NestJS Notification System
description: Standards for defining Notification Types, Service Architecture, and FCM Integration.
metadata:
  labels: [nestjs, notification, fcm, firebase, typeorm]
  triggers:
    files: ['notification.service.ts', 'notification.entity.ts']
    keywords: [notification, push, fcm, alert, reminder]
---

# NestJS Notification Architecture

## **Priority: P0 (Standard)**

Implement a "Dual-Write" notification system: persist to Database (In-App) and send via FCM (Push).

## Structure

```text
src/modules/notification/
├── notification.service.ts   # Logic: DB Save + FCM Send
├── entities/
│   └── notification.entity.ts # DB Schema + NotificationType Enum
└── types/
    └── notification.types.ts  # Interfaces for Payloads/Metadata
```

## Implementation Guidelines

- **Use Dual-Write**: Save to DB _first_, then attempt FCM. Catch FCM errors so they don't block the logic.
- **Define Granular Types**: Use `NotificationType` Enum (e.g., `APPOINTMENT_REMINDER`) for frontend icon/color logic.
- **Stringify Metadata**: Store routing data (IDs) as JSON string in DB, but Map to string-only Key-Values for FCM `data`.
- **Handle Tokens**: Check for `fcmToken` existence before sending. Fail gracefully if missing.
- **Serialize Dates**: Convert Dates to ISO strings before sending to FCM.

## Anti-Patterns

- **No Generic Types**: Avoid `type: string`. Always use the Enum.
- **No Blocking FCM**: Never `await` FCM without a `try/catch`. It shouldn't crash the request.
- **No Complex Data in Push**: Keep FCM `data` payload flat and minimal (IDs only). Fetch details on open.

## Reference & Examples

- **Service Pattern (Dual-Write)**: [references/service.md](references/service.md)
- **Type Definitions**: [references/types.md](references/types.md)
