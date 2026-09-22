# Diagram Selection Guide

Pick from the message you need to land, not from the diagram you drew last time.

| Message | `type` | Audience |
| :--- | :--- | :--- |
| Who uses this system and what does it depend on | `context` | Everyone |
| What are the deployable parts and what do they run on | `container` | Architects, developers |
| Which modules inside one container own a decision or dependency | `component` | Developers |
| Where does it run: region, cluster, network boundary | `deployment` | Ops, architects |
| How does data travel end to end, including batch and events | `dataflow` | Architects, data |
| What is the exact order of calls in one flow | `sequence` | Developers |
| What states can one entity be in | `state` | Product, developers |
| Which tables exist and how they relate | `erd` | Developers, data |

## Decision tree

1. Mapping the whole ecosystem and its external dependencies? `context`
2. Showing technology choices and deployable units? `container`
3. Showing module boundaries and dependencies inside one container? `component`
4. Explaining where things physically run? `deployment`
5. Following a record through extraction, transformation, and load? `dataflow`
6. Debugging or specifying one request path in order? `sequence`
7. Describing a lifecycle such as order status? `state`
8. Documenting a schema? `erd`, generated from the schema files with `schema_to_spec.py`

## Not covered here

- **Flowcharts and decision trees.** Business logic is not architecture. Use Mermaid inline
  in the document that explains the decision.
- **Design-session artefacts** are drawn here too, not elsewhere;
  `system-design-methodology/references/phase-deliverables.md` says which type at which phase.

## One more level, or one more diagram?

If adding a box would push an executive diagram past twelve nodes, or force two levels of
abstraction into one canvas, draw a second diagram at the lower level and link them. Two
readable diagrams always beat one complete one.
