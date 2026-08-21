# Violation Detection Examples

Comprehensive examples of how to recognize and report skill violations, including the three diagnostic fields added to every report.

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

**Violation Report Output**:

```
🚨 SKILL VIOLATION DETECTED
Skill:        flutter/theme-system
File:         lib/widgets/card.dart:12
Rule:         Use theme colors, not hardcoded values
Violation:    color: Color(0xFF6200EE)
Fix:          color: Theme.of(context).colorScheme.primary
Auto-fixed:   YES
Root Cause:   PATTERN_MISMATCH — color token rule was loaded but AI used a hex literal instead
User Intent:  User asked for a card widget with a purple primary color
Skill Gap:    Add an explicit example showing hex literals as a prohibited form alongside Colors.blue
Co-skills:    flutter/design-system
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

**Violation Report Output**:

```
🚨 SKILL VIOLATION DETECTED
Skill:        flutter/theme-system
File:         lib/widgets/card.dart:20
Rule:         Use design tokens for spacing, not magic numbers
Violation:    SizedBox(height: 16.0)
Fix:          SizedBox(height: AppSpacing.medium)
Auto-fixed:   YES
Root Cause:   MISSING_COVERAGE — skill lists color tokens but spacing tokens are not mentioned
User Intent:  User asked to add vertical spacing between two widgets
Skill Gap:    Add a spacing tokens section listing AppSpacing constants with their pixel equivalents
Co-skills:    none
```

## React Hooks Violations

### Example 3: Class Component

**Loaded Skill**: `react/hooks`
**Rule**: "Use function components with hooks, not classes"

**Violation Detected**:

```jsx
class MyComponent extends React.Component {
  render() {
    return <div>Hello</div>;
  }
}
```

**Violation Report Output**:

```
🚨 SKILL VIOLATION DETECTED
Skill:        react/hooks
File:         src/components/MyComponent.tsx:3-8
Rule:         Use function components with hooks, not classes
Violation:    class MyComponent extends React.Component { ... }
Fix:          function MyComponent() { return <div>Hello</div>; }
Auto-fixed:   YES
Root Cause:   PATTERN_MISMATCH — anti-pattern was listed but AI defaulted to class syntax
User Intent:  User asked to create a new component to display a greeting
Skill Gap:    Promote the anti-pattern to the first line of the skill with a bold callout
Co-skills:    react/performance
```

### Example 4: Missing Cleanup

**Violation**:

```jsx
useEffect(() => {
  window.addEventListener('resize', handler);
  // ❌ No cleanup
}, []);
```

**Violation Report Output**:

```
🚨 SKILL VIOLATION DETECTED
Skill:        react/hooks
File:         src/components/Layout.tsx:45-49
Rule:         Always return a cleanup function from useEffect when subscribing to events
Violation:    addEventListener without return () => removeEventListener
Fix:          return () => window.removeEventListener('resize', handler)
Auto-fixed:   YES
Root Cause:   MISSING_COVERAGE — skill covers deps array but does not mention cleanup
User Intent:  User asked to listen for window resize to recompute layout
Skill Gap:    Add a dedicated anti-pattern: No addEventListener without cleanup — always return a teardown
Co-skills:    none
```

## Skill Creator Violations

### Example 5: SKILL.md Size Limit

**Loaded Skill**: `skill-creator`
**Rule**: "SKILL.md ≤100 lines"

**Violation Report Output**:

```
🚨 SKILL VIOLATION DETECTED
Skill:        skill-creator
File:         skills/my-skill/SKILL.md:1-105
Rule:         SKILL.md total: 100 lines max
Violation:    Created 105-line SKILL.md (5 lines over limit)
Fix:          Extract inline examples to references/examples.md, link from SKILL.md
Auto-fixed:   NO
Root Cause:   AMBIGUOUS_RULE — limit is stated but no guidance on what to extract first
User Intent:  User asked for a thorough skill with many examples for context
Skill Gap:    Add a priority extraction order: code blocks first, then tables, then prose sections
Co-skills:    none
```

## Real-World Example: Directional Spacing (Issue #67)

**Loaded Skill**: `web/design-system`
**Rule**: "Use only public token spacing — `p/px/py/gap` — not directional utilities"

**Violation Report Output**:

```
🚨 SKILL VIOLATION DETECTED
Skill:        web/design-system
File:         apps/web_builder/components/builder/site-contact-form-section.tsx:34,41
Rule:         Directional spacing utilities are outside public token contract
Violation:    pt-ss-spacing-xl pl-ss-spacing-3xl
Fix:          Replace with layout structure or p/px/py/gap token combinations
Auto-fixed:   YES
Root Cause:   AMBIGUOUS_RULE — "public token contract" is listed but directional examples are absent
User Intent:  User asked to add padding to the contact form section
Skill Gap:    Add explicit list of disallowed directional prefixes (pt-, pl-, pr-, pb-, mt-, etc.) with allowed alternatives
Co-skills:    common/common-feedback-reporter
```

> ℹ️ The original Issue #67 report was missing `Root Cause`, `User Intent`, and `Skill Gap`. These three fields are what make a report actionable for skill authors.

## Outdated Guidance Violation

### Example 6: Next.js Pages Router in App Router Project

**Violation Report Output**:

```
🚨 SKILL VIOLATION DETECTED
Skill:        nextjs/routing
File:         src/pages/dashboard.tsx:1
Rule:         Place all routes in the app/ directory using the App Router convention
Violation:    File created under pages/ directory with getServerSideProps
Fix:          Move to app/dashboard/page.tsx and use async server component with fetch()
Auto-fixed:   NO
Root Cause:   OUTDATED_GUIDANCE — skill still references pages/ directory pattern from Next.js 12 era
User Intent:  User asked to add a dashboard page with server-side data fetching
Skill Gap:    Replace pages/ examples with app/ equivalents; add a version callout "Next.js 13.4+ (App Router)"
Co-skills:    nextjs/data-fetching
```

## Competing Rules Violation

### Example 7: Performance vs Security Conflict

**Violation Report Output**:

```
🚨 SKILL VIOLATION DETECTED
Skill:        react/performance
File:         src/hooks/useUserCache.ts:14
Rule:         Cache frequently accessed data to avoid redundant fetches
Violation:    Stored JWT access token in localStorage as cache key
Fix:          Cache non-sensitive derived state only; keep tokens in HttpOnly cookies
Auto-fixed:   NO
Root Cause:   COMPETING_RULES — react/performance advises caching; react/security forbids localStorage for tokens
User Intent:  User asked to cache user session data to reduce API calls
Skill Gap:    Add a cross-skill note in react/performance: "Never cache authentication tokens — see react/security"
Co-skills:    react/security
```

## Root Cause Quick Reference

| Root Cause | Signal | Example Skill Gap Action |
|------------|--------|--------------------------|
| `AMBIGUOUS_RULE` | Rule admits two valid readings | Add concrete before/after examples |
| `MISSING_COVERAGE` | Pattern common but skill silent on it | Add new anti-pattern or guideline section |
| `OUTDATED_GUIDANCE` | Skill references deprecated API/version | Add version callout; update code samples |
| `COMPETING_RULES` | Two skills contradict on same decision | Add cross-skill note or priority tie-breaker |
| `PATTERN_MISMATCH` | AI knew rule but applied it incorrectly | Strengthen the anti-pattern line; add a negative example |

## Decision Tree Practice

```
1. Is there a loaded skill for this file type?
   └─ NO → Skip (no violation possible)
   └─ YES → Continue to step 2

2. Did the skill list anti-patterns or rules?
   └─ NO → Check skill description
   └─ YES → Continue to step 3

3. Does my code match any anti-pattern?
   └─ NO → Safe to proceed
   └─ YES → VIOLATION → Report now, populate all 10 fields

4. When classifying Root Cause, ask:
   - Was the rule clear? NO → AMBIGUOUS_RULE
   - Is this pattern covered? NO → MISSING_COVERAGE
   - Is the skill for an older version? YES → OUTDATED_GUIDANCE
   - Did another skill say the opposite? YES → COMPETING_RULES
   - Did I misread the rule? YES → PATTERN_MISMATCH
```
