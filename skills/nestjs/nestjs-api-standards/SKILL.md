---
name: nestjs-api-standards
description: "Response wrapping, pagination, and error standardization. Use when standardizing API response envelopes, pagination, or error formats in NestJS. (triggers: **/*.controller.ts, **/*.dto.ts, ApiResponse, Pagination, TransformInterceptor)"
---

# NestJS API Standards & Common Patterns

## **Priority: P1 (OPERATIONAL)**

Standardized API response patterns and common NestJS conventions.

## Generic Response Wrapper

- **Concept**: Standardize all successful API responses.
- **Implementation**: Use `TransformInterceptor` to wrap data in `{ statusCode, data, meta }`.

## Response Mapping (Critical)

- **[Rule] Zero-Entity Exposure**: Controllers MUST NOT return raw ORM entities. Every endpoint must map its result to a dedicated **Response DTO** (e.g., `plainToInstance(UserResponseDto, user)`) to prevent accidental exposure of internal fields or circular dependencies.

## Deep Validation (Critical)

- **[Rule] Nested Validation**: When a DTO property is an object or an array of objects, you MUST use `@ValidateNested()` along with `@Type(() => TargetDto)` from `class-transformer` to ensure deep validation.

## Pagination Standards (Pro)

- **DTOs**: Use strict `PageOptionsDto` (page/take/order) and `PageDto<T>` (data/meta).
- **Swagger Logic**: Generics require `ApiExtraModels` and schema path resolution.
- **Reference**: See [Pagination Wrapper Implementation](references/pagination-wrapper.md) for the complete `ApiPaginatedResponse` decorator code.

## Custom Error Response

- **Standard Error Object**: Define `ApiErrorResponse` with `statusCode`, `message`, `error`, `timestamp`, `path`. See [Error Response Class](references/error-response.md).
- **Docs**: Apply `@ApiBadRequestResponse({ type: ApiErrorResponse })` globally or per controller.

## Anti-Patterns

- **No raw entity returns**: Always map to a Response DTO; raw entities leak internal fields.
- **No unvalidated nested DTOs**: Use `@ValidateNested()` + `@Type()` for all nested object properties.
- **No generic 200 docs**: Apply `@ApiResponse({ status, type })` with exact types per endpoint.

## References

- [Pagination Wrapper](references/pagination-wrapper.md)
- [Error Response Class](references/error-response.md)
