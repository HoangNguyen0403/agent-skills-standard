import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseWrapper<T> {
  statusCode: number;
  data: T;
  meta?: Record<string, unknown>;
}

@Injectable()
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
