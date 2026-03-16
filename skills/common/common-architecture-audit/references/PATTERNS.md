# Architecture Audit Patterns & Remediation

This reference provides detailed patterns and strategies for remediating structural issues identified during an Architecture Audit.

## 🏗️ Structural Patterns

### 1. The "Logic-Heavy UI" (Web/Mobile)

**Pattern**: Components or Widgets containing complex business logic, direct API calls, or heavy state manipulation.
**Remediation**:

- **Web**: Extract complex `useEffect` or `useState` chains into custom hooks (`useFeatureLogic`).
- **Mobile**: Move business logic to BLoC, Provider, or a dedicated Service class.

### 2. The "God Service" (Backend)

**Pattern**: A single Service class exceeding 1,500 lines handling multiple distinct entities or responsibilities.
**Remediation**:

- Implement the **Single Responsibility Principle**.
- Extract sub-domains into specific services (e.g., `UserService` → `UserAuthService`, `UserProfileService`).

### 3. Database Leakage (Universal)

**Pattern**: Domain entities or DTOs containing transformation logic that depends on specific database drivers or ORM features.
**Remediation**:

- Use a **Data Mapper** pattern.
- Ensure the Domain layer is agnostic of the persistence layer.

---

## 🛠️ Recovery Strategies

| Finding            | Immediate Action                             | Long-term Fix                                               |
| ------------------ | -------------------------------------------- | ----------------------------------------------------------- |
| **Monolith File**  | Extract helper functions to private methods. | Break into smaller, atomic components or modules.           |
| **Logic Leakage**  | Move logic to a temporary helper file.       | Redesign the service/hook layer to own the logic correctly. |
| **Duplicate Core** | Mark legacy version as `@deprecated`.        | Consolidate and migrate usage to the standard version.      |
