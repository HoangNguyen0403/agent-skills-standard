# Should `@Suppress("LongMethod")` be allowed?

Do not allow it as an automatic or routine production-code bypass. The annotation only hides the Detekt finding; it does not make the method easier to understand, test, review, or change. A long method often indicates that several responsibilities should be extracted into named functions, collaborators, or a separate class.

An exception can be reasonable when the length is intentional and difficult to remove, for example generated code, a declarative DSL, a protocol mapping, or a small state-machine/table implementation. In that case:

- Keep the suppression at the narrowest scope possible (prefer the method rather than the class or file).
- Add a short reason in the code or review record and, for non-generated code, link it to an issue or design decision.
- Have a reviewer confirm that extraction would make the code worse rather than merely take effort.
- Keep tests around the behavior and periodically revisit the suppression.

For generated sources, prefer excluding the generated directory from Detekt or applying a generated-source convention instead of adding suppressions to generated files. For hand-written code, refactoring is the preferred fix: extract cohesive steps, reduce branching, and move unrelated responsibilities behind focused abstractions.

If the team wants this to be a hard policy, configure Detekt's `ForbiddenSuppress` rule to reject `LongMethod` suppressions, or enforce an equivalent review/lint rule. A narrowly justified suppression may be accepted as an explicit exception, but it should be visible, explainable, and uncommon—not a way to make a failing build green.

