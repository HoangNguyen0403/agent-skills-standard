# API Design Implementation Examples

## Documented Controller

```java
@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "User Management")
public class UserController {

    @Operation(summary = "Create User", description = "Registers a new user.")
    @ApiResponse(responseCode = "201", description = "User created")
    @ApiResponse(responseCode = "400", description = "Invalid input",
        content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @PostMapping
    public UserResponse create(@Valid @RequestBody UserRequest body) {
        return service.create(body);
    }
}
```

## Global Error Mapping

```java
@ControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(UserNotFoundException.class)
    ProblemDetail handleNotFound(UserNotFoundException e) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
        problem.setType(URI.create("https://api.example.com/errors/not-found"));
        return problem;
    }
}
```
