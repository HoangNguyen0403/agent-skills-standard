Import `TypeOrmModule.forFeature([User])` in the feature module, then inject the repository using the entity token:

```ts
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
})
export class UsersModule {}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}
}
```

Register the database connection with `TypeOrmModule.forRoot` or `forRootAsync` in the root module. If using multiple connections, pass the connection name to both `forFeature` and `@InjectRepository`. Keep repository access in the feature/persistence layer, and export a service or repository abstraction instead of exposing database details unnecessarily.

