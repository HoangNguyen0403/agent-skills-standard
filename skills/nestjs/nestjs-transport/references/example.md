# References

Move large code blocks here.

## Inline Examples

```typescript
// main.ts — gRPC microservice bootstrap
const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
  transport: Transport.GRPC,
  options: {
    package: 'users',
    protoPath: join(__dirname, '../libs/contracts/users.proto'),
    url: '0.0.0.0:5001',
  },
});
await app.listen();
```

```typescript
// main.ts — RabbitMQ microservice bootstrap
const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
  transport: Transport.RMQ,
  options: {
    urls: [process.env.RABBITMQ_URL],
    queue: 'orders_queue',
    queueOptions: { durable: true },
  },
});
```

```typescript
@Catch()
export class RpcExceptionFilter implements RpcExceptionFilter<RpcException> {
  catch(exception: RpcException, host: ArgumentsHost): Observable<any> {
    return throwError(() => exception.getError());
  }
}
```
