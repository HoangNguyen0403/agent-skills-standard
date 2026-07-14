Use a string enum or a literal union as the canonical notification type, and use it consistently in DTOs, domain code, persistence, and provider mapping:

```ts
export enum NotificationType {
  COMMENT = 'comment',
  MENTION = 'mention',
  WEEKLY_DIGEST = 'weekly_digest',
}

export class CreateNotificationDto {
  @IsEnum(NotificationType)
  type!: NotificationType;
}
```

Persist the stable wire value, not a localized display label. Map each type to a typed payload/template so required fields are checked at compile time, and version the contract if clients depend on it. Validate untrusted input at the boundary, avoid accepting arbitrary provider fields, and keep presentation/localization separate from the domain type.

