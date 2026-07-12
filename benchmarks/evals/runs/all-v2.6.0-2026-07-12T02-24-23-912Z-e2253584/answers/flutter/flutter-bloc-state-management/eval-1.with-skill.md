Use a dedicated `SearchProductsBloc` with explicit event/state unions, debounce at the event source, and `restartable()` so an in-flight request is canceled when a newer query arrives.

```dart
import 'dart:async';

import 'package:bloc/bloc.dart';
import 'package:bloc_concurrency/bloc_concurrency.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:stream_transform/stream_transform.dart';

part 'search_products_bloc.freezed.dart';
part 'search_products_event.dart';
part 'search_products_state.dart';

EventTransformer<E> debounceRestartable<E>(Duration duration) {
  return (events, mapper) => restartable<E>().call(
        events.debounce(duration),
        mapper,
      );
}

class SearchProductsBloc
    extends Bloc<SearchProductsEvent, SearchProductsState> {
  SearchProductsBloc(this._repository)
      : super(const SearchProductsState.initial()) {
    on<_QueryChanged>(
      _onQueryChanged,
      transformer: debounceRestartable(const Duration(milliseconds: 350)),
    );
    on<_Cleared>(_onCleared);
  }

  final ProductRepository _repository;

  Future<void> _onQueryChanged(
    _QueryChanged event,
    Emitter<SearchProductsState> emit,
  ) async {
    final query = event.query.trim();

    if (query.isEmpty) {
      emit(const SearchProductsState.initial());
      return;
    }

    emit(SearchProductsState.loading(query: query));

    try {
      final products = await _repository.searchProducts(query);
      emit(
        SearchProductsState.success(
          query: query,
          products: products,
        ),
      );
    } catch (error, stackTrace) {
      addError(error, stackTrace);
      emit(
        SearchProductsState.failure(
          query: query,
          message: 'Unable to search products. Please try again.',
        ),
      );
    }
  }

  void _onCleared(
    _Cleared event,
    Emitter<SearchProductsState> emit,
  ) {
    emit(const SearchProductsState.initial());
  }
}
```

```dart
part of 'search_products_bloc.dart';

@freezed
class SearchProductsEvent with _$SearchProductsEvent {
  const factory SearchProductsEvent.queryChanged(String query) = _QueryChanged;
  const factory SearchProductsEvent.cleared() = _Cleared;
}
```

```dart
part of 'search_products_bloc.dart';

@freezed
class SearchProductsState with _$SearchProductsState {
  const factory SearchProductsState.initial() = _Initial;
  const factory SearchProductsState.loading({
    required String query,
  }) = _Loading;
  const factory SearchProductsState.success({
    required String query,
    required List<Product> products,
  }) = _Success;
  const factory SearchProductsState.failure({
    required String query,
    required String message,
  }) = _Failure;
}
```

The UI should send text changes into the bloc and keep rendering logic simple:

```dart
class ProductSearchView extends StatelessWidget {
  const ProductSearchView({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TextField(
          onChanged: (value) {
            context
                .read<SearchProductsBloc>()
                .add(SearchProductsEvent.queryChanged(value));
          },
        ),
        Expanded(
          child: BlocBuilder<SearchProductsBloc, SearchProductsState>(
            buildWhen: (previous, current) => previous != current,
            builder: (context, state) {
              return state.when(
                initial: () => const Center(
                  child: Text('Start typing to search products'),
                ),
                loading: (_) =>
                    const Center(child: CircularProgressIndicator()),
                success: (_, products) => ListView.builder(
                  itemCount: products.length,
                  itemBuilder: (context, index) {
                    final product = products[index];
                    return ListTile(title: Text(product.name));
                  },
                ),
                failure: (_, message) => Center(child: Text(message)),
              );
            },
          ),
        ),
      ],
    );
  }
}
```

Why this fits the requirement:

- Debounce prevents firing a request for every keystroke immediately.
- `restartable()` cancels the previous in-flight handler when a new query arrives.
- `await` is used instead of `.then()`, which keeps emission flow predictable.
- `BlocBuilder` handles rendering only; any navigation or snackbars should go in `BlocListener`.

Tests should cover the main transitions:

```dart
blocTest<SearchProductsBloc, SearchProductsState>(
  'emits loading then success for a valid query',
  build: () {
    when(() => repository.searchProducts('shoe'))
        .thenAnswer((_) async => [const Product(name: 'Running Shoe')]);
    return SearchProductsBloc(repository);
  },
  act: (bloc) => bloc.add(const SearchProductsEvent.queryChanged('shoe')),
  expect: () => [
    const SearchProductsState.loading(query: 'shoe'),
    SearchProductsState.success(
      query: 'shoe',
      products: [const Product(name: 'Running Shoe')],
    ),
  ],
);

blocTest<SearchProductsBloc, SearchProductsState>(
  'emits loading then failure when search fails',
  build: () {
    when(() => repository.searchProducts('shoe'))
        .thenThrow(Exception('network'));
    return SearchProductsBloc(repository);
  },
  act: (bloc) => bloc.add(const SearchProductsEvent.queryChanged('shoe')),
  expect: () => [
    const SearchProductsState.loading(query: 'shoe'),
    const SearchProductsState.failure(
      query: 'shoe',
      message: 'Unable to search products. Please try again.',
    ),
  ],
);
```

