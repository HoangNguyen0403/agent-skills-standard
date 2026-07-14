LIFT is an Angular organization principle:

- **Locate**: structure the project so developers can find code quickly.
- **Identify**: use descriptive filenames and type suffixes, such as `hero-list.component.ts` and `auth.service.ts`, so a file's role is obvious.
- **Flattest structure possible**: avoid unnecessary folder nesting; keep feature folders shallow and no deeper than three levels.
- **Try to be DRY**: avoid needless duplication, while keeping abstractions understandable and aligned with a real shared responsibility.

In practice, a feature should be organized around clearly named, shallow files rather than a deeply nested hierarchy or generic names. LIFT is about making navigation and maintenance predictable, not about forcing every feature into the same number of files.

