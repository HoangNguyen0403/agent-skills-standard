# Resource Organization (Token-Saving Strategy)

Strategic use of directories to maximize token efficiency and context management.

## Three-Level Loading System

```json
Level 1: Metadata (Always) → ~100 words
Level 2: SKILL.md (Triggered) → <500 lines
Level 3: Resources (Lazy) → As needed
```

## Directory Structure & Purpose

### **SKILL.md** (Required)

**Loading Level**: 2 (Triggered)
**Token Budget**: <500 lines
**Purpose**: Core workflow and essential guidance

**Content Strategy**:

- Imperative guidelines (Do this, Don't do that)
- Decision frameworks for complex scenarios
- Links to detailed resources
- Anti-pattern warnings

**Token Optimization**:

- Bullet points over paragraphs (3x density)
- Abbreviations and technical terms
- Minimal explanatory text
- Progressive disclosure links

### **scripts/** (Optional)

**Loading Level**: Never loaded into context
**Token Cost**: $0 (executed, not read)
**Purpose**: Deterministic automation and repetitive tasks

**When to Use**:

- Code generation (boilerplate, CRUD operations)
- Validation and linting
- Format conversion
- API interactions
- Build processes

**Benefits**:

- Zero token consumption
- Consistent, error-free execution
- Faster than manual implementation
- Reusable across projects

**Examples**:

```ts
scripts/
├── generate_component.py    # React component boilerplate
├── validate_openapi.py      # API spec validation
├── migrate_database.py      # Schema migration scripts
└── format_code.py          # Code formatting automation
```

### **references/** (Optional)

**Loading Level**: 3 (Lazy loaded)
**Token Cost**: Variable (loaded on-demand)
**Purpose**: Detailed examples, patterns, and documentation

**When to Use**:

- Complex implementation patterns
- API documentation and schemas
- Step-by-step tutorials
- Error handling examples
- Framework-specific guides

**Organization Patterns**:

```ts
references/
├── patterns.md              # Common implementation patterns
├── examples.md              # Code examples by complexity
├── api-integration.md       # External service integration
├── error-handling.md        # Error scenarios and solutions
└── migration-guide.md       # Version upgrade guides
```

**Loading Strategy**:

- Link from SKILL.md with clear conditions
- "See [patterns.md](patterns.md) for complex scenarios"
- "For API integration: [api-integration.md](api-integration.md)"

### **assets/** (Optional)

**Loading Level**: Never loaded into context
**Token Cost**: $0
**Purpose**: Output templates and boilerplate files

**When to Use**:

- Project templates and starters
- Configuration file templates
- UI component libraries
- Documentation templates
- Icon sets and media assets

**Examples**:

```ts
assets/
├── project-template/        # Full project boilerplate
│   ├── src/
│   ├── package.json
│   └── README.md
├── components/              # Reusable UI components
│   ├── Button.tsx
│   └── Modal.tsx
└── configs/                 # Configuration templates
    ├── eslint.config.js
    └── tsconfig.json
```

## Decision Framework

### Content Placement Guide

| Content Type        | SKILL.md       | references/ | scripts/ | assets/ |
| ------------------- | -------------- | ----------- | -------- | ------- |
| Core workflow       | ✅             | ❌          | ❌       | ❌      |
| Simple examples     | ✅ (<15 lines) | ❌          | ❌       | ❌      |
| Complex patterns    | ❌             | ✅          | ❌       | ❌      |
| API documentation   | ❌             | ✅          | ❌       | ❌      |
| Code generation     | ❌             | ❌          | ✅       | ❌      |
| Project templates   | ❌             | ❌          | ❌       | ✅      |
| Configuration files | ❌             | ❌          | ❌       | ✅      |

### Token Cost Analysis

**High Token Cost (Avoid in SKILL.md)**:

- Large code examples
- Detailed explanations
- API documentation
- Step-by-step tutorials
- Multiple implementation options

**Low Token Cost (OK in SKILL.md)**:

- Imperative instructions
- Decision criteria
- Anti-pattern warnings
- Resource links
- Brief examples

## Implementation Examples

### Flutter State Management Skill

```ts
flutter-state-management/
├── SKILL.md                    # Core patterns, when to use each
├── scripts/
│   ├── generate_bloc.py        # BLoC file generation
│   └── validate_state.py       # State structure validation
├── references/
│   ├── bloc-patterns.md        # Complex BLoC implementations
│   ├── riverpod-examples.md    # Riverpod use cases
│   └── migration-guide.md      # GetX to BLoC migration
└── assets/
    ├── bloc-template/          # BLoC file templates
    └── state-examples/         # Sample state structures
```

### API Integration Skill

```ts
api-integration/
├── SKILL.md                    # Authentication, error handling basics
├── scripts/
│   ├── generate_client.py      # API client code generation
│   └── test_endpoints.py       # Endpoint testing automation
├── references/
│   ├── oauth-flows.md          # Complex auth scenarios
│   ├── error-codes.md          # API error documentation
│   └── rate-limiting.md        # Rate limit handling patterns
└── assets/
    ├── client-template/        # API client boilerplate
    └── postman-collection/     # API testing collections
```

## Validation Checklist

### Structure Validation

- [ ] SKILL.md exists and <500 lines
- [ ] Resources organized by purpose
- [ ] Clear separation of concerns
- [ ] No content duplication

### Token Efficiency

- [ ] scripts/ used for automation
- [ ] references/ for heavy documentation
- [ ] assets/ for templates only
- [ ] SKILL.md contains only essentials

### Loading Strategy

- [ ] Clear links from SKILL.md to resources
- [ ] Lazy loading conditions specified
- [ ] Progressive disclosure implemented
- [ ] Context window limits respected

## Migration Guide

### From Single-File Skills

1. **Extract Core**: Move essential workflow to SKILL.md
2. **Identify Automation**: Move repetitive code to scripts/
3. **Separate Examples**: Move detailed examples to references/
4. **Template Assets**: Move boilerplate to assets/

### From Overloaded SKILL.md

1. **Audit Content**: Identify what's rarely used
2. **Create References**: Move detailed content to references/
3. **Add Scripts**: Convert manual steps to automation
4. **Compress Core**: Reduce SKILL.md to essentials

## Performance Monitoring

### Metrics to Track

- **Token Consumption**: Per skill activation
- **Loading Time**: Time to access resources
- **User Efficiency**: Tasks completed vs time spent
- **Error Rate**: Failed automation attempts

### Optimization Triggers

- SKILL.md > 500 lines → Split to references/
- Frequent manual steps → Create scripts/
- Large template usage → Move to assets/
- Slow activation → Review trigger specificity
