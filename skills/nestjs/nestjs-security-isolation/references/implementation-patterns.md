# Data Isolation Implementation Patterns

## Nested Controller Pattern

All child-specific resources must be nested under the child ID to ensure explicit context.

```typescript
@Controller('children/:childId/my-feature')
export class MyFeatureController {
  @Get()
  async findAll(
    @Param('childId') childId: string,
    @CurrentUserDecorator() user: User,
  ) {
    return this.service.findAllForChild(childId, user);
  }
}
```

## Entity Documentation Standard

Entities with RLS enabled must use the `@Security` tag to warn future developers.

```typescript
/**
 * @Entity domain_table
 * @Security PostgreSQL Row Level Security (RLS) enabled.
 * Access restricted based on child ownership and family membership.
 * See SECURITY.md for details.
 */
@Entity('domain_table')
export class DomainEntity { ... }
```

## Centralized Access Validation

Always delegate access checks to `ChildrenService`.

```typescript
async myServiceMethod(childId: string, user: CurrentUser) {
    await this.childrenService.validateChildAccess(childId, user.id);
    // ... proceed with logic
}
```
