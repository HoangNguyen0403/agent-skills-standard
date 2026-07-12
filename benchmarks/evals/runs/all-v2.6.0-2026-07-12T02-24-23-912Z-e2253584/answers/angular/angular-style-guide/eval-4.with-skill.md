No. Do not prefix Angular interfaces with `I`. Name interfaces as nouns, such as `User` or `Hero`, rather than `IUser` or `IHero`:

```ts
export interface User {
  id: string;
  displayName: string;
}
```

The noun already communicates that the type is a model or contract, and the `I` prefix adds no useful information. Use the appropriate suffix for classes that implement behavior, for example `UserService`, while keeping the data contract named `User`.

