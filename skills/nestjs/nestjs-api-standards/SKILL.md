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

- **Standard Error Object**:

  ```typescript
  export class ApiErrorResponse {
    @ApiProperty()
    statusCode: number;

    @ApiProperty()
    message: string;

    @ApiProperty()
    error: string;

    @ApiProperty()
    timestamp: string;

    @ApiProperty()
    path: string;
  }
  ```

- **Docs**: Apply `@ApiBadRequestResponse({ type: ApiErrorResponse })` globally or per controller.


## 🚫 Anti-Patterns

- Do NOT use standard patterns if specific project rules exist.
- Do NOT ignore error handling or edge cases.
