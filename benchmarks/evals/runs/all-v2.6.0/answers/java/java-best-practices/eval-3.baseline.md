No—adding SMS support by extending `EmailNotification` is usually the wrong abstraction.

`EmailNotification` represents one delivery mechanism, while SMS is a different one. If SMS inherits from Email, you create an “is-a” relationship that doesn’t really exist, and the class will likely inherit fields or behavior that do not make sense for SMS.

A better approach is to extract a shared abstraction, for example:

- `Notification` interface with a method like `send(Message message)`
- `EmailNotification` implementation
- `SmsNotification` implementation

If they share common logic, put that in a separate helper or abstract base class focused on truly common behavior, such as formatting, logging, or retry handling.

This keeps the design easier to extend later if you add push notifications, Slack, or other channels.

