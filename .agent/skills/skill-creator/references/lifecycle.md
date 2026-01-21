# Skill Creation Lifecycle (Token-Optimized)

Complete process for creating high-density skills with maximum token efficiency.

## Phase 1: Understanding (Token Audit)

**Goal**: Define concrete use cases before writing anything.

### Steps

1. **Identify Triggers**: What files/keywords should activate this skill?
2. **Define Scope**: What specific problems does this skill solve?
3. **Token Budget**: Estimate context window usage across agents
4. **Competitive Analysis**: How does this compare to existing skills?

### Token Considerations

- **Cursor**: ~100k tokens - plan for heavy usage
- **Claude**: ~200k tokens - more generous but still optimize
- **Windsurf**: ~32k tokens - critical to be concise

## Phase 2: Planning (Resource Strategy)

**Goal**: Map content to the three-level loading system.

### Content Mapping

```json
Level 1 (Always Loaded - 100 words):
├── name + description (triggers activation)
└── metadata (labels, triggers)

Level 2 (When Triggered - 500 lines):
├── Core workflow (SKILL.md body)
├── Essential guidelines
└── Anti-patterns

Level 3 (Lazy Loaded - Unlimited):
├── references/ - Complex examples
├── scripts/ - Deterministic automation
└── assets/ - Output templates
```

### Decision Framework

- **SKILL.md**: Essential workflow + selection guidance
- **references/**: Detailed patterns, API docs, complex examples
- **scripts/**: Code generation, validation, repetitive tasks
- **assets/**: Boilerplate, templates, never-loaded resources

## Phase 3: Implementation (Compression)

**Goal**: Write imperative, token-efficient content.

### Writing Rules

1. **Imperative First**: "Use BLoC" not "You should use BLoC"
2. **Abbreviate**: cfg, param, impl, deps
3. **Bullet Points**: 3x density vs paragraphs
4. **Delete Fluff**: No "This is important because..."
5. **Link, Don't Include**: Reference heavy content

### Frontmatter Optimization

```yaml
name: BLoC State Management
description: Implement BLoC pattern for Flutter state management. Use when creating reactive UIs with complex state logic, user interactions, or API data handling.
metadata:
  labels: [flutter, state-management, reactive]
  triggers:
    files: ['**/*_bloc.dart', '**/*_event.dart', '**/*_state.dart']
    keywords: [bloc, state management, reactive ui]
```

## Phase 4: Validation (Token Testing)

**Goal**: Ensure skill works efficiently across all agents.

### Validation Checklist

- [ ] SKILL.md < 500 lines
- [ ] Frontmatter < 100 words
- [ ] No redundant information
- [ ] Complex examples in references/
- [ ] Deterministic tasks in scripts/
- [ ] Templates in assets/

### Testing Across Agents

1. **Cursor**: Test with .cursorrules integration
2. **Windsurf**: Verify within 32k token limit
3. **Claude**: Check context window efficiency
4. **GitHub Copilot**: Validate .github/skills/ sync

### Performance Metrics

- **Loading Speed**: Time to activate skill
- **Token Usage**: Measure context consumption
- **Relevance**: False positive/negative rate
- **User Satisfaction**: Does it solve the problem?

## Phase 5: Iteration (Continuous Optimization)

**Goal**: Improve based on real-world usage.

### Iteration Triggers

- User feedback on token usage
- Performance issues in specific agents
- New use cases discovered
- Better patterns identified

### Optimization Strategies

1. **Compress Further**: Remove unnecessary words
2. **Restructure**: Move content between loading levels
3. **Split Skills**: Break large skills into focused ones
4. **Add Automation**: Move manual steps to scripts/

## Common Pitfalls

### Token Wasters

- **Verbose Explanations**: "This pattern is useful because it provides better separation of concerns"
- **Redundant Context**: Same guidance in multiple places
- **Inline Examples**: Large code blocks in SKILL.md
- **Conversational Style**: "Let's implement this feature"

### Structural Issues

- **Overloading SKILL.md**: Everything in one file
- **Missing Resources**: Not using scripts/ for automation
- **Poor Triggers**: Skills that activate too often or never

### Quality Problems

- **Unclear Scope**: Skills that try to do too much
- **Weak Triggers**: Description doesn't match actual usage
- **Inconsistent Style**: Mix of imperative and conversational

## Success Metrics

### Quantitative

- Token consumption per task
- Skill activation accuracy
- User task completion rate
- Context window utilization

### Qualitative

- User feedback on clarity
- Reduction in repetitive questions
- Consistency across team
- Speed of task completion
