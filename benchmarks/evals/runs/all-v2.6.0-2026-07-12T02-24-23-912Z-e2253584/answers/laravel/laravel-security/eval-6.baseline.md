Implement RBAC with a role/permission model and enforce it through policies or gates. A simple design has users related to roles, roles related to permissions, and a service such as `can()` that resolves effective permissions. For small systems, an enum role column plus policy checks may be enough; for many-to-many roles/permissions, use pivot tables and cache carefully.

Example policy boundary:

```php
public function delete(User $user, Invoice $invoice): bool
{
    return $user->hasPermission('invoices.delete')
        && $invoice->tenant_id === $user->tenant_id;
}
```

Check permissions server-side on every route/action, scope them by tenant where applicable, deny by default, and audit role changes. Do not trust role fields from requests or rely solely on hiding buttons.

