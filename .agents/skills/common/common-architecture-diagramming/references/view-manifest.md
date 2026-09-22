# View Manifest (v1.0)

Use a manifest when two or more specs describe the same design at different scopes. Each
referenced spec remains the semantic source for its own view; the manifest checks contracts,
canonical identity, relationship coverage, refinement, ownership, and bounded local evidence.

## Schema

```json
{
  "version": "1.0",
  "regeneration": {
    "authority": "spec",
    "presentation": "drawio",
    "export": "image",
    "manual_edits": "protect"
  },
  "sources": [
    {
      "id": "orders-api",
      "path": "evidence/orders_api.py",
      "revision": "synthetic-fixture-v1",
      "digest": "sha256:<64 lowercase hex chars>"
    }
  ],
  "views": [
    {
      "id": "components",
      "spec": "components.spec.json",
      "scope": ["orders.api", "orders.system"],
      "relationships": ["orders.api-writes-orders"]
    }
  ]
}
```

`views[].spec` and `sources[].path` are relative paths from the manifest directory. The validator
uses that directory as the caller-declared trust boundary, opens it once, and traverses every
child directory with descriptor-relative `O_DIRECTORY|O_NOFOLLOW` opens. The final file is opened
with `O_NOFOLLOW|O_NONBLOCK`, checked as regular, and read through that same descriptor; it never
resolves a path and then reopens it. Absolute paths, URLs, `..` segments, symlink components,
path loops, FIFOs, directories, and other non-ordinary files are rejected. Unsupported secure
directory facilities are rejected rather than handled through an insecure fallback. The 1 MiB
limit is enforced while reading.

Every manifest-participating spec must pass the complete `view` contract, regardless of diagram
type. The contract records `question`, `decision`, `scenario`, `invariant`, `status`, `evidence`,
and `omissions`. Every node and edge then carries explicit identity, lifecycle, confidence, and,
when cited, source-kind fields as required by [diagram-spec.md](diagram-spec.md). ERD entities and
relations follow the same rules.

## Source captures

`sources[]` is an allowlist of local source records. Each record captures the source path, a
caller-supplied revision string, and the actual SHA-256 digest at capture time. A citation such as
`evidence/orders_api.py:6` must resolve to an allowlisted source record. The cited item’s
`evidence_revision` and `evidence_digest` must match that source record.

The validator hashes each allowlisted file through the same bounded ordinary-file reader. A
missing, inaccessible, oversized, non-ordinary, or changed source produces `review-needed` rather
than a false claim that the design or production system has drifted. A missing, unsafe, oversized,
or malformed referenced spec is an error. Evidence is compared by source record, not by canonical
element identity; two elements may cite the same source capture, and one element may not silently
substitute a different source capture.

## Identity, refinement, and ownership

Nodes use stable canonical identities such as `orders.api`, not labels that change during a redraw.
`refines` lists canonical identities at a broader scope. `owner` names the canonical identity that
owns the element. References must resolve somewhere in the manifest. Refinement and ownership
cycles are invalid. Malformed identity/refinement/owner values are reported as validation errors,
never treated as ancestry.

Edges use a canonical relationship `identity`. `views[].relationships` is the expected relationship
set for that view; an absent edge is an error even when all endpoint nodes exist. If a relationship
identity appears in more than one scoped view, direction must remain consistent. Endpoint pairs may
be equal or an actual ancestor/descendant refinement; sibling nodes that merely share an ancestor do
not satisfy consistency.

## Regeneration authority

The JSON spec is authoritative. Draw.io is an editable presentation and the image is an export
copy. Generated XML stores a canonical `data-generated-sha256` baseline. Regeneration compares the
existing file with its own prior baseline, so normal spec changes are allowed; hand mutation is
preserved and refused unless explicitly acknowledged after returning semantic changes to the spec.

The manifest’s exact regeneration block makes this policy reviewable. The manifest does not claim
that a draw.io file is deployable evidence and does not add a second renderer.

## CLI

```text
python3 scripts/validate_manifest.py path/to/view-manifest.json
```

Exit `0` means no errors or review findings, `1` means invalid specs/links/relationships, and `2`
means the manifest is structurally valid but source captures need review. Output prefixes those
findings with `review-needed:` so callers do not confuse them with runtime drift.
