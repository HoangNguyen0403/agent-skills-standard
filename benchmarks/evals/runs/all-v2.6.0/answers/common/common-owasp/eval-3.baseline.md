Assumption: Node.js/Express with `bcrypt`, and users store hashed passwords.

```js
import express from "express";
import bcrypt from "bcrypt";

const app = express();
app.use(express.json());

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await db.users.findOne({ email });

  // Use the same response for unknown users and wrong passwords.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  return res.status(200).json({
    user: { id: user.id, email: user.email },
  });
});
```
