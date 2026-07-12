Implement deep linking by registering a route parser for `ourapp://orders/:id`, handling the incoming URI from the push notification tap, extracting the `id`, and navigating straight to the order detail screen with that parameter. Also make sure cold-start and background-resume flows both pass the link through the same navigation entry point so `ourapp://orders/123` consistently opens Order 123.

