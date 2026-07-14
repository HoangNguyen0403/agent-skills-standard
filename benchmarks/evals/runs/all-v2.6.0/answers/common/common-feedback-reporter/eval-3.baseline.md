```tsx
import React from "react";

type GreetingProps = {
  name: string;
};

class Greeting extends React.Component<GreetingProps> {
  render(): React.ReactNode {
    return <h1>Hello, {this.props.name}!</h1>;
  }
}

export function createGreeting(name: string): React.ReactElement {
  return <Greeting name={name} />;
}
```
