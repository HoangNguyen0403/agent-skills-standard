# NestJS Controllers & Services — Reference Examples

## Custom Parameter Decorator

```typescript
// src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithUser } from 'src/common/interfaces/request.interface';
import { User } from 'src/user/entities/user.entity';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
```

## Controller with Typed Decorator

```typescript
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@CurrentUser() user: User): Promise<ProfileDto> {
    return this.profileService.findById(user.id);
  }
}
```

## Global Validation Pipe (main.ts)

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

## Route Param with Pipe

```typescript
@Get(':id')
findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserDto> {
  return this.usersService.findOneOrFail(id);
}
```

## Lifecycle Hooks

```typescript
@Injectable()
export class AppService implements OnModuleInit, OnApplicationShutdown {
  async onModuleInit() {
    await this.connectDatabase();
  }
  async onApplicationShutdown(signal?: string) {
    await this.disconnectDatabase();
  }
}
```
