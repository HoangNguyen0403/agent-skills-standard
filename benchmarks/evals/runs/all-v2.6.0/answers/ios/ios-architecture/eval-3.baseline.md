A quick-start iOS architecture example:

- Presentation: SwiftUI views and view models
- Domain: use cases and business rules
- Data: repositories, API clients, persistence

Flow:

1. View sends user actions to a ViewModel.
2. ViewModel calls a Use Case.
3. Use Case asks a Repository for data.
4. Repository talks to network or local storage.
5. Result flows back to update UI state.

Example structure:

```text
App/
  Features/
    Profile/
      ProfileView.swift
      ProfileViewModel.swift
  Domain/
    UseCases/
      GetProfileUseCase.swift
    Models/
      Profile.swift
  Data/
    Repositories/
      ProfileRepository.swift
    Services/
      APIClient.swift
```

Why this works:

- easier testing
- clearer responsibilities
- simpler scaling as features grow

