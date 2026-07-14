# Deep links from push notifications

Put a validated, non-sensitive navigation intent in the notification’s data payload, for example `{type: 'order', orderId: '123'}`, rather than an auth token or arbitrary URL. Use the messaging library’s handlers for foreground notifications and notification-open events, including the initial notification when the app launches from a terminated state.

Normalize all sources into one pending-intent handler. Wait until navigation and authentication/bootstrap state are ready, then validate the payload, check authorization, fetch the target, and navigate. If sign-in is required, preserve the safe ID/type in memory or a controlled store and resume after sign-in. Clear the intent after handling so a rerender or duplicate event does not navigate twice. Render a not-found/error state when the target is gone.

Test foreground, background, terminated, duplicate taps, malformed data, missing entities, expired sessions, and offline behavior on both platforms. Avoid logging full payloads and never place secrets in notification data.

