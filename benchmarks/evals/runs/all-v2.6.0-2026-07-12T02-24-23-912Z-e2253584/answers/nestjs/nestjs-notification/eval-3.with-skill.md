Keep the FCM payload small and flat. Put routing identifiers and a stable notification type in `data`; convert every value, including dates, to strings.

```ts
{
  token,
  notification: { title: 'Appointment reminder', body: 'Your appointment starts soon.' },
  data: {
    notificationId: String(id),
    type: NotificationType.APPOINTMENT_REMINDER,
    appointmentId: String(appointmentId),
    occurredAt: occurredAt.toISOString(),
  },
}
```

Do not embed a full domain object or sensitive data. The client should fetch current details after opening the notification. Persist the in-app record first, skip push when no token exists, and catch FCM failures so delivery does not block the business operation.

