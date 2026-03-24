# References

Move large code blocks here.

## Inline Examples

```typescript
// events.controller.ts
@Controller('events')
export class EventsController {
  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return interval(1000).pipe(map((num) => ({ data: { count: num } }) as MessageEvent));
  }
}
```

```typescript
// chat.gateway.ts
@WebSocketGateway({ cors: { origin: 'https://app.example.com' } })
export class ChatGateway implements OnGatewayConnection {
  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;
    try {
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
    } catch {
      client.disconnect(true); // reject invalid tokens immediately
    }
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: { room: string; text: string }) {
    this.server.to(payload.room).emit('message', { userId: client.data.userId, text: payload.text });
  }
}
```
