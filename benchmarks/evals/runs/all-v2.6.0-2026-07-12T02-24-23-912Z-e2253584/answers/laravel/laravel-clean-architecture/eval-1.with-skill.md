Use domain-oriented folders and keep framework persistence behind explicit boundaries. For an Order feature, create `app/Domains/Order/{Actions,DTOs,Contracts}/`, keep the Eloquent model in `app/Models/`, and use this flow:

`Controller → Action → Repository interface → Eloquent implementation`.

Define a typed `readonly` DTO for input, an `OrderRepository` contract, and an `EloquentOrderRepository`. Bind the contract to the implementation in `AppServiceProvider`, then inject the contract into a single-responsibility Action. The controller should pass the DTO and contain no Eloquent query. Verify the binding with `php artisan tinker` by resolving the interface. Group by business domain rather than by technical type, and avoid God Services or raw arrays crossing layer boundaries.

