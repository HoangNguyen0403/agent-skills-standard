# nestjs-architecture Implementation Examples

## Inline Examples

```typescript
// users.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([User]), ConfigModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // expose to other modules
})
export class UsersModule {}
```
