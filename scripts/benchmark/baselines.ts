import { CHARS_PER_TOKEN } from './constants';

export const BASELINE_EXAMPLES = {
  /**
   * LIGHT baseline (~1,500 tokens): A typical inline system prompt a developer
   * writes when they haven't structured their domain knowledge into a skill.
   */
  light: {
    label: 'Reference Technical Prompt — Light (e.g., NestJS)',
    description:
      'A compact inline system prompt used as a reference for token count calibration. Representative of focused developer instructions without a structured skill.',
    examplePrompt: `You are an expert NestJS developer. Follow these practices:
- Use dependency injection and providers correctly
- Apply proper error handling with exception filters
- Structure code with controllers, services, and modules
- Use DTOs with class-validator for input validation
- Apply guards for authentication and authorization
- Use interceptors for cross-cutting concerns like logging
- Follow SOLID principles and clean architecture
- Write unit and e2e tests with Jest
- Use environment configuration with @nestjs/config
- Apply TypeORM patterns for database access
- Use proper HTTP status codes in responses
- Document APIs with Swagger/OpenAPI annotations
Always answer in TypeScript. Prefer async/await over callbacks.
Keep code modular, testable, and maintainable.

Additional context for the developer:
In NestJS, a module is a class annotated with a @Module() decorator. The @Module() decorator provides metadata that Nest makes use of to organize the application structure. Each application has at least one module, a root module. The root module is the starting point Nest uses to build the application graph - the internal data structure Nest uses to resolve module and provider relationships and dependencies. While very small applications might theoretically have only the root module, this is not the typical case. We want to emphasize that modules are the effective way to organize your components. Thus, for most applications, the resulting architecture will employ multiple modules, each encapsulating a closely related set of capabilities.

Providers are a fundamental concept in Nest. Many of the basic Nest classes may be treated as a provider – services, repositories, factories, helpers, and so on. The main idea of a provider is that it can be injected as a dependency; this means objects can create various relationships with each other, and the function of "wiring up" instances of objects can be largely delegated to the Nest runtime system.

Controllers are responsible for handling incoming requests and returning responses to the client. A controller's purpose is to receive specific requests for the application. The routing mechanism controls which controller receives which requests. Frequently, each controller has more than one route, and different routes can perform different actions.

In order to create a basic controller, we use classes and decorators. Decorators associate classes with required metadata and enable Nest to create a routing map (tie requests to the corresponding controllers).

For input validation, we use the ValidationPipe. The ValidationPipe provides a convenient way of enforcing validation rules for all incoming client payloads, where the specific rules are declared with local annotations in each DTO (Data Transfer Object) being validated.

By following these patterns, we ensure the application remains scalable and maintainable.
`.repeat(2),
  },

  /**
   * HEAVY baseline (~3,000 tokens): A verbose, comprehensive inline prompt
   * a developer might write for a complex, multi-step task — includes patterns,
   * anti-patterns, and inline examples.
   */
  heavy: {
    label: 'Reference Technical Prompt — Heavy (e.g., NestJS Architecture)',
    description:
      'A comprehensive architect-level inline prompt used as a reference for complex tasks. Includes deep patterns and rules sent by developers when no skill is present.',
    examplePrompt:
      `You are a senior NestJS architect. For this task, follow all of these detailed rules:

ARCHITECTURE:
- Use a layered architecture: Controller → Service → Repository → Entity
- Modules must be feature-scoped; never use a single AppModule for everything
- Use forwardRef() sparingly — it signals circular dependencies, refactor instead
- All providers should be registered in module providers array, not globally unless truly shared
- Use CustomRepository pattern with @EntityRepository (TypeORM)

DEPENDENCY INJECTION:
- Never instantiate services with new keyword — always use DI
- Use @InjectRepository(Entity) for repository injection
- Scope providers appropriately: DEFAULT (singleton), REQUEST, or TRANSIENT
- Use factory providers for complex initialization logic

VALIDATION AND SERIALIZATION:
- Use class-validator decorators: @IsString(), @IsEmail(), @IsUUID(), @IsInt(), @Min(), @Max()
- Use class-transformer: @Expose(), @Exclude(), @Transform() for serialization
- Apply ValidationPipe globally with whitelist: true, forbidNonWhitelisted: true
- Transform payloads with transform: true to auto-cast types
- Create separate CreateDto, UpdateDto, ResponseDto for each resource

ERROR HANDLING:
- Create domain-specific exceptions: UserNotFoundException extends NotFoundException
- Use HttpExceptionFilter globally for consistent error responses
- Never expose internal error details in production (use NODE_ENV check)
- Log all 5xx errors with full stack traces
- Return 404 for missing resources, 400 for bad input, 401 for unauth, 403 for forbidden

SECURITY:
- Use JwtAuthGuard globally; allow public routes with @Public() decorator
- Apply RolesGuard after JwtAuthGuard in the guard chain
- Never store passwords in plain text — use bcrypt or argon2
- Apply Helmet middleware for security headers
- Rate limit authentication endpoints with @nestjs/throttler
- Validate all UUIDs with ParseUUIDPipe in controller params

DATABASE (TypeORM):
- Use migrations, never synchronize: true in production
- Apply optimistic locking with @VersionColumn() for concurrent updates
- Use transactions for multi-step write operations: queryRunner.startTransaction()
- Add database indexes on all foreign keys and frequently queried columns
- Apply soft deletes with @DeleteDateColumn() rather than hard deletes

TESTING:
- Mock all external dependencies in unit tests
- Use Test.createTestingModule() for module-level tests
- Test each service method independently: happy path, edge case, error path
- Use supertest for e2e controller tests
- Coverage threshold: 80% statements, 70% branches

ANTI-PATTERNS TO AVOID:
- No business logic in controllers — only HTTP-layer concerns
- No raw SQL in services — use repository methods or QueryBuilder
- No circular module imports — refactor to shared modules
- No console.log — use NestJS Logger: private readonly logger = new Logger(ServiceName.name)
- No any type — use strict TypeScript types everywhere

COMPREHENSIVE NESTJS REFERENCE:
Nest (NestJS) is a framework for building efficient, scalable Node.js server-side applications. It uses progressive JavaScript, is built with and fully supports TypeScript (yet still enables developers to code in pure JavaScript) and combines elements of OOP (Object Oriented Programming), FP (Functional Programming), and FRP (Functional Reactive Programming).
Under the hood, Nest makes use of robust HTTP Server frameworks like Express (the default) and optionally can be configured to use Fastify as well!
Nest provides a level of abstraction above these common Node.js frameworks (Express/Fastify), but also exposes their APIs directly to the developer. This gives developers the freedom to use the myriad of third-party modules which are available for the underlying platform.

The core modules of Nest are @nestjs/common, @nestjs/core, and @nestjs/microservices. They provide all the essential decorators and features to build a web application.
The module system is inspired by Angular and focuses on encapsulation. Modules can export providers to make them available in other modules.
Dependency Injection is the core of the framework. You can inject providers into constructors of other classes.
Middleware functions are called before the route handler. Middleware functions have access to the request and response objects, and the next() middleware function in the application’s request-response cycle.
Interceptors have a set of useful capabilities which are inspired by the Aspect-Oriented Programming (AOP) technique. They can bind extra logic before or after method execution, transform the result returned from a function, transform the exception thrown from a function, extend the basic function behavior, or completely override a function depending on specific conditions (e.g., for caching purposes).

Now implement the feature described below, following ALL rules above.
`.repeat(3),
  },
} as const;

// Measure baseline tokens from the actual example prompts
export const BASELINE_LIGHT = Math.ceil(
  BASELINE_EXAMPLES.light.examplePrompt.length / CHARS_PER_TOKEN,
);
export const BASELINE_HEAVY = Math.ceil(
  BASELINE_EXAMPLES.heavy.examplePrompt.length / CHARS_PER_TOKEN,
);
