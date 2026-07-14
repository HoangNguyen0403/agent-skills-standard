# Repeated server reads

Do not assume five Server Components necessarily produce five database calls, but make the deduplication boundary explicit. Wrap the shared server read with React `cache()` so repeated calls with the same arguments are deduplicated within one render pass:

```ts
import { cache } from 'react'

export const getUser = cache(async (id: string) => db.user.findUnique({ where: { id } }))
```

Use the Data Cache only when the data may be shared and cached safely; keep personalized data private or uncached. Measure the actual query count in development and production-like conditions.

