# Anti-Patterns (Token Wasters)

- **Verbose Explanations**: "This is important because..." → Delete
- **Redundant Context**: Same info in multiple places
- **Large Inline Code**: Move code >10 lines to references/
- **Conversational Style**: "Let's see how to..." → "Do this:"
- **Over-Engineering**: Complex structure for simple skills
- **Redundant Descriptions**: Do not repeat frontmatter `description` after `## Priority`
- **Oversized Skills**: SKILL.md >100 lines → Extract to references/
- **Nested Formatting**: Avoid `**Bold**: \`**More Bold**\`` - causes visual noise
- **Verbose Anti-Patterns**: See strict format below

## Anti-Pattern Format (Strict)

Format: `**No X**: Do Y[, not Z]. [Optional context, max 15 words total]`

**Examples**:

### ❌ Verbose (24 words):

- **No Manual Emit**: `**Avoid .then()**: Do not call emit() inside Future.then; always use await or emit.forEach.`

### ✅ Compressed (11 words):

- **No .then()**: Use `await` or `emit.forEach()` to emit states.

### ❌ Verbose (18 words):

- **No UI Logic**: `**Logic in Builder**: Do not perform calculations or data formatting inside BlocBuilder.`

### ✅ Compressed (9 words):

- **No Logic in Builder**: Perform calculations in BLoC, not UI.
