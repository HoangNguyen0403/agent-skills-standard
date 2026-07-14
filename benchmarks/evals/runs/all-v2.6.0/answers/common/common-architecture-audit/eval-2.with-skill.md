# React monolith and oversized-file audit

The two-year age of the codebase is not itself evidence of a monolith. The audit should measure oversized files and then determine whether a component mixes responsibilities that should have separate ownership.

First inventory UI file sizes. The skill’s thresholds are `>500` lines for a medium UI concern and `>1,000` lines for a critical UI monolith. For example:

```bash
rg --files -g '*.tsx' | xargs wc -l | awk '$1 > 500'
```

For each large file, inspect whether rendering is mixed with data fetching, mutations, form/state transitions, navigation, permissions, analytics, domain rules, and error/retry handling. A long cohesive table, generated artifact, or static configuration is not automatically a monolith; a shorter component with many unrelated effects can be worse. Also check imports, dependency fan-in/fan-out, circular dependencies, shared-store reach, and whether changing one feature forces unrelated tests or route bundles to change.

Apply the React logic-leakage heuristic as a second signal:

```bash
rg -n 'useEffect|useState|useMemo' components -g '*.tsx' | wc -l
```

Compare that count with the corresponding `hooks/` implementation count. If hook usage in `components/` exceeds the `hooks/` count by more than roughly `20x`, treat it as likely logic leakage and inspect the highest-concentration files. Also search for split sources of truth such as `New`, `V2`, `/v1`, `/v2`, or `Refactor` directories, and for constants/string/GraphQL resources over `1,000` lines that should be granularized.

The desired direction is usually:

`app shell/routes -> feature module -> domain/data module -> shared UI/platform utilities`

Components should compose UI and expose user interactions; custom hooks or feature data modules should own fetch/mutation coordination; reducers or models should own complex state transitions; domain functions should own business rules. Shared code must remain genuinely generic and must not import feature internals. Keep state at the narrowest useful scope and reserve global state for cross-cutting needs.

Prioritize files above `1,000` lines, high-hook-concentration components, high-centrality modules, and files with repeated defect or change history. The skill assigns `-10` for each unit over `1,000` lines, but line count is a triage score, not proof of an architectural violation. Confirm whether the file is a real responsibility monolith before reporting it.

Remediate incrementally: characterize behavior with component/use-case tests, extract cohesive data logic into hooks, state transitions into reducers/models, repeated views into components, and business rules into feature/domain modules. Preserve loading, empty, error, retry, cancellation, permissions, and navigation behavior. Splitting one file into many files without changing dependency ownership merely creates a distributed monolith. Success means lower coupling, fewer circular imports, smaller route bundles where applicable, and feature logic testable without rendering the entire screen.

No specific React finding can be confirmed without the repository contents and file-size/dependency measurements.

