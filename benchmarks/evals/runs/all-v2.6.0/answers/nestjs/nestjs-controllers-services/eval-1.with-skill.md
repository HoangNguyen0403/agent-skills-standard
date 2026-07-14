Create a parameter decorator that types the request once instead of exposing `@Request() req` throughout controllers.

```ts
export interface RequestWithUser extends Request {
  user: User;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User =>
    ctx.switchToHttp().getRequest<RequestWithUser>().user,
);
```

Use it as `create(@CurrentUser() user: User)`. The authentication guard remains responsible for populating `request.user`; the decorator should only retrieve it. Keep controllers thin and put user-related business rules in a service.

