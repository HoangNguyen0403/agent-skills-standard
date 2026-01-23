# iOS Architecture Implementation

## MVVM-C (Coordinator) Example

```swift
// 1. Definition of Inputs/Outputs
protocol HomeViewModelType {
    var inputs: HomeViewModelInputs { get }
    var outputs: HomeViewModelOutputs { get }
}

// 2. ViewModel
class HomeViewModel: HomeViewModelType, HomeViewModelInputs, HomeViewModelOutputs {
    var inputs: HomeViewModelInputs { return self }
    var outputs: HomeViewModelOutputs { return self }

    // Outputs
    @Published private(set) var title: String = ""

    // Inputs
    func viewDidLoad() {
        title = "Welcome"
    }
}

// 3. Coordinator
class HomeCoordinator: Coordinator {
    var navigationController: UINavigationController

    init(nav: UINavigationController) {
        self.navigationController = nav
    }

    func start() {
        let vm = HomeViewModel()
        let vc = HomeViewController(viewModel: vm)
        vc.coordinator = self
        navigationController.pushViewController(vc, animated: true)
    }
}
```

## VIP (Clean Swift) Unidirectional Flow

```swift
// Router -> ViewController -> Interactor -> Presenter -> ViewController
class ListInteractor: ListBusinessLogic {
    var presenter: ListPresentationLogic?

    func fetchItems(request: List.Fetch.Request) {
        // Fetch data...
        let response = List.Fetch.Response(items: items)
        presenter?.presentFetchedItems(response: response)
    }
}

class ListPresenter: ListPresentationLogic {
    weak var viewController: ListDisplayLogic?

    func presentFetchedItems(response: List.Fetch.Response) {
        let viewModel = List.Fetch.ViewModel(displayedItems: ...)
        viewController?.displayFetchedItems(viewModel: viewModel)
    }
}
```
