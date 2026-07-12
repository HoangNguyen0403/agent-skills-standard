Keep the layers separate: services throw domain-specific errors, an interceptor translates persistence/transport errors to Nest HTTP exceptions, and one global filter formats the final response.

Use built-ins such as `NotFoundException`, `ForbiddenException`, and `BadRequestException` for HTTP-facing failures. Do not make services depend on `Request`/`Response` or throw transport-specific exceptions for ordinary domain rules. The final response should have one stable shape, for example `statusCode`, `message`, `error`, `timestamp`, and `path`; log 5xx errors at error level and client errors at warn level.

