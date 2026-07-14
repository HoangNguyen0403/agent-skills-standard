Install `@nestjs/passport`, `passport-jwt`, and `@nestjs/jwt`. Create a JWT strategy that extracts a bearer token, verifies its signature and claims, and returns a minimal user identity. Register a guard using that strategy and apply it to protected routes or globally with public-route metadata.

```ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow('JWT_SECRET'),
      issuer: config.getOrThrow('JWT_ISSUER'),
      audience: config.getOrThrow('JWT_AUDIENCE'),
    });
  }
  validate(payload: JwtPayload) { return { id: payload.sub, roles: payload.roles }; }
}
```

Sign tokens with a strong secret/asymmetric key, short expiry, explicit issuer/audience, and key rotation. Never put sensitive data in payloads, validate claims and token revocation/session policy, protect secrets, and authorize resources after authentication.

