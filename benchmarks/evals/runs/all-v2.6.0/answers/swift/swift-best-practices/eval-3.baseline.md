Idiomatic Swift generally means making ownership, failure, and intent explicit:

- Prefer `let` and value types (`struct` and `enum`) unless mutation or identity is required.
- Use descriptive Swift API names, access control, and protocol-oriented composition.
- Use `guard` for invalid or exceptional paths and unwrap optionals deliberately with `if let`, `guard let`, or `??` instead of force-unwrapping.
- Prefer standard-library operations such as `map`, `compactMap`, `filter`, and `reduce` when they improve clarity; do not force a chain that is harder to read.
- Model failures with typed errors and `throws`, and use `async`/`await` for asynchronous work.
- Keep functions focused, avoid unnecessary duplication, and run formatting, linting, tests, and the compiler regularly.

The best idiom is the one that makes the code clear and preserves the domain's invariants.

