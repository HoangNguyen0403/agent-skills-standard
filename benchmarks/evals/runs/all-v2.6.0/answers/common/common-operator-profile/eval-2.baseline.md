In NestJS, a Laravel service provider is usually represented by:

- `@Module()` — groups related services and dependencies
- `providers` — registers services in Nest’s dependency-injection container
- `exports` — makes services available to importing modules
- `onModuleInit()` or `OnApplicationBootstrap` — replaces boot-time setup
- `forRoot()` — replaces configurable service-provider registration

Assuming you want a reusable notifications service:

```ts
// notifications.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  send(userId: string, message: string): void {
    console.log(`Sending to ${userId}: ${message}`);
  }
}
```

```ts
// notifications.module.ts
import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Module({
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
```

Register it in the application module:

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
})
export class AppModule {}
```

Use it from another service:

```ts
import { Injectable } from '@nestjs/common';
import { NotificationsService } from './notifications/notifications.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly notifications: NotificationsService,
  ) {}

  createUser(userId: string): void {
    this.notifications.send(userId, 'Welcome!');
  }
}
```

The Laravel equivalent might look like:

```php
class NotificationServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(NotificationService::class);
    }

    public function boot(): void
    {
        // Startup configuration
    }
}
```

For a singleton, Nest providers are singleton-scoped by default, so no extra configuration is required.

For boot-time logic:

```ts
import {
  Injectable,
  Module,
  OnModuleInit,
} from '@nestjs/common';

@Injectable()
export class NotificationsService implements OnModuleInit {
  onModuleInit(): void {
    // Equivalent to provider boot/setup logic
  }

  send(userId: string, message: string): void {
    console.log(`Sending to ${userId}: ${message}`);
  }
}

@Module({
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
```

For configuration similar to a configurable Laravel provider, use a dynamic module:

```ts
import { DynamicModule, Module } from '@nestjs/common';

export const NOTIFICATIONS_OPTIONS = 'NOTIFICATIONS_OPTIONS';

@Module({})
export class NotificationsModule {
  static forRoot(options: {
    apiKey: string;
  }): DynamicModule {
    return {
      module: NotificationsModule,
      providers: [
        {
          provide: NOTIFICATIONS_OPTIONS,
          useValue: options,
        },
        NotificationsService,
      ],
      exports: [NotificationsService],
    };
  }
}
```

Then import it once:

```ts
@Module({
  imports: [
    NotificationsModule.forRoot({
      apiKey: process.env.NOTIFICATIONS_API_KEY!,
    }),
  ],
})
export class AppModule {}
```

The main pattern is: define the service with `@Injectable()`, register it in the module’s `providers`, and add it to `exports` when other modules need to inject it.
