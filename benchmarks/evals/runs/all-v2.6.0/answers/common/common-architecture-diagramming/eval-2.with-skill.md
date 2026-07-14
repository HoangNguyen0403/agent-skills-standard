# Common architecture-diagramming anti-patterns

Avoid these failure modes by keeping every diagram audience-specific, single-purpose, and explicit.

| Anti-pattern | Why it fails | Better practice |
| --- | --- | --- |
| **The “everything” diagram** | Context, containers, database columns, deployment hosts, and runtime details become unreadable and answer no single question. | Split the story into C4 Context, Container, Component, sequence, ERD, or deployment views. |
| **Mixed abstraction levels** | A class next to a database or a cloud VM next to a user makes relationships and ownership ambiguous. | Keep one C4 level per view. A container is a deployable unit; show code details in a separate Component/Code view. |
| **Unlabeled arrows** | The reader cannot tell whether an edge is a request, response, dependency, event, or data transfer. | Label every edge with a verb and, where relevant, a protocol: `calls via HTTPS/JSON`, `writes via SQL`, or `publishes event`. |
| **Ambiguous direction** | Lines that lack a consistent direction make request and data flow difficult to follow. | Use `graph LR` for flow-oriented diagrams or `graph TD` for hierarchy, and explain arrow semantics in the legend. |
| **Mystery shapes or colors** | A reader cannot infer whether a box is a person, internal container, external system, or database. Decorative colors also imply false meaning. | Reuse consistent shapes, use semantic colors, and include a mandatory legend defining shapes, colors, line styles, and arrows. |
| **Undefined acronyms and jargon** | Stakeholders cannot interpret labels such as `RBAC`, `DWH`, or `OCR`, and the diagram becomes audience-hostile. | Spell out acronyms on first use or define them in a note/legend. Prefer plain-language labels. |
| **Orphan or dead-end nodes** | An isolated box may be accidental, obsolete, or a missing relationship; it reduces trust in the model. | Connect every node to the story or remove it. If an interaction is intentionally omitted, state the scope boundary. |
| **Inconsistent styling across views** | The same color or shape means different things in different diagrams, forcing readers to relearn the notation. | Establish a diagram-wide and document-wide visual grammar: person, internal, external, database, sync, and async. |
| **Missing metadata** | Without scope, status, date/version, and author, readers cannot tell what the diagram claims or whether it is current. | Put title, scope, status (`Draft`, `Proposed`, or `Implemented`), date/version, and author beside every diagram or in its containing document. |
| **Audience mismatch** | An executive sees protocol details, or a developer sees only a vague system context and cannot make an implementation decision. | Tailor abstraction to the audience: Context for broad stakeholders, Container/Cloud for architects and operations, Component/ERD for developers and DBAs. |
| **Wrong diagram type** | A flowchart used to explain deployment, or a container view used to explain a race condition, hides the information the reader needs. | Select deliberately: sequence for API timing and race conditions, ERD for data modeling, state for lifecycle, flowchart for decisions, and deployment for infrastructure mapping. |
| **Invisible security or deployment boundaries** | The design does not show where trust changes, where authentication occurs, or where containers run. | Draw relevant VPC, firewall, auth, external-provider, or deployment boundaries. Add a separate deployment view when infrastructure placement matters. |
| **Clutter as a substitute for design** | Too many nodes, crossings, tiny labels, and excessive nesting make the diagram technically complete but operationally useless. | Keep boxes reasonably uniform, preserve whitespace, reduce node count, and create focused companion diagrams when necessary. |

Before publishing, run a checklist: the title and metadata are present; the legend explains every visual convention; scope stays at one level; every arrow is directional and labeled; technologies/protocols are shown where relevant; external systems are distinct; and security boundaries are visible. A diagram that fails these checks should be revised or split before it is used as an architecture source of truth.

