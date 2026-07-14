Assumption: you need database-driven roles and permissions for a standard Laravel application. Use `spatie/laravel-permission`.

```bash
composer require spatie/laravel-permission

php artisan vendor:publish \
  --provider="Spatie\Permission\PermissionServiceProvider"

php artisan migrate
```

Add the trait to `app/Models/User.php`:

```php
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasRoles;
}
```

Create roles and permissions:

```bash
php artisan make:seeder RolePermissionSeeder
```

```php
use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

public function run(): void
{
    Permission::create(['name' => 'manage users']);
    Permission::create(['name' => 'view reports']);

    $admin = Role::create(['name' => 'admin']);
    $manager = Role::create(['name' => 'manager']);

    $admin->givePermissionTo(['manage users', 'view reports']);
    $manager->givePermissionTo('view reports');

    User::where('email', 'admin@example.com')
        ->first()
        ?->assignRole('admin');
}
```

Run the seeder:

```bash
php artisan db:seed --class=RolePermissionSeeder
```

In Laravel 11/12, register middleware aliases in `bootstrap/app.php`:

```php
use Illuminate\Foundation\Configuration\Middleware;

->withMiddleware(function (Middleware $middleware): void {
    $middleware->alias([
        'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
        'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
    ]);
})
```

Protect routes:

```php
Route::middleware(['auth', 'role:admin'])->group(function () {
    Route::get('/admin', AdminController::class);
});

Route::get('/reports', ReportController::class)
    ->middleware(['auth', 'permission:view reports']);
```

Assign or revoke roles in application code:

```php
$user->assignRole('manager');
$user->removeRole('manager');
$user->syncRoles(['manager']);
```

Check authorization:

```php
if ($user->hasRole('admin')) {
    // ...
}

if ($user->can('manage users')) {
    // ...
}
```

In Blade:

```blade
@role('admin')
    <a href="/admin">Admin panel</a>
@endrole

@can('manage users')
    <button>Manage users</button>
@endcan
```

For simple, code-defined authorization, Laravel’s native `Gate` and `Policy` APIs are sufficient; use Spatie when roles and permissions must be managed from the database.
