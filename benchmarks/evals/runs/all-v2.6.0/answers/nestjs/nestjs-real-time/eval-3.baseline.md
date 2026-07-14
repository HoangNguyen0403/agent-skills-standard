Authenticate during the WebSocket handshake, before joining rooms or accepting application messages. The client can send a short-lived access token in a supported handshake/auth field or secure cookie; validate it with the same issuer/audience/signature rules as HTTP, then attach a minimal user identity to the socket.

```ts
handleConnection(socket: Socket) {
  const token = socket.handshake.auth?.token;
  const user = this.jwt.verify(token); // validate expiry, issuer, audience
  socket.data.user = { id: user.sub, roles: user.roles };
}
```

Reject/close unauthorized connections, authorize every sensitive event and room subscription, and do not trust client-supplied user IDs. Consider token expiry/revocation and re-authentication, rate limits, origin checks, payload validation, and avoiding tokens in URLs/logs. For Socket.IO use a gateway guard/middleware; for native WebSockets handle the handshake and message checks explicitly.

