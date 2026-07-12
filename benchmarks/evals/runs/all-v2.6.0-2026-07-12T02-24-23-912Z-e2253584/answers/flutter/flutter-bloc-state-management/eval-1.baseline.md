Use `flutter_bloc` with an event-driven search flow and a restartable event transformer. That gives you both requirements:

- debounce user typing so you do not hit the API on every keystroke
- cancel the in-flight search when a newer query arrives

Example:

```dart
import 'dart:async';

import 'package:bloc/bloc.dart';
import 'package:bloc_concurrency/bloc_concurrency.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:stream_transform/stream_transform.dart';

class Product extends Equatable {
  final String id;
  final String name;

  const Product({required this.id, required this.name});

  @override
  List<Object?> get props => [id, name];
}

abstract class ProductRepository {
  Future<List<Product>> searchProducts(String query);
}

sealed class ProductSearchEvent extends Equatable {
  const ProductSearchEvent();

  @override
  List<Object?> get props => [];
}

class SearchQueryChanged extends ProductSearchEvent {
  final String query;

  const SearchQueryChanged(this.query);

  @override
  List<Object?> get props => [query];
}

sealed class ProductSearchState extends Equatable {
  const ProductSearchState();

  @override
  List<Object?> get props => [];
}

class ProductSearchInitial extends ProductSearchState {}

class ProductSearchLoading extends ProductSearchState {
  final String query;

  const ProductSearchLoading(this.query);

  @override
  List<Object?> get props => [query];
}

class ProductSearchSuccess extends ProductSearchState {
  final String query;
  final List<Product> products;

  const ProductSearchSuccess({
    required this.query,
    required this.products,
  });

  @override
  List<Object?> get props => [query, products];
}

class ProductSearchFailure extends ProductSearchState {
  final String query;
  final String message;

  const ProductSearchFailure({
    required this.query,
    required this.message,
  });

  @override
  List<Object?> get props => [query, message];
}

EventTransformer<T> debounceRestartable<T>(Duration duration) {
  return (events, mapper) => restartable<T>().call(
        events.debounce(duration),
        mapper,
      );
}

class ProductSearchBloc
    extends Bloc<ProductSearchEvent, ProductSearchState> {
  ProductSearchBloc({required this.repository})
      : super(ProductSearchInitial()) {
    on<SearchQueryChanged>(
      _onSearchQueryChanged,
      transformer: debounceRestartable(
        const Duration(milliseconds: 350),
      ),
    );
  }

  final ProductRepository repository;

  Future<void> _onSearchQueryChanged(
    SearchQueryChanged event,
    Emitter<ProductSearchState> emit,
  ) async {
    final query = event.query.trim();

    if (query.isEmpty) {
      emit(ProductSearchInitial());
      return;
    }

    emit(ProductSearchLoading(query));

    try {
      final products = await repository.searchProducts(query);
      emit(ProductSearchSuccess(query: query, products: products));
    } catch (error) {
      emit(ProductSearchFailure(
        query: query,
        message: 'Failed to load products',
      ));
    }
  }
}
```

UI usage:

```dart
TextField(
  onChanged: (value) {
    context.read<ProductSearchBloc>().add(SearchQueryChanged(value));
  },
)
```

Why this works:

- `debounce` waits until the user pauses typing
- `restartable()` cancels the previous event handler when a new query event arrives
- only the latest query is allowed to complete and update state

Notes:

- If your HTTP client supports request cancellation, wire that in at the repository layer too. The bloc-level `restartable` prevents stale state updates, while transport-level cancellation can also save network work.
- If you want to keep showing previous results during refresh, use a richer loading state that carries the old list instead of replacing it with a blank loading state.

