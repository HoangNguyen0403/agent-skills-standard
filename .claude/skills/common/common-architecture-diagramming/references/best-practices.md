# Architecture Diagramming Best Practices

Synthesized from industry expert guidelines (AWS, C4 Model, InfoQ, Mural).

## 1. Core Principles

### "One Diagram, One Story"

- **Don't try to model the entire system in a single diagram.** It leads to "ugly," unreadable messes.
- **Use Abstraction Layers:** Follow the C4 model (Context -> Container -> Component) to separate concerns. Each diagram should answer a specific set of questions for a specific audience.

### Audience-Centric Design

- **Know your viewer:**
  - _Executives/Product_: High-level Context diagrams (System boundaries, user interactions).
  - _Architects/Leads_: Container/Cloud Architecture diagrams (Technology choices, protocols).
  - _Developers_: Component/ERD diagrams (Code structure, database schema).
- **Avoid jargon:** If you must use acronyms (e.g., "RBAC", "OCR"), define them in a legend or note.

## 2. Visual Governance (The "No Ugly Diagrams" Rule)

### Consistency is King

- **Shapes:** Use the same shape for the same concept across all diagrams (e.g., Cylinder = Database, Person shape = User).
- **Colors:** Use colors semantically, not decoratively.
  - _Example:_ Blue = Internal System, Grey = External System, Green = User.
  - _Anti-pattern:_ Using random colors just to make it "pop".
- **Size:** Keep boxes relatively uniform unless size conveys meaning (e.g., nesting).

### The Legend is Mandatory

- **Never assume the reader knows your notation.**
- **Every diagram must have a Legend** defining:
  - Box shapes (Container vs System).
  - Line styles (Solid = Synchronous, Dashed = Async/Message Bus).
  - Arrow meaning (Data Flow vs Dependency).
  - Color meanings.

### Layout & Flow

- **Direction:** Standardize on **Left-to-Right (LR)** or **Top-Down (TD)**.
  - _LR_ is often better for data flow and wide infrastructure diagrams.
  - _TD_ is better for hierarchies and component breakdowns.
- **Whitespace:** Leave breathing room. Crowded diagrams imply a lack of clarity in the system design itself.

## 3. Semantics & Notation

### Explaining Lines & Arrows

- **Label every edge.** An arrow without a label is ambiguous.
- **Be specific:**
  - _Bad:_ "Talks to"
  - _Good:_ "HTTPS/JSON", "gRPC", "Pub/Sub"
- **Directionality:**
  - _Dependency:_ "A depends on B" (usually points to the dependency).
  - _Data Flow:_ "A sends data to B" (points to B).
  - _Clarify this in the legend._

### Handling Metadata

Every diagram (or the document containing it) must state:

- **Scope:** What is shown?
- **Status:** Draft, Proposed, or Implemented?
- **Date/Version:** When was this accurate?

## 4. Anti-Patterns to Avoid

- **The "Orphan" Box:** Every node must be connected to something. If it's isolated, why is it there?
- **The "Everything" Diagram:** Mixing physical server details (RAM/CPU) with high-level user flows.
- **The "Mystery Acronym":** Using "PIMS" or "DWH" without definition.
- **Inconsistent Abstraction:** Showing a "Database" box next to a "Class" box. Keep abstraction levels consistent.
