Assumption: Node.js + Express, bcrypt password hashes, and a server-side session store.

```ts
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";

const app = express();

app.use(express.json());
app.use(cors({
  origin: ["https://app.example.com"],
  credentials: true,
}));

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

app.post("/login", loginRateLimit, async (req, res) => {
  const { email, password } = req.body ?? {};

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.length > 320 ||
    password.length < 8 ||
    password.length > 128
  ) {
    return res.status(400).json({ error: "Invalid credentials" });
  }

  // Parameterized query; select only fields required for authentication.
  const user = await db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, email: true, passwordHash: true },
  });

  // Use a valid bcrypt hash here to reduce account-enumeration timing leaks.
  const hash = user?.passwordHash ?? process.env.DUMMY_BCRYPT_HASH!;
  const passwordMatches = await bcrypt.compare(password, hash);

  if (!user || !passwordMatches) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Opaque session token; store its hash server-side.
  const sessionToken = await sessionStore.create(user.id);

  res.cookie("session", sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000,
  });

  // DTO projection: never return the raw ORM entity or passwordHash.
  return res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
    },
  });
});
```

For authenticated resource endpoints, prevent IDOR/BOLA by filtering queries with both the requested ID and the authenticated user’s `owner_id`/`tenantId`. If JWTs are used instead of opaque sessions, require a short-lived token with `exp` and implement revocation on logout.
