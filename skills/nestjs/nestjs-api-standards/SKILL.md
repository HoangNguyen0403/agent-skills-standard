---
name: nestjs-api-standards
description: "Create standardized API response envelopes, paginated endpoints, and error interceptors in NestJS. Use when implementing response wrappers, pagination DTOs, or global error formats. (triggers: **/*.controller.ts, **/*.dto.ts, ApiResponse, Pagination, TransformInterceptor)"
---

# NestJS API Standards & Common Patterns

## **Priority: P1 (OPERATIONAL)**

Standardized API response patterns and common NestJS conventions.

## Workflow: Standardize an API Endpoint

1. **Create Response DTO** — Define a dedicated DTO for every endpoint return type.
2. **Map entity to DTO** — Use `plainToInstance(UserResponseDto, user)` in the service or controller.
3. **Apply TransformInterceptor** — Bind globally to wrap all responses in `{ statusCode, data, meta }`.
4. **Add nested validation** — Decorate nested DTO properties with `@ValidateNested()` + `@Type()`.
5. **Document with Swagger** — Apply `@ApiResponse({ status, type })` with exact types per endpoint.

## Response Wrapper Example

```typescript
// transform.interceptor.ts
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        statusCode: context.switchToHttp().getResponse().statusCode,
        data,
        meta: {},
      })),
    );
  }
}
```

## Entity-to-DTO Mapping Example

```typescript
// users.controller.ts
@Get(':id')
async findOne(@Param('id') id: string): Promise<UserResponseDto> {
  const user = await this.usersService.findOne(id);
  return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
}
```

## Deep Validation (Critical)

- **[Rule] Nested Validation**: When a DTO property is an object or array of objects, you MUST use `@ValidateNested()` along with `@Type(() => TargetDto)` from `class-transformer` to ensure deep validation.

## Pagination Standards

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
