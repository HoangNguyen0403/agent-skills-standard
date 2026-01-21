# Package Detection & Skill Separation

## The Core Design Principle

Skills are **intentionally separated by package/library** for CLI detection, **NOT** for redundancy. The CLI automatically detects installed packages and applies relevant skills.

## ⚠️ Why Consolidation Breaks Detection

If you consolidate skills (e.g., merging all state management into one file), the CLI cannot accurately determine which specific instructions to load based on the `pubspec.yaml` or `package.json`.

### ❌ WRONG: Consolidated Skill

```text
skills/flutter/state-management/SKILL.md  # Covers BLoC + Riverpod + GetX
```

_Result_: Agent loads generic "state management" instructions, which is confusing and token-heavy.

### ✅ RIGHT: Separate Skills Per Package

```text
skills/flutter/bloc-state-management/SKILL.md      # flutter_bloc package
skills/flutter/riverpod-state-management/SKILL.md   # riverpod package
skills/flutter/getx-state-management/SKILL.md       # getx package
```

_Result_: Agent loads ONLY `flutter_bloc` instructions when that package is detected.

## Decision Framework

**BEFORE consolidating ANY skills, ask:**

1. ✅ Do these skills target **different packages/libraries**?
2. ✅ Are they triggered by **different package installations**?
3. ✅ Do they serve **different team preferences/use cases**?
4. ✅ Would consolidation **break CLI package detection**?

**If ANY answer is NO → KEEP SKILLS SEPARATE**

## Examples

**Navigation Skills (Flutter):**

- `go-router-navigation` → triggered by `go_router`
- `auto-route-navigation` → triggered by `auto_route`
- `navigator-v1-navigation` → triggered by built-in `Navigator`

**Validation Warning:**
The CLI will warn you if consolidation risks are detected:

```bash
⚠️ Potential consolidation risk: Multiple similar skills found in flutter/
```
