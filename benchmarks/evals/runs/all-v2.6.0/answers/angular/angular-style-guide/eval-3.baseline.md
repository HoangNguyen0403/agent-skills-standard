LIFT is an Angular project-organization principle. It stands for:

- **Locate**: Make it easy to locate code. A developer should be able to predict where a feature or artifact lives without searching the whole repository.
- **Identify**: Make files and folders easy to identify at a glance. Names should describe the feature and role, such as `orders/order-list/order-list.component.ts`, rather than generic names such as `components/item.ts`.
- **Flat**: Keep folders reasonably flat. Do not add multiple layers of nesting for every small artifact; introduce a subfolder when the feature has enough related files or a meaningful boundary to justify it.
- **Try to stay DRY**: Avoid needless duplication, especially duplicated behavior and conflicting copies of the same concept. At the same time, do not force unrelated features into an abstraction merely to eliminate a few similar lines; an abstraction is worthwhile when it has a clear shared responsibility.

LIFT is a maintainability heuristic, not a mandatory directory template. In practice it leads to feature-oriented folders, descriptive kebab-case names, and co-located component files and tests. For example, a developer looking for order-list behavior should be able to locate it in an `orders` feature area and identify the component from its name. A project can still choose standalone components, shared libraries, or different top-level boundaries as long as those choices preserve discoverability and avoid unnecessary nesting and duplication.

