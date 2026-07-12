If the requirement is specifically to use a class component, a TypeScript implementation is:

```tsx
import { Component } from 'react';

type Props = {
  initialCount?: number;
};

type State = {
  count: number;
};

export class Counter extends Component<Props, State> {
  state: State = { count: this.props.initialCount ?? 0 };

  increment = (): void => {
    this.setState((previous) => ({ count: previous.count + 1 }));
  };

  render() {
    return (
      <button type="button" onClick={this.increment}>
        Count: {this.state.count}
      </button>
    );
  }
}
```

The props and state are explicitly typed, state updates use the functional form to avoid stale values, and the arrow-property handler preserves the component instance as `this`. For new React code, function components with Hooks are generally the current default; use a class pattern when compatibility with an existing class-based codebase or an error boundary requirement makes it appropriate.
