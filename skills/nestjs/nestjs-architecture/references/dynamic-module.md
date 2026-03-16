# Dynamic Module Builder Reference

## Overview

The `ConfigurableModuleBuilder` drastically reduces the boilerplate required to create typed `forRoot` / `register` methods for dynamic modules.

## Implementation

```typescript
// 1. definition.ts
import { ConfigurableModuleBuilder } from '@nestjs/common';

export interface MyModuleOptions {
  apiKey: string;
  isGlobal?: boolean;
}

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<MyModuleOptions>()
    .setClassMethodName('forRoot') // or 'register'
    .setExtras(
      {
        isGlobal: true,
      },
      (definition, extras) => ({
        ...definition,
        global: extras.isGlobal,
      }),
    )
    .build();

// 2. my.module.ts
import { Module } from '@nestjs/common';
import { ConfigurableModuleClass } from './definition';
import { MyService } from './my.service';

@Module({
  providers: [MyService],
  exports: [MyService],
})
export class MyModule extends ConfigurableModuleClass {}

// 3. usage (AppModule)
@Module({
  imports: [
    MyModule.forRoot({
      apiKey: 'secret',
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```
