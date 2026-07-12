Choose based on communication direction and scaling needs:

- WebSockets are bidirectional and fit chat, collaboration, games, and frequent client-to-server events. They need handshake authentication and a Redis adapter when Socket.IO is spread across pods.
- SSE is unidirectional server-to-client streaming and fits notifications, live feeds, tickers, and CI logs. It uses normal HTTP and is simpler to secure; use HTTP/2 at scale to avoid HTTP/1.1 browser connection limits.

In NestJS, use `@WebSocketGateway()` for WebSockets and an `@Sse()` controller returning `Observable<MessageEvent>` for SSE. Keep the gateway/controller thin and delegate domain work to services.

