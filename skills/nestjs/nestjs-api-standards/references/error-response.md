# ApiErrorResponse Class

Standard error response DTO. Apply globally via `@ApiBadRequestResponse({ type: ApiErrorResponse })`.

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
