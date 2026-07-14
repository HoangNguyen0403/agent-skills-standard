Assumption: `ProductRepository.search` accepts a Dio `CancelToken`.

```dart
import 'package:bloc/bloc.dart';
import 'package:bloc_concurrency/bloc_concurrency.dart';
import 'package:dio/dio.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'product_search_bloc.freezed.dart';

@freezed
sealed class ProductSearchEvent with _$ProductSearchEvent {
  const factory ProductSearchEvent.queryChanged(String query) = QueryChanged;
}

@freezed
sealed class ProductSearchState with _$ProductSearchState {
  const factory ProductSearchState.initial() = Initial;
  const factory ProductSearchState.loading() = Loading;
  const factory ProductSearchState.success(List<Product> products) = Success;
  const factory ProductSearchState.failure(Object error, StackTrace stackTrace) =
      Failure;
}

class ProductSearchBloc
    extends Bloc<ProductSearchEvent, ProductSearchState> {
  ProductSearchBloc(this._repository)
      : super(const ProductSearchState.initial()) {
    on<QueryChanged>(
      _onQueryChanged,
      transformer: restartable(),
    );
  }

  final ProductRepository _repository;
  CancelToken? _activeCancelToken;

  Future<void> _onQueryChanged(
    QueryChanged event,
    Emitter<ProductSearchState> emit,
  ) async {
    // Cancel the previous HTTP request immediately.
    _activeCancelToken?.cancel();

    final query = event.query.trim();
    final cancelToken = CancelToken();
    _activeCancelToken = cancelToken;

    // Debounce input.
    await Future<void>.delayed(const Duration(milliseconds: 300));

    if (emit.isDone) return;

    if (query.isEmpty) {
      emit(const ProductSearchState.success([]));
      return;
    }

    emit(const ProductSearchState.loading());

    try {
      final products = await _repository.search(
        query,
        cancelToken: cancelToken,
      );

      if (!emit.isDone) {
        emit(ProductSearchState.success(products));
      }
    } on DioException catch (error, stackTrace) {
      if (CancelToken.isCancel(error) || emit.isDone) return;

      emit(ProductSearchState.failure(error, stackTrace));
    } catch (error, stackTrace) {
      if (emit.isDone) return;

      emit(ProductSearchState.failure(error, stackTrace));
    } finally {
      if (identical(_activeCancelToken, cancelToken)) {
        _activeCancelToken = null;
      }
    }
  }

  @override
  Future<void> close() {
    _activeCancelToken?.cancel();
    return super.close();
  }
}
```

Connect the screen with `BlocBuilder` and `BlocListener`:

```dart
BlocListener<ProductSearchBloc, ProductSearchState>(
  listener: (context, state) {
    state.whenOrNull(
      failure: (error, _) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.toString())),
        );
      },
    );
  },
  child: Column(
    children: [
      TextField(
        onChanged: (query) {
          context.read<ProductSearchBloc>().add(
                ProductSearchEvent.queryChanged(query),
              );
        },
      ),
      Expanded(
        child: BlocBuilder<ProductSearchBloc, ProductSearchState>(
          buildWhen: (previous, current) => previous != current,
          builder: (context, state) {
            return state.when(
              initial: () => const SizedBox.shrink(),
              loading: () => const Center(
                child: CircularProgressIndicator(),
              ),
              success: (products) => ProductList(products: products),
              failure: (_, __) => const Center(
                child: Text('Unable to load products'),
              ),
            );
          },
        ),
      ),
    ],
  ),
)
```

Test Initial → Loading → Success and Initial → Loading → Failure with `blocTest`. Remove any `.then()` usage; use `await` for asynchronous work.
