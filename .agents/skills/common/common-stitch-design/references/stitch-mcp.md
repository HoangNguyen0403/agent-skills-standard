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

## Observed behaviour

- `generate_variants` took about 4 minutes per call; run independent screens in parallel.
- Variant results include generated illustration screens whose `deviceType` is null; filter them out.
- A `TABLET` request returned a screen labelled `DESKTOP` at 2560×2048; confirm the layout on the screenshot.
