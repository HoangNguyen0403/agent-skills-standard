Fix this code — I'm getting a bad state error:
class CounterBloc extends Bloc<CounterEvent, int> {
  CounterBloc() : super(0);
  void increment() {
    emit(state + 1).then((_) => print('done'));
  }
}