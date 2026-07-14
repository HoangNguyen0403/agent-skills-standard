Use `class-validator` decorators on the nested DTO and `@Type(() => ChildDto)` from `class-transformer` so the plain object becomes a class instance. Enable transformation and nested validation globally:

```ts
export class AddressDto {
  @IsString()
  street!: string;
}

export class CreateUserDto {
  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;
}
```

```ts
app.useGlobalPipes(new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
}));
```

For arrays, use `@IsArray()` and `@ValidateNested({ each: true })` with `@Type(() => ChildDto)`. Add `@IsOptional()` where appropriate and avoid validating persistence entities directly; DTOs should define the request contract. Test both invalid nested values and unknown properties.

