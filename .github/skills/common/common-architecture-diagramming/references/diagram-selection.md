# Diagram Selection Guide

Pick from the message you need to land, not from the diagram you drew last time.

| Message | `type` | Audience |
| :--- | :--- | :--- |
| Who uses this system and what does it depend on | `context` | Everyone |
| What are the deployable parts and what do they run on | `container` | Architects, developers |
| Where does it run: region, cluster, network boundary | `deployment` | Ops, architects |
| How does data travel end to end, including batch and events | `dataflow` | Architects, data |
| What is the exact order of calls in one flow | `sequence` | Developers |
| What states can one entity be in | `state` | Product, developers |

## Decision tree

1. Mapping the whole ecosystem and its external dependencies? `context`
2. Showing technology choices and deployable units? `container`
3. Explaining where things physically run? `deployment`
4. Following a record through extraction, transformation, and load? `dataflow`
5. Debugging or specifying one request path in order? `sequence`
6. Describing a lifecycle such as order status? `state`

## Not covered here

- **Entity relationship diagrams.** The spec has no ERD layout; generate one from the schema
  and keep it beside the migrations, where it can be regenerated.
- **Flowcharts and decision trees.** Business logic is not architecture. Use Mermaid inline
  in the document that explains the decision.
- **Design-session artefacts** are drawn here too, not elsewhere;
  `system-design-methodology/references/phase-deliverables.md` says which type at which phase.

## One more level, or one more diagram?

If adding a box would push an executive diagram past twelve nodes, or force two levels of
abstraction into one canvas, draw a second diagram at the lower level and link them. Two
readable diagrams always beat one complete one.
