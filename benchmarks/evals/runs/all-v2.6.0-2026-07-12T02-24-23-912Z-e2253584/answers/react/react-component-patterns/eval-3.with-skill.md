Use a ternary instead of `&&`: `{count > 0 ? <List /> : null}`. JavaScript evaluates `0 && <List />` to `0`, and React renders that literal 0 into the DOM. An explicit boolean check avoids the bug.
