# Style Catalog

`STYLE_CATALOG` in `scripts/style_catalog.py` is the single source of truth (re-exported from
`render_drawio.py`). This page explains what the entries mean and how to add one.

## Where the style strings come from

C4 fills and strokes are the official palette from draw.io's own C4 shape library
(`Sidebar-C4.js`): internal blues, grey-purple for external, white text.

GCP icons come from the `gcp2` stencil shipped inside draw.io Desktop. Two traps:

- **Kubernetes Engine is filed as `container_engine`**, its 2018 product name. There is no
  `gcp2.kubernetes_engine`, and no `gcp2.cloud_run` at all — use a plain `container` for
  Cloud Run, or add a modern stencil name only after verifying it exists.
- Verify any new name against the installed bundle before using it. An unknown shape name
  renders as a blank rectangle with no error:

```bash
grep -ao "mxgraph\.gcp2\.[a-z_0-9]*" \
  "/Applications/draw.io.app/Contents/Resources/app.asar" | sort -u
```

AWS icons come from the `aws4` stencil set, the current one. Every `aws:*` kind uses
`shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.<name>`, and each name was checked
against the bundle:

```bash
grep -ao "mxgraph\.aws4\.[a-z_0-9]*" "/Applications/draw io.app/Contents/Resources/app.asar" | sort -u
```

## Azure and other clouds

draw.io Desktop ships only the 2014 `mxgraph.azure` stencils: no App Service, Functions,
Cosmos DB, AKS, or Front Door. Rather than a wrong or dated logo, every cloud without a
verified modern set uses the vendor-neutral `cloud:*` kinds, drawn in a managed fill with the
vendor named in `sublabel` (`"Azure App Service"`, `"Cloudflare R2"`). The legend then reads
"Managed compute (vendor in label)".

## Kinds

| Kind | Shape | Use for |
|---|---|---|
| `person` | C4 person, dark blue | A human role, not a job title |
| `system` | Rounded box, blue | The system this diagram is about |
| `system-ext` | Rounded box, grey-purple | A system someone else owns |
| `container` | Rounded box, light blue | A separately deployable unit |
| `component` | Rounded box, pale blue | A module inside one container |
| `db` / `cache` | Cylinder | A store you run |
| `queue` | Direct-data shape | A topic or queue |
| `saas` | White box, grey border | A third-party service |
| `gcp:*` | Official GCP icon | Managed GCP infrastructure |
| `aws:*` | Official AWS icon | Managed AWS infrastructure |
| `cloud:*` | C4 shape, managed fill | Any other vendor's managed service, vendor in `sublabel` |
| `entity` | Header + one row per column | A table in an `erd` |
| `participant` | Flat box | Sequence lifeline head |
| `start` / `state` / `end` | Circle / pill / double circle | State machine |

## Adding a kind

1. Verify the shape name renders (grep above, then export a one-box test file).
2. Add an entry with `style`, `w`, `h`, `legend`, and a default `layer`; an icon whose label
   sits under the shape also needs `label_h` and `label_w` so the layout reserves the room.
3. `legend` is what a non-engineer reads, so write "Cloud SQL", not `gcp:cloud-sql`.
4. Add a renderer test asserting the style reaches the cell.

Sizes matter: GCP icons are 66×58 with the label underneath, so they need more vertical
room than a 180×80 box. The layout centres each shape in its grid cell using these numbers.
