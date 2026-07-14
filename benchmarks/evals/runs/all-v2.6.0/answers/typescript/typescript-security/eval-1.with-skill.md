Validate the request at the Express boundary with a Zod schema and return structured errors before using the data:

```ts
import { z } from "zod";
import type { RequestHandler } from "express";

const registrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(128),
});

type RegistrationInput = z.infer<typeof registrationSchema>;

export const register: RequestHandler = async (req, res, next) => {
  const result = registrationSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: "invalid_request",
      details: result.error.flatten().fieldErrors,
    });
    return;
  }

  const input: RegistrationInput = result.data;
  try {
    // Hash with Argon2id before persistence; never store input.password.
    await createUser({
      email: input.email,
      passwordHash: await argon2.hash(input.password, {
        type: argon2.argon2id,
      }),
    });
    res.status(201).json({ ok: true });
  } catch (error: unknown) {
    next(error);
  }
};
```

Keep the schema at the untrusted boundary, avoid trusting TypeScript casts, and ensure the endpoint has appropriate rate limiting and generic duplicate-account errors.
