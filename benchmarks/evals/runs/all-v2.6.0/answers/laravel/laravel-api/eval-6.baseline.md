Use status codes that describe the result and let Laravel's response helpers set the body and headers:

```php
return response()->json($data, 200);                         // successful read/update
return response()->json($data, 201);                         // created
return response()->json(null, 204);                          // success with no body
return response()->json(['message' => 'Not found'], 404);
return response()->json(['message' => 'Unauthorized'], 401);
return response()->json(['message' => 'Forbidden'], 403);
return response()->json(['message' => 'Validation failed'], 422);
```

Use `201` with a `Location` header when useful, `409` for a state conflict, and `429` for throttling. Rely on Laravel's exception handling for consistent validation/authentication responses, and keep error JSON consistent through an API exception handler or response format. Do not return `200` for application errors.

