# Review Output Format

## 🎯 Goal: Readability

Reviews must be **scannable**. Avoid walls of text. Use headings and grouping.

## 📝 Template Structure

### 1. High-Level Summary

Start with a 1-sentence summary of the PR's impact.
_Example: "Solid implementation of the Auth flow. Just a few security concerns regarding token storage."_

### 2. Categorized Findings

Group comments by severity, not by file order.

#### 🔴 **BLOCKER (Must Fix)**

Critical bugs, security holes, breaking changes.

- **File**: `path/to/file.ts`
- **Issue**: Short description.
- **Suggestion**: Use `diff` block.

#### 🟠 **MAJOR (Should Fix)**

Performance optimization, confusing logic, lack of tests.

- **File**: `path/to/file.ts`

#### 🟢 **NIT (Optional)**

Naming, typos, minor refactors.

- **File**: `path/to/file.ts`

### 3. "Good-to-Bad" Diff Example

**❌ Bad (Vague)**

> This function is too long and complex. Refactor it.

**✅ Good (Actionable & Educational)**

> `processUserData` has growing complexity (Cyclomatic > 10). Consider extracting the validation logic to keep it readable.

```typescript
// Suggestion
function processUserData(user) {
  validateUser(user); // Extracted
  saveToDb(user);
}
```
