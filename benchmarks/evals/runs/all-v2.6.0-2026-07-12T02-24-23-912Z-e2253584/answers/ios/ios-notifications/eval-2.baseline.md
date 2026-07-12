Common iOS notification anti-patterns to avoid:

- Requesting permission at launch without context. Ask at a moment of clear user value.
- Sending too many notifications. This drives opt-outs and notification fatigue.
- Using vague or misleading copy. Notification text should be clear, relevant, and trustworthy.
- Triggering notifications that are not time-sensitive. Don’t interrupt users unnecessarily.
- Duplicating in-app messages and push notifications for the same event.
- Failing to respect user preferences such as topic selection, quiet hours, or opt-out state.
- Deep-linking to the wrong screen or a broken destination after tap.
- Not handling authorization states properly, including denied, provisional, and not determined.
- Scheduling stale notifications and not canceling outdated ones.
- Putting sensitive or private information in notification content visible on the lock screen.
- Using notifications as marketing spam instead of genuine value or important updates.
- Ignoring badge count accuracy and leaving badges out of sync with actual unread state.
- Not testing foreground, background, terminated-app, and notification-action behaviors.
- Skipping actionable categories and custom actions when they would reduce friction for the user.
- Relying only on remote push when a local notification is more reliable for device-side reminders.

