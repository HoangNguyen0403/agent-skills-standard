# Notification Service Pattern (Dual-Write)

## 1. Service Implementation

Handle both persistent storage (In-App) and ephemeral delivery (Push) in one atomic flow.

```typescript
// src/modules/notification/notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as admin from 'firebase-admin';
import { Notification, NotificationType } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async send(
    userId: string,
    title: string,
    body: string,
    type: NotificationType,
    metadata?: Record<string, any>,
  ) {
    // 1. Persistent Storage (In-App Center)
    const notification = this.notificationRepo.create({
      user: { id: userId } as User,
      title,
      content: body,
      type,
      // Metadata allows frontend to route on click (e.g. { appointmentId: '...' })
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
    await this.notificationRepo.save(notification);

    // 2. Ephemeral Delivery (Push/FCM)
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['fcmToken'],
    });

    if (user?.fcmToken) {
      try {
        await admin.messaging().send({
          token: user.fcmToken,
          notification: { title, body },
          // FCM data must be strings
          data: this.serializeData({ type, ...metadata }),
        });
      } catch (error) {
        this.logger.error(`FCM failed for ${userId}`, error);
      }
    }
  }

  private serializeData(data: Record<string, any>): Record<string, string> {
    return Object.keys(data).reduce(
      (acc, key) => ({
        ...acc,
        [key]: String(data[key]),
      }),
      {},
    );
  }
}
```
