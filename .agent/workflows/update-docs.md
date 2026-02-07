---
description: Automated workflow to detect and fix missing documentation
---

# Documentation Update Workflow

This workflow helps you identify and fix missing documentation in the codebase.

## 1. Run the Documentation Scanner

The `scan-docs.ts` script identifies exported members that lack JSDoc comments.

```bash
cd cli
npx ts-node scripts/scan-docs.ts
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

1.  **Read the code** to understand its purpose.
2.  **Add JSDoc comments** (`/** ... */`) above the export.
3.  **Include**:
    - Description of what it does.
    - `@param` tags for arguments.
    - `@returns` tag for return value.

## 4. Verify

Run the scanner again to ensure no items remain.

```bash
npx ts-node scripts/scan-docs.ts
```
