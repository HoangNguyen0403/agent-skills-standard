Use a custom parameter decorator that reads the authenticated user from the request and gives it an explicit type. Define the request user shape centrally:

```ts
export interface AuthenticatedUser { id: string; email: string; roles: string[] }

export const CurrentUser = createParamDecorator(
  (field: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user;
    return field ? user?.[field] : user;
  },
) as ParameterDecorator;
```

In practice, use overloads or a typed factory so `@CurrentUser()` is inferred as `AuthenticatedUser` and `@CurrentUser('id')` as `string`; do not use `any` to hide the distinction. The guard/Passport strategy must populate `request.user` before the decorator runs. If the app also serves GraphQL or WebSockets, branch on the execution context or create transport-specific decorators rather than assuming HTTP.

