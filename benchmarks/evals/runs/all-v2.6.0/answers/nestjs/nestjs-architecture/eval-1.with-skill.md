Organize the application by business capability. Each feature module should own its controllers, application services, and persistence adapters; keep cross-cutting configuration and database modules in a core area, and export only genuinely shared stateless helpers.

Keep controllers thin, put orchestration in services/use cases, and register dependencies once in the module graph. Use singleton providers by default; choose request scope only for measured request-local state such as tenant context or request caching. Validate DTOs at the edge, configure through `ConfigService`, and use `forwardRef()` only after refactoring contracts cannot remove a circular dependency.

```ts
@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity])],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
  exports: [OrdersService],
})
export class OrdersModule {}
```

Avoid mixed grab-bag modules, manual `new Service()` calls, raw entity responses, and unexplained request-scoped provider chains.

