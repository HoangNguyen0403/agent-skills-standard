Register the entity with the feature module and inject its repository through Nest's DI container:

```ts
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [UsersService],
})
export class UsersModule {}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}
}
```

The root database module should use `TypeOrmModule.forRootAsync` and `ConfigService`; `synchronize` must be `false` in production. Keep repository access in a service/adapter, use projections and pagination for reads, and do not instantiate repositories or services manually.

