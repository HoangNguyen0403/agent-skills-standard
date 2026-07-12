Use a granular enum rather than `type: string`, so clients can choose stable icons, colors, routing, and behavior without guessing arbitrary values.

```ts
export enum NotificationType {
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
}

export class NotificationEntity {
  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;
}
```

Keep routing metadata as a typed domain object in application code, serialize it as JSON for database storage if needed, and map it to flat string-only FCM data. Version or carefully extend the enum because mobile clients may lag behind the server.

