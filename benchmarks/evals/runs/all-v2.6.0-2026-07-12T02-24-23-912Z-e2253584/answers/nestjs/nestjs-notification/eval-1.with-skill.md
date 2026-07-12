Implement notifications as a dual write: save the in-app notification first, then attempt FCM delivery without allowing an FCM outage to fail the request.

```ts
const notification = await this.repo.save({
  userId, type: NotificationType.APPOINTMENT_REMINDER, metadata: JSON.stringify({ appointmentId }),
});
if (user.fcmToken) {
  try {
    await this.fcm.send({ token: user.fcmToken, data: {
      notificationId: notification.id,
      type: notification.type,
      appointmentId: String(appointmentId),
    }});
  } catch (error) {
    this.logger.warn({ error, notificationId: notification.id }, 'FCM delivery failed');
  }
}
return notification;
```

Use an enum for notification types, keep FCM `data` flat and string-only, serialize dates as ISO strings, and consider an outbox/queue for reliable retry.

