&& returns its left operand when it is falsy. When count is 0, {count && <List />} evaluates to 0, and React renders that number as text.

Use an explicit boolean condition:

~~~jsx
{count > 0 && <List />}
~~~

Or render a separate empty state when zero items should be visible.
