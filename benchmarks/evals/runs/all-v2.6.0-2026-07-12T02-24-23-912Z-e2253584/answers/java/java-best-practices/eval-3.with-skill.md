Prefer composition, not inheritance.

Adding SMS by extending `EmailNotification` couples two different delivery channels into an `is-a` relationship that usually is not true. SMS is not a kind of email notification; they are both notification strategies.

A better Java design is:

- define a small interface like `NotificationSender`
- implement `EmailNotificationSender` and `SmsNotificationSender`
- inject the sender where it is used

That keeps responsibilities focused, makes testing easier, and avoids a fragile class hierarchy.

Example:

```java
public interface NotificationSender {
    void send(String recipient, String message);
}

public final class EmailNotificationSender implements NotificationSender {
    @Override
    public void send(String recipient, String message) {
        // send email
    }
}

public final class SmsNotificationSender implements NotificationSender {
    @Override
    public void send(String recipient, String message) {
        // send sms
    }
}

public final class NotificationService {
    private final NotificationSender sender;

    public NotificationService(NotificationSender sender) {
        this.sender = java.util.Objects.requireNonNull(sender);
    }

    public void notify(String recipient, String message) {
        sender.send(recipient, message);
    }
}
```

If you need to support multiple channels at once, you can also compose several senders in one service instead of growing an inheritance tree.

