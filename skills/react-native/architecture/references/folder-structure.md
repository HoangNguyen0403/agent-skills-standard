# React Native Architecture Reference

Complete folder structure examples and advanced patterns.

## Full Project Structure (Feature-First)

```text
my-app/
├── src/
│   ├── features/           # Feature modules
│   │   ├── auth/
│   │   │   ├── screens/
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   └── SignupScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── AuthForm.tsx
│   │   │   │   └── SocialButtons.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts
│   │   │   └── services/
│   │   │       └── authService.ts
│   │   │
│   │   ├── home/
│   │   │   ├── screens/
│   │   │   │   └── HomeScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── FeedList.tsx
│   │   │   │   └── PostCard.tsx
│   │   │   └── hooks/
│   │   │       └── useFeed.ts
│   │   │
│   │   └── profile/
│   │       ├── screens/
│   │       │   ├── ProfileScreen.tsx
│   │       │   └── EditProfileScreen.tsx
│   │       └── components/
│   │           └── ProfileHeader.tsx
│   │
│   ├── components/         # Shared components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── LoadingSpinner.tsx
│   │
│   ├── navigation/         # Navigation setup
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── MainNavigator.tsx
│   │
│   ├── services/           # Shared services
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   └── endpoints.ts
│   │   └── storage/
│   │       └── secureStorage.ts
│   │
│   ├── hooks/              # Shared hooks
│   │   ├── useKeyboard.ts
│   │   └── useAppState.ts
│   │
│   ├── utils/              # Utilities
│   │   ├── validators.ts
│   │   ├── formatters.ts
│   │   └── constants.ts
│   │
│   ├── theme/              # Design system
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   └── spacing.ts
│   │
│   └── types/              # TypeScript types
│       ├── models.ts
│       └── api.ts
│
├── app.json                # Expo config (or index.js for RN CLI)
├── tsconfig.json           # TypeScript config
└── package.json
```

## TypeScript Path Mapping

Configure `tsconfig.json` for absolute imports:

```json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/components/*": ["components/*"],
      "@/features/*": ["features/*"],
      "@/services/*": ["services/*"],
      "@/hooks/*": ["hooks/*"],
      "@/utils/*": ["utils/*"],
      "@/theme/*": ["theme/*"],
      "@/types/*": ["types/*"],
      "@/navigation/*": ["navigation/*"]
    }
  }
}
```

**Usage**:

```tsx
// Instead of: import Button from '../../../components/Button';
import Button from '@/components/Button';
import { useAuth } from '@/features/auth/hooks/useAuth';
```

## Service Layer Pattern

### API Client Setup

```tsx
// src/services/api/client.ts
import axios from 'axios';
import { getToken } from '@/services/storage/secureStorage';

const apiClient = axios.create({
  baseURL: process.env.API_BASE_URL,
  timeout: 10000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

### Feature-Specific Service

```tsx
// src/features/auth/services/authService.ts
import apiClient from '@/services/api/client';
import { LoginCredentials, User } from '@/types/models';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<User> => {
    const { data } = await apiClient.post('/auth/login', credentials);
    return data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },
};
```

## Separation of Concerns Example

**Bad** ❌ - Logic in Screen:

```tsx
function HomeScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://api.example.com/posts')
      .then(r => r.json())
      .then(data => {
        setPosts(data);
        setLoading(false);
      });
  }, []);

  return <FlatList data={posts} ... />;
}
```

**Good** ✅ - Extract to Hook + Service:

```tsx
// hooks/usePosts.ts
function usePosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    postService.fetchPosts().then((data) => {
      setPosts(data);
      setLoading(false);
    });
  }, []);

  return { posts, loading };
}

// screens/HomeScreen.tsx
function HomeScreen() {
  const { posts, loading } = usePosts();
  return <PostList posts={posts} loading={loading} />;
}
```
