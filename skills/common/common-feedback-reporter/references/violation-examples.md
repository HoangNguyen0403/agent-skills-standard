# Violation Detection Examples

Comprehensive examples of how to recognize and report skill violations.

## Flutter Theme System Violations

### Example 1: Hardcoded Color

**Loaded Skill**: `flutter/theme-system`  
**Rule**: "Use theme colors, not hardcoded values"

**Violation Detected**:

```dart
Container(
  color: Color(0xFF6200EE), // ❌ Hardcoded hex
)
```

**Analysis**:

- Rule says: Use theme colors
- My code: Hardcoded hex value
- **VERDICT**: VIOLATION

**Violation Report Output**:

```
🚨 SKILL VIOLATION DETECTED
Skill:       flutter/theme-system
File:        lib/widgets/card.dart:12
Rule:        Use theme colors, not hardcoded values
Violation:   color: Color(0xFF6200EE)
Fix:         color: Theme.of(context).colorScheme.primary
Auto-fixed:  YES
Co-skills:   flutter/design-system
```

**Correct Code**:

```dart
Container(
  color: Theme.of(context).colorScheme.primary, // ✅ Theme-based
)
```

### Example 2: Hardcoded Size

**Violation**:

```dart
SizedBox(height: 16.0) // ❌ Magic number
```

**Correct**:

```dart
SizedBox(height: AppSpacing.medium) // ✅ Design token
```

## React Hooks Violations

### Example 3: Class Component

**Loaded Skill**: `react/hooks`  
**Rule**: "Use function components with hooks, not classes"

**Violation Detected**:

```jsx
class MyComponent extends React.Component {
  // ❌ Class component
  render() {
    return <div>Hello</div>;
  }
}
```

**Analysis**:

- Rule says: Function components only
- My code: Class component
- **VERDICT**: VIOLATION

**Violation Report Output**:

```
🚨 SKILL VIOLATION DETECTED
Skill:       react/hooks
File:        src/components/MyComponent.tsx:3-8
Rule:        Use function components with hooks, not classes
Violation:   class MyComponent extends React.Component { ... }
Fix:         function MyComponent() { return <div>Hello</div>; }
Auto-fixed:  YES
Co-skills:   react/performance
```

**Correct Code**:

```jsx
function MyComponent() {
  // ✅ Function component
  return <div>Hello</div>;
}
```

### Example 4: Missing Cleanup

**Violation**:

```jsx
useEffect(() => {
  window.addEventListener('resize', handler);
  // ❌ No cleanup
}, []);
```

**Correct**:

```jsx
useEffect(() => {
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler); // ✅ Cleanup
}, []);
```

## Skill Creator Violations

### Example 5: SKILL.md Size Limit

**Loaded Skill**: `skill-creator`  
**Rule**: "SKILL.md ≤100 lines"

**Violation Detected**:

- Writing SKILL.md
- Line count: 105 lines
- Limit: 100 lines
- **VERDICT**: VIOLATION by 5 lines

**Violation Report Output**:

```
🚨 SKILL VIOLATION DETECTED
Skill:       skill-creator
File:        skills/my-skill/SKILL.md:1-105
Rule:        SKILL.md total: 100 lines max
Violation:   Created 105-line SKILL.md (5 lines over limit)
Fix:         Extract inline examples to references/examples.md, link from SKILL.md
Auto-fixed:  NO
Co-skills:   none
```

**Correct Action**:

1. Extract examples to `references/examples.md`
2. Reduce SKILL.md to ≤100 lines
3. Link to references from SKILL.md

### Example 6: Inline Code Too Long

**Violation**:

```markdown
## Example

\`\`\`dart
// 15 lines of code here
\`\`\`
```

**Rule**: "Inline code block: 10 lines max"  
**Correct**: Move to `references/patterns.md`

## Real-World Example: Directional Spacing (Issue #67)

**Loaded Skill**: `web/design-system`  
**Rule**: "Use only public token spacing — `p/px/py/gap` — not directional utilities"

**Violation Report Output**:

```
🚨 SKILL VIOLATION DETECTED
Skill:       web/design-system
File:        apps/web_builder/components/builder/site-contact-form-section.tsx:34,41
Rule:        Directional spacing utilities are outside public token contract
Violation:   pt-ss-spacing-xl pl-ss-spacing-3xl
Fix:         Replace with layout structure or p/px/py/gap token combinations
Auto-fixed:  YES
Co-skills:   common/common-feedback-reporter
```

> ℹ️ Issue #67 was missing `File`, `Violation` snippet, and `Co-skills`. The new format covers all three.

## TypeScript Violations

### Example 7: Missing Type Annotation

**Loaded Skill**: `typescript/strict-types`  
**Rule**: "Explicit return types for functions"

**Violation**:

```typescript
function calculate(a: number, b: number) {
  // ❌ No return type
  return a + b;
}
```

**Correct**:

```typescript
function calculate(a: number, b: number): number {
  // ✅ Return type
  return a + b;
}
```

## Decision Tree Practice

Use this when unsure if violation occurred:

```
1. Is there a loaded skill for this file type?
   └─ NO → Skip (no violation possible)
   └─ YES → Continue to step 2

2. Did the skill list anti-patterns or rules?
   └─ NO → Check skill description
   └─ YES → Continue to step 3

3. Does my code match any anti-pattern?
   └─ NO → Safe to proceed
   └─ YES → VIOLATION → Report now

4. If unsure, ask:
   - Would skill author consider this wrong?
   - Does it violate the spirit of the rule?
   - If YES to either → Report as potential violation
```

## Common Pitfalls

### Pitfall 1: "Close Enough" Thinking

**Wrong**: "I used `Colors.blue` instead of hex, close enough"  
**Right**: "Rule says theme colors, `Colors.blue` is still hardcoded → VIOLATION"

### Pitfall 2: Delayed Reporting

**Wrong**: Write code → Ship → Remember violation later  
**Right**: Detect violation → Report → Fix → Then ship

### Pitfall 3: Selective Checking

**Wrong**: "Only check on big features"  
**Right**: "Check every file write, regardless of size"

## Meta-Skill: Improving This Skill

If you find yourself violating patterns repeatedly:

1. Report the violation
2. In `--suggestion`, propose skill improvement
3. Example: "Add this to anti-patterns section for clarity"

This creates feedback loop to continuously improve skill quality.
