Generate an event and listener, then dispatch the event from the application boundary:

```bash
php artisan make:event OrderPlaced
php artisan make:listener SendConfirmation --event=OrderPlaced
```

Keep the event as the communication fact and the listener as the reaction. Add `ShouldQueue` to `SendConfirmation` when sending the confirmation is asynchronous, and dispatch with `Event::dispatch(new OrderPlaced($order))`. Pass stable identifiers or deliberately serialized data rather than large mutable model graphs. Keep listener chains shallow and configure retries/failed-job handling so an external email failure is observable instead of silently lost.

