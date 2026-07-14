TypeScript annotations do not validate an HTTP body at runtime. Parse the body with a runtime schema before using it, and reject invalid input with a 400 response:

```ts
import express from "express";
import { z } from "zod";

const registrationSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(12).max(128),
  displayName: z.string().trim().min(1).max(100),
}).strict();

const app = express();
app.use(express.json({ limit: "32kb" }));

app.post("/register", async (req, res, next) => {
  const parsed = registrationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid registration data" });
    return;
  }

  try {
    const { email, password, displayName } = parsed.data;
    // Hash password with a password-hashing algorithm such as Argon2id.
    // Persist only the hash, and enforce uniqueness for the normalized email.
    await registerUser({ email, password, displayName });
    res.status(201).send();
  } catch (error) {
    next(error);
  }
});
```

Avoid returning schema details that disclose sensitive information, and add rate limiting, duplicate-account handling, and a centralized error handler. Validate any fields that are later used in SQL, URLs, or commands at their respective boundaries as well.
