React.FC is not inherently broken, but using it everywhere can hide useful API decisions. Depending on the installed React typings, it may add or historically imply children, and it can make generic component patterns less convenient. It does not make a component safer than an explicit props type.

A plain function makes required and optional props explicit:

~~~tsx
type ButtonProps = { label: string; onClick: () => void };

export function Button({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}
~~~

Keep React.FC if the team's convention matches the installed types; this is a style and ergonomics choice, not a runtime or security issue. Accurate props, event, ref, and return typing matter more.
