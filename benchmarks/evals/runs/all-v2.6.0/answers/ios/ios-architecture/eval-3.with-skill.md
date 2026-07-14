Here’s a quick-start MVVM + Coordinator example for iOS:

```swift
import UIKit
import Combine

struct LoginViewState {
    var isLoading = false
    var errorMessage: String?
    var isLoggedIn = false
}

protocol AuthServicing {
    func login(email: String, password: String) -> AnyPublisher<Bool, Error>
}

final class LoginViewModel {
    @Published private(set) var state = LoginViewState()

    private let authService: AuthServicing
    private var cancellables = Set<AnyCancellable>()

    init(authService: AuthServicing) {
        self.authService = authService
    }

    func loginTapped(email: String, password: String) {
        state.isLoading = true
        state.errorMessage = nil

        authService.login(email: email, password: password)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    self?.state.isLoading = false
                    if case let .failure(error) = completion {
                        self?.state.errorMessage = error.localizedDescription
                    }
                },
                receiveValue: { [weak self] success in
                    self?.state.isLoggedIn = success
                }
            )
            .store(in: &cancellables)
    }
}

protocol LoginCoordinatorDelegate: AnyObject {
    func loginDidFinish()
}

final class LoginCoordinator {
    private let navigationController: UINavigationController
    private let authService: AuthServicing
    weak var delegate: LoginCoordinatorDelegate?

    init(
        navigationController: UINavigationController,
        authService: AuthServicing
    ) {
        self.navigationController = navigationController
        self.authService = authService
    }

    func start() {
        let viewModel = LoginViewModel(authService: authService)
        let viewController = LoginViewController(viewModel: viewModel)
        viewController.onLoginSuccess = { [weak self] in
            self?.delegate?.loginDidFinish()
        }
        navigationController.pushViewController(viewController, animated: true)
    }
}

final class LoginViewController: UIViewController {
    private let viewModel: LoginViewModel
    private var cancellables = Set<AnyCancellable>()

    var onLoginSuccess: (() -> Void)?

    init(viewModel: LoginViewModel) {
        self.viewModel = viewModel
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        bindViewModel()
    }

    private func bindViewModel() {
        viewModel.$state
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                if state.isLoggedIn {
                    self?.onLoginSuccess?()
                }
            }
            .store(in: &cancellables)
    }

    @objc private func loginButtonTapped() {
        viewModel.loginTapped(email: "user@example.com", password: "secret")
    }
}
```

Why this matches good iOS architecture:

- `LoginViewModel` owns logic and UI state.
- State is exposed as `private(set)` via `@Published`.
- `LoginViewController` reacts to state and forwards user actions.
- Navigation stays in `LoginCoordinator`, not the view controller.
- Dependencies are injected from the coordinator into the view model.

If you want, I can also show the same quick start in VIP or VIPER style.

