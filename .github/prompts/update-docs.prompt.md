---
description: "Automated workflow to detect and fix missing documentation"
---

# Documentation Update Workflow

This workflow helps you identify and fix missing documentation in the codebase.

## Runtime Contract

- Use when exported members lack documentation and the scanner identifies gaps.
- Load `common-decision-discipline` and apply its §8 continuation contract at entry and every handoff: the settled result selects the successor and specialized gates dominate.

## 1. Run the Documentation Scanner

The `scan-docs.ts` script identifies exported members that lack JSDoc comments.

```bash
pnpm docs:scan
```

## 2. Analyze the Report

The script will output a list of files and members missing documentation.

Example output:

```text
⚠️  Found undocumented members:
📄 src/services/MyService.ts
   - class MyService
   - function doSomething
```

## 3. Generate Documentation

For each missing item:

1. **Read the code** to understand its purpose.
2. **Add JSDoc comments** (`/** ... */`) above the export.
3. **Include**:
   - Description of what it does.
   - `@param` tags for arguments.
   - `@returns` tag for return value.

## 4. Verify

Run the scanner again to ensure no items remain.

```bash
pnpm docs:scan
```
