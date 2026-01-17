---
name: React Security
description: Security best practices for React applications.
metadata:
  labels: [react, security, xss, sanitization]
  triggers:
    files: ['**/*.jsx', '**/*.tsx']
    keywords: [dangerouslySetInnerHTML, XSS, sanitize, secure, auth, token]
---

# React Security

## **Priority: P0 (CRITICAL)**

Security standards for React applications.

## Implementation Guidelines

- **XSS Prevention**:
  - React escapes content by default. Trust it.
  - Avoid `dangerouslySetInnerHTML`. If needed, use DOMPurify to sanitize.
  - Never interpolate user input into `<script>` tags or inline event handlers.
- **Authentication**:
  - Store tokens in httpOnly cookies (not localStorage)
  - Implement CSRF protection for cookies
  - Use secure session management
- **Authorization**: Check permissions on both client and server. Client checks are UX only.
- **Dependency Security**: Regularly audit with `npm audit`. Update dependencies.
- **Environment Variables**: Never expose secrets in client-side code. Use server-side only.
- **Input Validation**: Validate all user input. Don't trust client-side validation alone.
- **Content Security Policy**: Implement CSP headers to prevent XSS and injection attacks.

## Anti-Patterns

- **No Secrets in Client Code**: Don't expose API keys or secrets in React code.
- **No innerHTML**: Avoid setting HTML directly. Use React's JSX.
- **No eval()**: Never use eval() with user input.
- **No Client-Side Auth Only**: Always validate on server.

## Code

```jsx
import DOMPurify from 'dompurify';

// Safe rendering of user content
function UserComment({ comment }) {
  // React automatically escapes this - SAFE
  return <div>{comment.text}</div>;
}

// When you must render HTML (rare)
function RichContent({ htmlContent }) {
  const sanitized = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p'],
    ALLOWED_ATTR: ['href'],
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

// Secure authentication pattern
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function useRequireAuth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  return { user, loading };
}

// Protected route
function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useRequireAuth();

  if (loading) return <Loading />;
  if (!user) return null;

  // Client-side check for UX only
  if (requiredRole && user.role !== requiredRole) {
    return <Forbidden />;
  }

  return children;
}

// Input validation
import { z } from 'zod';

const UserSchema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
  url: z.string().url().optional(),
});

function UserForm() {
  const handleSubmit = async (data) => {
    try {
      // Validate input
      const validated = UserSchema.parse(data);
      
      // Send to server (which also validates)
      await api.createUser(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle validation errors
        console.error(error.errors);
      }
    }
  };

  return <form onSubmit={handleSubmit}>{/* Form fields */}</form>;
}

// Secure token handling (use httpOnly cookies)
// DON'T DO THIS:
// localStorage.setItem('token', token); // Vulnerable to XSS

// DO THIS INSTEAD:
// Set token in httpOnly cookie from server
// Server response:
// Set-Cookie: token=xxx; HttpOnly; Secure; SameSite=Strict
```

## Reference & Examples

For CSP configuration and advanced security patterns:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

component-patterns | state-management
