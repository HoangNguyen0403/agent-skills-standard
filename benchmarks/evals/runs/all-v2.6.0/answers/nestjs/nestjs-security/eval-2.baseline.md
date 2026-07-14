Represent roles as a stable enum/union and implement a metadata decorator plus guard:

```ts
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<Role[]>('roles', [
      ctx.getHandler(), ctx.getClass(),
    ]) ?? [];
    if (!required.length) return true;
    const user = ctx.switchToHttp().getRequest().user;
    return required.every(role => user?.roles?.includes(role));
  }
}
```

Run authentication before the RBAC guard, register guards in the intended order, and fail closed when user/roles are absent. Use permissions/policies for resource-level decisions that roles alone cannot express, validate role claims server-side, and do not trust client-supplied roles. Test missing, single, multiple, and unauthorized roles.

