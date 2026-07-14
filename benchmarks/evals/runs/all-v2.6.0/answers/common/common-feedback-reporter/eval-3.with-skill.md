🚨 SKILL VIOLATION DETECTED  
Skill:        common-feedback-reporter  
File:         [planned TypeScript file]  
Rule:         Use functions for React components.  
Violation:    `class MyComponent extends React.Component { ... }`  
Fix:          `function MyComponent(): JSX.Element { ... }`  
Auto-fixed:   YES  
Root Cause:   PATTERN_MISMATCH  
User Intent:  Add a React component implemented in TypeScript.  
Skill Gap:    The guidance should clarify that class-component requests are converted to function components.  
Co-skills:    none  

```tsx
import React from "react";

type MyComponentProps = {
  name: string;
};

function MyComponent({ name }: MyComponentProps): JSX.Element {
  return <div>Hello, {name}!</div>;
}

export default MyComponent;
```
