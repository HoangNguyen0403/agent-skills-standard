# nestjs-notification Implementation Examples

## Inline Examples

```typescript
// notification.service.ts
async send(userId: string, type: NotificationType, metadata: Record<string, string>) {
  const notification = await this.repo.save({ userId, type, metadata: JSON.stringify(metadata) });
  const user = await this.usersService.findOne(userId);
  if (user.fcmToken) {
    try {
      await this.fcm.send({ token: user.fcmToken, data: { type, ...metadata } });
    } catch (err) {
      this.logger.warn(`FCM failed for user ${userId}`, err);
    }
  }
  return notification;
}
```

```text
src/modules/notification/
├── notification.service.ts   # Logic: DB Save + FCM Send
├── entities/
│   └── notification.entity.ts # DB Schema + NotificationType Enum
└── types/
    └── notification.types.ts  # Interfaces for Payloads/Metadata
```
