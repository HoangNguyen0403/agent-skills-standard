Define an explicit props type; children is usually ReactNode and className is optional:

~~~tsx
import type { ReactNode } from 'react';

type PanelProps = {
  children: ReactNode;
  className?: string;
};

export function Panel({ children, className }: PanelProps) {
  return <section className={className}>{children}</section>;
}
~~~

PropsWithChildren is also valid, but an explicit children property makes requiredness clear. Avoid any and do not use React.FC solely because it is available.
