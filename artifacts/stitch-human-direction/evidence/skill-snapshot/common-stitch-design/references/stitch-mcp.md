# Stitch MCP

## Setup

1. Stitch → profile picture → **Stitch settings** → **API key** → **Create key**. Store it outside git.
2. Remote HTTP server `https://stitch.googleapis.com/mcp`, header `X-Goog-Api-Key: <key>`.

omp (`.omp/mcp.json` or `~/.omp/agent/mcp.json`; `${VAR}` expands from the environment):

```json
{
  "mcpServers": {
    "stitch": {
      "type": "http",
      "url": "https://stitch.googleapis.com/mcp",
      "headers": { "X-Goog-Api-Key": "${STITCH_API_KEY}" }
    }
  }
}
```

Claude Code: `claude mcp add --transport http stitch https://stitch.googleapis.com/mcp --header "X-Goog-Api-Key: $STITCH_API_KEY"`

Codex (`~/.codex/config.toml`):

```toml
[mcp_servers.stitch]
url = "https://stitch.googleapis.com/mcp"
env_http_headers = { "X-Goog-Api-Key" = "STITCH_API_KEY" }
```

Verify: restart the agent, ask "List my Stitch projects".

## Tools

| Tool | Writes | Notes |
| --- | --- | --- |
| `list_projects`, `get_project` | no | `get_project` returns screen instances needed by `apply_design_system` |
| `list_screens`, `get_screen` | no | `projectId` without `projects/`; `get_screen` takes the full resource name |
| `list_design_systems` | no | returns `assets/<id>` names and `theme.designMd` |
| `generate_screen_from_text` | adds | `deviceType`: `MOBILE`, `TABLET`, `DESKTOP` |
| `generate_variants` | adds | `variantOptions.creativeRange`: `REFINE`, `EXPLORE`, `REIMAGINE`; `variantCount` 1-5; `aspects` |
| `edit_screens` | changes selected screens | use on variants, not originals |
| `create_design_system`, `update_design_system` | adds / changes | update only the asset you just created unless approved |
| `upload_design_md`, `create_design_system_from_design_md` | adds | base64 path; `theme.designMd` string is simpler |
| `apply_design_system` | changes screens | needs instance ids from `get_project` |
| `create_project`, `delete_project` | adds / destroys | delete needs explicit approval |

## Screen payload

- `screenshot.downloadUrl`: image base URL; append `=w390` for phone, `=w1280` for tablet or desktop.
- `htmlCode.downloadUrl`: signed URL; fetch with redirects followed.
- `deviceType`, `width`, `height`, `title`, `prompt`, `theme`.
- Generation results arrive as `outputComponents[]` with `design.screens[]`, `text`, and `suggestion`. Surface `text` and `suggestion` to the user.

## Bounded image review

1. Read screen metadata and HTML first. Fetch signed screenshot URLs to files without opening or attaching the images; URL width suffixes are optional and do not prove either dimension. Keep the downloaded original unchanged.
2. Check decoded dimensions, then make and verify an aspect-preserving preview before the first image read:

   ```sh
   original="/path/to/screenshot.webp"
   preview="/path/to/screenshot-preview.png"
   sips -g pixelWidth -g pixelHeight "$original"
   sips -s format png -Z 1600 "$original" --out "$preview"
   sips -g pixelWidth -g pixelHeight "$preview"
   ```

   `-Z 1600` bounds the longest edge; `-s format png` makes a WebP input actually produce PNG output. Keep the original unchanged. If ImageMagick is installed, use `magick "$original" -resize '1600x1600>' "$preview"` for raster input, then verify with `magick identify "$preview"`. For SVG, inspect source as text first; rasterize only to a bounded output, e.g. `magick -background white "$svg" -resize '1600x1600>' "$preview"`, then verify dimensions before reading it; set `$preview` to a `.png` path.
3. For browser capture, inspect viewport CSS width/height and `devicePixelRatio` before taking a screenshot. Bound both physical dimensions (`CSS dimension × DPR`) to <=1600 px; equivalently, the longest CSS edge must be at most `floor(1600 / devicePixelRatio)`. This is a conservative workflow budget, not a guaranteed model limit. At DPR 1.8257, 1280×801 produces about 2337×1463 px and exceeds the budget, while 800×600 produces about 1463×1096 px (observed non-full-page capture: 1462×1096). Capture the viewport, never `fullPage`. For tall pages, read one bounded overview and separate bounded section/viewport captures. Verify file dimensions before reading if saved to disk. A tool that directly returns an image must be bounded before invocation; instructions cannot intercept an already-delivered result.
4. Before generation, edits, or variants, check documented tool response behavior. If a call can embed an oversized image, use only an actually documented host resize or text-only route; do not invent parameters or claim prompt text controls output size. If no supported route exists, stop before calling it. If a response is rejected after a write call, inspect returned IDs and `get_screen`/screen metadata for completed output before retrying; never blindly repeat a write.

## OMP image recovery

- Query advertised host commands (`get_available_commands`) before invoking a slash command. A retry or resize prompt cannot remove an image already retained in conversation context. `/shake images` is a local OMP context cleanup that strips conversation image blocks; it removes all such blocks, not only the failing image. Save/preserve source screenshots on disk first. Reload and re-read the corrected skill after recovery.
- `/compact` may retain recent images or reject the same media; it is not a guaranteed repair. `/help` is not advertised by OMP RPC and previously fell through to the model; do not assume slash-command support.
- If image cleanup is unavailable, use a supported rewind/removal/reset that preserves text and files. Never silently delete/replace the session, switch models, or edit raw session JSONL.


## Observed behaviour

- `generate_variants` took about 4 minutes per call; run independent screens in parallel.
- Variant results include generated illustration screens whose `deviceType` is null; filter them out.
- A `TABLET` request returned a screen labelled `DESKTOP` at 2560×2048; confirm the layout on the screenshot.
