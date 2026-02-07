# Notification Type Standards

## 1. Business Logic Types

Define granular types in the Entity or a shared Enum. Use SCREAMING_SNAKE_CASE.

```typescript
// src/modules/notification/entities/notification.entity.ts or shared/enums/
export enum NotificationType {
  // Group by Feature
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED',

  VACCINE_UPCOMING = 'VACCINE_UPCOMING',
  VACCINE_MISSED = 'VACCINE_MISSED', // Granularity helps frontend icons/colors

  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
}
```

## 2. Job Payload Types

Define interfaces for the data passed to background workers.

```typescript
// src/modules/notification/types/notification.types.ts

// Base payload for all notification jobs
export interface BaseNotificationJob {
  userId: string;
  type: NotificationType;
}

// Specific payloads extend the base
export interface AppointmentReminderJob extends BaseNotificationJob {
  type: NotificationType.APPOINTMENT_REMINDER;
  payload: {
    appointmentId: string;
    time: Date;
    doctorName: string;
  };
}

export type NotificationJob = AppointmentReminderJob | VaccineJob;
```

## 3. Metadata Strategy

For flexible metadata columns (JSON), define TypeScript interfaces to enforce structure at the application level.

```typescript
export interface AppointmentMetadata {
  appointmentId: string;
  childId: string;
  location?: string;
}

// Usage in Service
await service.send(..., { appointmentId: '123' } as AppointmentMetadata);
```
