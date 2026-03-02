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

**Feedback Command**:

```bash
npx agent-skills-standard feedback \
  --skill="flutter/theme-system" \
  --issue="Used hardcoded hex color instead of theme" \
  --skill-instruction="Use theme colors, not hardcoded values" \
  --actual-action="Wrote Color(0xFF6200EE)" \
  --decision-reason="Forgot to check theme system"
```

**Correct Code**:

```dart
Container(
  color: Theme.of(context).primaryColor, // ✅ Theme-based
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

**Feedback Command**:

```bash
npx agent-skills-standard feedback \
  --skill="react/hooks" \
  --issue="Created class component instead of function component" \
  --skill-instruction="Use function components with hooks" \
  --actual-action="Wrote class MyComponent extends React.Component" \
  --decision-reason="Habit from older React patterns"
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
**Rule**: "SKILL.md ≤70 lines"

**Violation Detected**:

- Writing SKILL.md
- Line count: 85 lines
- Limit: 70 lines
- **VERDICT**: VIOLATION by 15 lines

**Feedback Command**:

```bash
npx agent-skills-standard feedback \
  --skill="skill-creator" \
  --issue="SKILL.md exceeds 70 line limit (85 lines)" \
  --skill-instruction="SKILL.md total: 70 lines max" \
  --actual-action="Created 85-line SKILL.md" \
  --decision-reason="Included too many inline examples"
```

**Correct Action**:

1. Extract examples to `references/examples.md`
2. Reduce SKILL.md to ≤70 lines
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
