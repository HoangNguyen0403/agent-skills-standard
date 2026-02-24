# Skill Activation Test Scenarios

This document provides test scenarios to validate that the feedback-reporter skill activates and executes correctly.

## Scenario 1: Uncertainty Detection

**Setup:**

- Skill loaded due to `context_triggers` match
- AI encounters conflicting guidance

**Test Conversation:**

```
User: "How should I handle async state in React hooks?"
AI: *Detects uncertainty between react/hooks and react/performance skills*
```

**Expected Behavior:**

```bash
# AI should execute:
npx agent-skills-standard feedback \
  --skill="react/hooks" \
  --issue="Conflicting guidance on async state management" \
  --context="React 18" \
  --model="Claude 3.5 Sonnet" \
  --suggestion="Clarify relationship with react/performance patterns"
```

## Scenario 2: User Correction

**Setup:**

- AI suggests code based on skill guidance
- User corrects the suggestion

**Test Conversation:**

```
AI: "Based on flutter/bloc-state-management, use BuildContext directly in async..."
User: "No, that's wrong. You need SafeBuildContext wrapper for async gaps."
```

**Expected Behavior:**

```bash
# AI should immediately execute:
npx agent-skills-standard feedback \
  --skill="flutter/bloc-state-management" \
  --issue="Incorrect BuildContext async guidance" \
  --context="Flutter 3.16+, async/await in BLoC" \
  --model="Claude 3.5 Sonnet" \
  --suggestion="Add SafeBuildContext wrapper pattern"
```

## Scenario 3: Test/Lint Failure

**Setup:**

- AI generates code following skill guidance
- Code fails linting immediately

**Test Conversation:**

```
User: "Add a useEffect hook for fetching data"
AI: *Follows react/hooks skill, suggests useEffect without deps*
Linter: "Error: exhaustive-deps violation"
```

**Expected Behavior:**

```bash
# AI should execute:
npx agent-skills-standard feedback \
  --skill="react/hooks" \
  --issue="useEffect guidance missing exhaustive-deps enforcement" \
  --context="React 18, ESLint exhaustive-deps enabled" \
  --model="Claude 3.5 Sonnet" \
  --suggestion="Emphasize exhaustive-deps lint rule in guidance"
```

## Scenario 4: Outdated Framework Guidance

**Setup:**

- Skill references older framework version
- User working with newer version that deprecated pattern

**Test Conversation:**

```
User: "I'm using Next.js 14 with App Router"
AI: *Follows nextjs skill suggesting pages/ directory structure*
User: "That's the old Pages Router. App Router uses app/ directory."
```

**Expected Behavior:**

```bash
# AI should execute:
npx agent-skills-standard feedback \
  --skill="nextjs/routing" \
  --issue="Guidance outdated for Next.js 14 App Router" \
  --context="Next.js 14, App Router" \
  --model="Claude 3.5 Sonnet" \
  --suggestion="Update to distinguish Pages Router vs App Router patterns"
```

## Scenario 5: Missing Critical Pattern

**Setup:**

- Skill lacks guidance for common edge case
- AI uncertain about best practice

**Test Conversation:**

```
User: "How do I handle error boundaries in server components?"
AI: *Consults react/error-handling skill, finds no server component guidance*
AI: *Uncertain about correct approach*
```

**Expected Behavior:**

```bash
# AI should execute:
npx agent-skills-standard feedback \
  --skill="react/error-handling" \
  --issue="Missing server component error boundary pattern" \
  --context="React 18, Next.js 14, Server Components" \
  --model="Claude 3.5 Sonnet" \
  --suggestion="Add dedicated section for server vs client error boundaries"
```

## Scenario 6: Ambiguous Instruction

**Setup:**

- Skill guidance can be interpreted multiple ways
- AI unsure which interpretation is correct

**Test Conversation:**

```
User: "Set up authentication in my NestJS app"
AI: *nestjs/auth skill says "use guards for protected routes"*
AI: *Unclear if should use JWT, session, or passport-based guards*
```

**Expected Behavior:**

```bash
# AI should execute:
npx agent-skills-standard feedback \
  --skill="nestjs/auth" \
  --issue="Guard implementation guidance too vague" \
  --context="NestJS 10, REST API" \
  --model="Claude 3.5 Sonnet" \
  --suggestion="Clarify when to use JWT vs Session vs Passport guards"
```

## Scenario 7: Multi-Skill Conflict (Performance vs Security)

**Setup:**

- Two skills provide contradictory guidance
- AI must choose between competing priorities

**Test Conversation:**

```
User: "Should I cache this user data in local storage?"
AI: *react/performance says "cache frequently accessed data"*
AI: *react/security says "never store sensitive data in local storage"*
AI: *Conflicting guidance detected*
```

**Expected Behavior:**

```bash
# AI should execute:
npx agent-skills-standard feedback \
  --skill="react/performance" \
  --issue="Conflicts with react/security on local storage caching" \
  --context="User authentication data, React 18" \
  --model="Claude 3.5 Sonnet" \
  --suggestion="Add security disclaimer and reference react/security skill"
```

## Scenario 8: Code Review BLOCKER Traces to Skill Gap

**Setup:**

- `/code-review` runs on a PR
- A BLOCKER finding is identified that a loaded skill should have caught

**Test Conversation:**

```
Code review finds:
🔴 [BLOCKER] auth/auth.service.ts — Password stored in plain text before hashing
Active skill: common/security-standards
Skill rule: "Hash passwords with Argon2id before storage"
```

**Expected Behavior:**

```bash
# AI runs feedback immediately after producing the BLOCKER:
npx agent-skills-standard feedback \
  --skill="common/security-standards" \
  --issue="Security skill active but did not prevent plain-text password storage" \
  --skill-instruction="Hash passwords with Argon2id before storage" \
  --actual-action="Plain text password passed to DB before hashing step" \
  --suggestion="Add anti-pattern: **No Plain Passwords**: Hash before any DB/log operation"
```

**Why this matters**: The skill was loaded, the rule existed, but the agent still wrote violating code. That's a trigger clarity or priority failure — report it.

---

## Scenario 9: User Override (Highest-Signal Feedback)

**Setup:**

- Agent provides a code suggestion based on a loaded skill
- User explicitly corrects it

**Test Conversation:**

```
AI: "Use @Transactional on the Controller method to wrap the request."
User: "No, @Transactional belongs on the Service layer, not the Controller."
```

**Expected Behavior:**

```bash
# AI runs feedback IMMEDIATELY upon receiving the correction:
npx agent-skills-standard feedback \
  --skill="spring-boot/architecture" \
  --issue="Suggested @Transactional on Controller — violates layer separation" \
  --skill-instruction="Business transactions must be bounded in Service layer" \
  --actual-action="Suggested adding @Transactional to controller method" \
  --suggestion="Add anti-pattern: **No Transactional Controller**: Move @Transactional to Service layer"
```

**Why this matters**: User overrides are the highest-quality signal in the system. Every correction means the skill was unclear, wrong, or missing the exact rule. Never dismiss or defer reporting after a correction.

---

✅ **Trigger Activation**: Skill loads when context contains trigger keywords  
✅ **Detection**: AI recognizes one of the 4 detection conditions  
✅ **Command Execution**: AI runs exact `npx agent-skills-standard feedback` command  
✅ **Payload**: All fields (skill, issue, context, model, suggestion) correctly populated  
✅ **Privacy**: No code snippets or project details included in submission

## Without Skill (Baseline)

**Test:** Same scenarios with feedback-reporter excluded in `.skillsrc`

**Expected Behavior:**

- AI should NOT auto-report
- User must manually run `npx agent-skills-standard feedback`
- No automated detection or submission occurs
