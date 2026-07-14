Decorate nested object or array properties with both `@ValidateNested()` and `@Type(() => NestedDto)`, then enable transformation and validation at the application boundary.

```ts
export class AddressDto {
  @IsString()
  street!: string;
}

export class CreateUserDto {
  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;

  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses!: AddressDto[];
}

app.useGlobalPipes(new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
}));
```

Without `@Type`, `class-transformer` cannot instantiate the nested DTO reliably, so its validators may not run. Keep nested DTOs separate from ORM entities and map validated input before persistence.

