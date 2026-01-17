# AppRouter Configuration

Standard setup for `auto_route` to ensure code generation and type-safety.

## **Router File (`app_router.dart`)**

```dart
import 'package:auto_route/auto_route.dart';
import 'app_router.gr.dart'; // Inherited generated classes

@AutoRouterConfig(replaceInRouteName: 'Page|Screen,Route')
class AppRouter extends _$AppRouter {
  @override
  List<AutoRoute> get routes => [
    // 1. Initial Route
    AutoRoute(page: SplashRoute.page, initial: true),
    
    // 2. Protected Routes (with Guards)
    AutoRoute(
      page: DashboardRoute.page, 
      guards: [AuthGuard()],
    ),
    
    // 3. Nested Routes (Tabs)
    AutoRoute(
      page: HomeTabsRoute.page,
      children: [
        AutoRoute(page: PostsRoute.page),
        AutoRoute(page: SettingsRoute.page),
      ],
    ),
  ];
}
```

## **Dynamic Tab Initialization**

If you need to navigate to a tabbed route and set a specific initial tab based on logic:

```dart
context.navigateTo(
  OrdersTabRoute(
    children: params.tab == OrderTab.orders()
        ? [const ViewByOrdersPageRoute()]
        : [const ViewByItemsPageRoute()],
  ),
);
```

## **Typed Parameters**

When you define a Screen with a constructor, `auto_route` generates matching parameters:

```dart
@RoutePage()
class UserProfilePage extends StatelessWidget {
  final String userId;
  const UserProfilePage({required this.userId});
  
  // Navigation: context.pushRoute(UserProfileRoute(userId: '123'));
}
```
