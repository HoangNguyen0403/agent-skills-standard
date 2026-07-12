Hide TypeORM behind a repository adapter so services depend on a domain-facing interface rather than `Repository<Entity>` or raw SQL. Inject the TypeORM repository into the adapter through the module graph:

```ts
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [UsersTypeOrmRepository, UsersService],
  exports: [UsersService],
})
export class UsersModule {}

@Injectable()
export class UsersTypeOrmRepository {
  constructor(@InjectRepository(UserEntity) private readonly repo: Repository<UserEntity>) {}
  findById(id: string) { return this.repo.findOne({ where: { id } }); }
}
```

Keep mapping and persistence logic in the adapter, map entities to DTOs at the boundary, and use pagination, indexes, and projections for list queries.

