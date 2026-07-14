Keep controllers thin: receive the request, authorize and validate it, call an application service or action, and translate the result into a response. Avoid putting domain rules, multi-step workflows, or persistence-heavy code in controller methods.

Typical structure:

```text
Http/Controllers/OrderController.php
Http/Requests/StoreOrderRequest.php
Http/Resources/OrderResource.php
Application/Orders/CreateOrder.php
Domain/Orders/...
```

Use invokable controllers for one use case or small resource controllers for conventional CRUD. Inject collaborators through the constructor or method signature, return resources/redirects explicitly, and keep authorization close to the request/policy boundary. Test the controller through feature tests and test complex domain behavior separately.

