# Turning a Source Into a Spec

Four kinds of input, one rule that outranks all of them: a node earns an `evidence` pointer
or it renders UNVERIFIED. Never fill the field with a plausible-looking path.

## 1. An existing document (Markdown, ASCII art, Confluence)

Most legacy architecture lives as ASCII boxes inside a fenced block. Read it as a graph:

- Each box becomes a node. The box caption becomes `label`; the parenthetical technology
  becomes `sublabel`.
- Each arrow becomes an edge. The text on or beside the arrow becomes the edge `label`; if
  the arrow has no text, find the protocol in the surrounding prose before inventing one.
- Horizontal bands ("CLIENT LAYER", "BACKEND MICROSERVICES") become `layer` values.
  Nested frames ("GKE", "VPC") become `groups`.
- `evidence` is `path:line` of the fence. Cite the line where the box appears, not the
  file as a whole.

A list of eleven service names inside one ASCII box is eleven nodes only if the diagram is
a container view. In a context view it stays one system.

For Confluence, fetch the page and treat its stored diagram or table the same way. Cite the
page id and title, because line numbers do not exist there.

## 2. A codebase, through code-review-graph

Use it to find the real shape rather than the documented one:

- `get_architecture_overview` for the module and community breakdown.
- `list_flows` and `get_flow` for a request path worth drawing as a sequence.
- `query_graph` for callers and callees when deciding whether two boxes really talk.
- `cross_repo_search` when the system spans repositories.

Cite the file and line the graph returns. If a repository has no index, say so in the
report rather than guessing at its internals.

## 3. A prose brief

Legitimate, and the most dangerous. Every node starts UNVERIFIED, and stays that way until
someone points at code or a document. Hand back the diagram with the flags visible and ask
which boxes to confirm. A brief-derived diagram with no UNVERIFIED nodes means the rule
was broken.

## 4. An existing .drawio

For a restyle or a small update. Parse the `mxCell` elements: `value` is the label,
`style` maps back to a kind, `source`/`target` give edges. Re-emit as a spec, then render.
Anything you cannot map to a catalogue kind, raise rather than silently approximate.

Re-rendering discards manual layout done in the draw.io editor. Say so before overwriting
a file someone has hand-tuned.

## Naming

Node ids are short, stable, lowercase slugs (`order`, `sap`, `web`). They appear in every
edge and in review comments, so renaming one churns the whole spec.
