Controllers should handle transport concerns: route and parameter binding, authorization decorators/guards, DTO validation, and translating the request to an application call. Business rules belong in injectable services or use-case classes, where they can be reused from jobs, events, and other transports and tested without HTTP objects.

```ts
@Controller('orders')
export class OrdersController {
  constructor(private readonly createOrder: CreateOrderUseCase) {}

  @Post()
  create(@Req() req: Request, @Body() dto: CreateOrderDto) {
    return this.createOrder.execute(req.user.id, dto);
  }
}
```

The service should enforce invariants and coordinate repositories or external ports. Avoid putting substantial queries, branching rules, or transaction handling directly in controller methods.

