Handle notification opens in every lifecycle: onNotificationOpenedApp for a background app, getInitialNotification for a quit launch, and onMessage for foreground behavior. Extract only a validated route and parameter from the payload, wait until NavigationContainer is ready, then navigate through the typed linking or navigation API.

Do not trust arbitrary payload data or pass sensitive tokens in a notification deep link. Route unknown or invalid targets to a safe screen and test cold start, warm start, and foreground cases.



