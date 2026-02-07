import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Standard interface for all API responses.
 */
export interface ResponseWrapper<T> {
  /** The HTTP status code of the response */
  statusCode: number;
  /** The payload of the response */
  data: T;
  /** Optional metadata about the response */
  meta?: Record<string, unknown>;
}

@Injectable()
/**
 * Global interceptor that wraps all successful responses in a standard `ResponseWrapper`.
 */
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ResponseWrapper<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseWrapper<T>> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response = context.switchToHttp().getResponse();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const statusCodeValue = response.statusCode;
    const statusCode =
      typeof statusCodeValue === 'number' ? statusCodeValue : 200;

    return next.handle().pipe(
      map((data: unknown) => {
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          !Array.isArray(data)
        ) {
          const typedData = data as Record<string, unknown>;
          return {
            statusCode,
            data: typedData['data'] as T,
            meta: typedData['meta'] as Record<string, unknown>,
          };
        }

        return {
          statusCode,
          data: data as T,
        };
      }),
    );
  }
}
