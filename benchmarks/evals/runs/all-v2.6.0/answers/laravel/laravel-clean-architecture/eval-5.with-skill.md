Apply clean architecture as a small, explicit flow rather than mirroring every framework folder. Put domain use cases in `app/Domains/<Domain>/Actions`, typed immutable data in `DTOs`, and persistence abstractions in `Contracts`. Keep Eloquent implementations at the outer adapter boundary and bind them in `AppServiceProvider`.

The request layer validates input, constructs a DTO, and calls one Action. The Action depends on interfaces and contains the use-case rule. The repository adapter translates the interface to Eloquent. Keep models in `app/Models/` and keep controllers free of queries. Verify container bindings with `php artisan tinker`, then test the Action with a repository double and the controller at the HTTP boundary.

