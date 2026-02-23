# Diagram Selection Guide

| Diagram Type              | Best For...                                      | Audience         | Tool/Syntax               |
| :------------------------ | :----------------------------------------------- | :--------------- | :------------------------ |
| **C4 Context**            | High-level system boundaries & actors.           | All Stakeholders | Mermaid `C4Context`       |
| **C4 Container**          | Tech stack & high-level architecture.            | Architects, Devs | Mermaid `C4Container`     |
| **SEQUENCE**              | Complex logic steps, API calls, race conditions. | Devs, Architects | Mermaid `sequenceDiagram` |
| **ERD** (Entity Relation) | Database schema, data modeling.                  | Devs, DBA        | Mermaid `erDiagram`       |
| **STATE**                 | Lifecycle of an entity (e.g., Order Status).     | Product, Devs    | Mermaid `stateDiagram-v2` |
| **FLOWCHART**             | Decision trees, user flows, business logic.      | PM, Devs         | Mermaid `graph TD`        |
| **DEPLOYMENT**            | Server/Cloud infrastructure mapping.             | DevOps           | Mermaid `C4Deployment`    |

## Decision Tree

1. **Mapping the entire ecosystem?** -> `C4 Context`
2. **Showing technical building blocks?** -> `C4 Container`
3. **Debugging a specific API flow?** -> `Sequence Diagram`
4. **Designing a database?** -> `ERD`
5. **Tracking an item's status changes?** -> `State Diagram`
6. **Explaining "If X then Y"?** -> `Flowchart`
