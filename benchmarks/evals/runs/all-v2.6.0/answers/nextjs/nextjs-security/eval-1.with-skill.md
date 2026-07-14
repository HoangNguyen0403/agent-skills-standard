Treat the action as an untrusted server entry point: authenticate, authorize ownership, validate the form input with Zod, and verify the request origin before deleting. Keep the action in an `actions.ts` server module, delegate the deletion to the DAL, and revalidate the exact post list/tag afterward. Never trust a hidden field or middleware alone for authorization.

