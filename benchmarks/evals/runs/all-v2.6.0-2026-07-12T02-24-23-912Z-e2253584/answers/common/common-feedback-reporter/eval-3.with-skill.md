🚨 SKILL VIOLATION DETECTED
Skill:        common-feedback-reporter (with active React/TypeScript skills)
File:         src/UserPanel.tsx:1-12
Rule:         React components should use functions and hooks rather than class components; use idiomatic modern TypeScript.
Violation:    The planned TypeScript implementation uses a React class component pattern.
Fix:          Convert the component to a typed function component:
              `type Props = { userName: string };`
              `export function UserPanel({ userName }: Props) {`
              `  return <span>{userName}</span>;`
              `}`
Auto-fixed:   YES
Root Cause:   PATTERN_MISMATCH
User Intent:  Add a React UI function that renders the requested behavior in TypeScript.
Skill Gap:   The active React skill should make the class-to-function migration rule prominent and include a direct TypeScript example. This reduces the chance that “function” is interpreted as a function wrapping a class component.
Co-skills:    typescript-best-practices, typescript-language

Corrected implementation:

```tsx
type UserPanelProps = {
  userName: string;
};

export function UserPanel({ userName }: UserPanelProps) {
  return <span>{userName}</span>;
}
```
