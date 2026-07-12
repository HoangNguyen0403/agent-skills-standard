Define a repository interface at the application boundary and implement it with TypeORM in the infrastructure layer. For simple cases, Nest can inject the TypeORM repository directly:

```ts
@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}
}
```

For stronger isolation, define `UsersRepository` with methods such as `findById` and `save`, then provide a `TypeOrmUsersRepository` using `useClass` or `useFactory`. Register `TypeOrmModule.forFeature([User])` in the feature module. Return domain objects or DTOs rather than leaking entities, keep query/persistence details out of controllers, and test the service against the interface with a fake or mock plus integration tests for the TypeORM adapter.

