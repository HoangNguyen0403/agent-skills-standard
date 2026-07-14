Implement RBAC with metadata plus a guard. Define a typed roles decorator, bind the guard globally, and use `Reflector.getAllAndOverride` so method metadata overrides class metadata.

```ts
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

canActivate(context: ExecutionContext) {
  const required = this.reflector.getAllAndOverride<Role[]>('roles', [
    context.getHandler(), context.getClass(),
  ]);
  if (!required?.length) return true;
  const user = context.switchToHttp().getRequest<RequestWithUser>().user;
  return required.some((role) => user.roles.includes(role));
}
```

Pair it with a global authentication guard and deny by default; use `@Public()` only for explicitly open routes. Authorization must still enforce resource/tenant ownership, not only global roles.

