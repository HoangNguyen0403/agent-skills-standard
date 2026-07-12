Authenticate during the WebSocket handshake, typically in `handleConnection()`, by extracting the token from the agreed handshake location and validating its signature and claims. Disconnect immediately when the token is missing or invalid; do not assume an HTTP guard protected the socket upgrade.

```ts
handleConnection(client: Socket) {
  try {
    const token = client.handshake.auth?.token;
    const user = this.jwt.verify<UserClaims>(token, { audience: 'api', issuer: 'auth' });
    client.data.user = user;
  } catch {
    client.disconnect(true);
  }
}
```

Apply authorization to room joins and message events, rate-limit expensive events, and keep business logic in a service rather than the gateway.

