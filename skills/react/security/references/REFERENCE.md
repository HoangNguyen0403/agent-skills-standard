# React Security Reference

CSP configuration and advanced security patterns.

## References

- [**Content Security Policy**](csp.md) - CSP headers configuration.
- [**Auth Patterns**](auth-patterns.md) - Secure authentication flows.

## Content Security Policy

```jsx
// Next.js middleware or server config
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;

// Vite plugin for CSP
import { defineConfig } from 'vite';
import htmlPlugin from 'vite-plugin-html';

export default defineConfig({
  plugins: [
    htmlPlugin({
      inject: {
        data: {
          csp: cspHeader.replace(/\s+/g, ' ').trim(),
        },
      },
    }),
  ],
});
```

## OAuth2 / JWT Authentication Flow

```jsx
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Token is in httpOnly cookie, automatically sent
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const userData = await response.json();
    setUser(userData);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

## CSRF Protection

```jsx
// Get CSRF token from cookie or meta tag
function getCsrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.content;
}

// Include in requests
async function securePost(url, data) {
  const csrfToken = getCsrfToken();
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  return response;
}
```

## Rate Limiting on Client

```jsx
// Simple rate limiter for API calls
function createRateLimiter(maxCalls, timeWindow) {
  const calls = [];

  return function rateLimitedFetch(url, options) {
    const now = Date.now();
    
    // Remove old calls outside time window
    while (calls.length > 0 && calls[0] < now - timeWindow) {
      calls.shift();
    }

    if (calls.length >= maxCalls) {
      throw new Error('Rate limit exceeded');
    }

    calls.push(now);
    return fetch(url, options);
  };
}

// Usage: max 10 calls per 60 seconds
const rateLimitedFetch = createRateLimiter(10, 60000);
```
