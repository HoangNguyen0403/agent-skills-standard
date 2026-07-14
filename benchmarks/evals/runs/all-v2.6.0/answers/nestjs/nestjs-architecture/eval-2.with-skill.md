No. A controller should parse transport input, invoke an application service, and shape the HTTP response. Business rules and orchestration belong in services or use cases so they remain reusable and testable outside HTTP.

```ts
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: User) {
    return this.orders.create(dto, user.id);
  }
}
```

Keep providers singleton by default and map entities to response DTOs before returning them. Put validation in pipes and cross-cutting response/error mapping in interceptors and filters.

