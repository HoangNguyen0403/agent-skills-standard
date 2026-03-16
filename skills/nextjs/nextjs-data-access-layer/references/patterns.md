# Data Access Layer Patterns

## Pattern A: API Gateway / BFF (Recommended)

Use when Next.js is a generic frontend for a separate backend (NestJS/Go).

```typescript
import 'server-only';
import { cache } from 'react';
import { getToken } from '@/lib/auth';

const API_URL = process.env.API_GATEWAY_URL;

export const getProjectDetails = cache(async (id: string) => {
  // 1. Forward Auth Headers
  const token = await getToken();

  // 2. Upstream Fetch with Next.js Cache tags
  const res = await fetch(`${API_URL}/projects/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { tags: [`project-${id}`] },
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Upstream API Failed');
  }

  const data = await res.json();

  // 3. UI-Specific DTO Mapping
  return {
    title: data.attributes.title,
    isActive: data.status === 'published',
  };
});
```

## Pattern B: Direct Database

Use when Next.js owns the data (Fullstack).

```typescript
import 'server-only';
import { cache } from 'react';
import { verifySession } from '@/lib/auth';
import { db } from '@/lib/prisma';

export const getSafeUserProfile = cache(async (slug: string) => {
  const session = await verifySession();

  // Auth Co-location
  const canView = session.role === 'admin' || session.slug === slug;
  if (!canView) throw new Error('Unauthorized');

  const data = await db.user.findUnique({ where: { slug } });
  if (!data) return null;

  // DTO Transformation
  return {
    id: data.id,
    name: data.name,
    avatar: data.avatarUrl,
  };
});
```
