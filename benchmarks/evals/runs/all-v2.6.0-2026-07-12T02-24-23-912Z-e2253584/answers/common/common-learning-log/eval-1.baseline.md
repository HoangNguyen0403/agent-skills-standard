Learning-log entry:

- Mistake: Recommended localStorage for authentication tokens.
- Impact: Tokens in localStorage are exposed to JavaScript and can be stolen by an XSS vulnerability.
- Correction: Use Secure, HttpOnly, appropriately scoped cookies; configure SameSite and CSRF defenses for the application's request model.
- Prevention: Treat browser token storage as a security decision, load the applicable security guidance before recommending an approach, and explicitly review XSS and CSRF implications.
