# Static Offline Export

## Overview

The static offline export tool (`scripts/export_html.py`) packages an architecture diagram
into a self-contained local bundle suitable for distribution, offline viewing, and dual-theme
inspection.

The bundle preserves the semantic JSON specification as the sole source of truth and derives
presentation assets without mutating or reinterpreting the model.

```bash
python3 scripts/export_html.py spec.json --output-dir docs/architecture/<slug>-package/ [--manifest view-manifest.json]
```

## Package Structure

The generated output directory contains exactly four files:

1. `spec.json`: Exact byte-for-byte copy of the input specification.
2. `light.drawio`: Stamped editable draw.io XML rendered in the light theme.
3. `dark.drawio`: Stamped editable draw.io XML rendered in the dark theme.
4. `index.html`: Self-contained static HTML page embedding both light and dark PNG images as base64 data URIs.

Separate `.png` files are not published in the final output directory; the images reside directly inside `index.html`.

## Dual-Theme Rendering

Both presentations derive from the exact same spec bytes. The script invokes the shared renderer
for each theme (`light` and `dark`), preserving layout invariants and generating baselines.

In the browser, theme selection is handled entirely via local CSS:
- Automatic detection follows system preference via `@media (prefers-color-scheme: dark)`.
- Manual theme controls (Auto / Light / Dark) use CSS `:checked` states without JavaScript or `<form>` tags.

## Security Contract and Threat Model

The export tool operates under strict local security boundaries:

- **Trusted Ancestors**: All ancestor directories of `--output-dir` must exist, be real directories (not symlinks, accounting deliberately for macOS root aliases `/tmp`, `/var`, `/etc`), be owned by the current user or root (UID 0), and must not be writable by group or other users without the sticky bit (`mode & 0o022`).
- **Private Staging**: Generation, rendering, and Desktop export occur within a private staging directory created with mode `0o700`.
- **No-Clobber Invariant**: The final `--output-dir` must not exist prior to invocation. If `--output-dir` exists (as a file, directory, or symlink), the tool halts immediately with exit code 2 and leaves existing contents untouched.
- **Exclusive Publication**: The final directory is created exclusively with mode `0o700`. Child files are written with `O_CREAT | O_EXCL | O_NOFOLLOW` with mode `0o600`.
- **Publication Sequence & Staging-Only Cleanup**: Child files are published in strict order: `spec.json`, `light.drawio`, `dark.drawio`, and `index.html` last. If any failure occurs during child publication, the staging directory is cleaned, but the incomplete final output directory is retained and reported to stderr. The tool never recursively deletes or unlinks final published files, preventing check-unlink and symlink races.
- **Content Security Policy (CSP)**: `index.html` includes an early, strict CSP meta element:
  ```http
  Content-Security-Policy: default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none';
  ```
- **Escaping & No Active Content**: All spec metadata (titles, scopes, descriptions, labels, citations) are strictly HTML-escaped. Citations are presented as plain text `<code>` elements and are never dereferenced or converted into active hyperlinks. No raw markup, inline SVG, scripts, iframes, forms, or event handlers are generated.
- **PNG Validation**: Exported images are validated for the 8-byte PNG signature (`\x89PNG\r\n\x1a\n`) and positive IHDR dimensions. Any disguised SVG or HTML markup is rejected.
- **Boundary Separation**: HTML CSP does not govern draw.io Desktop. Testing in a network-disabled environment is not proof of CSP enforcement or absence of egress attempts. Browser consumption and Desktop export must be evaluated as separate trust boundaries.

## Manifest Binding

When `--manifest MANIFEST.json` is provided:
1. The manifest must pass canonical validation (`scripts/validate_manifest.py`) with zero errors.
2. The manifest must report zero `review_needed` entries; any required review causes the export to fail.
3. At each canonical view-spec read, the validator records the SHA-256 of the exact bounded bytes it opened, decoded and validated into a per-operation capture map. The export binds only by comparing the selected input spec digest against those captures; it never reads a view file a second time. A view file changed after canonical validation therefore cannot bind, and a selected spec unrelated to the validated captures is rejected.
4. Bounded canonical digest-read exceptions within the manifest root are permitted during validation, but source file contents are never embedded into `index.html`.
5. Captures are operation-local and are consumed only after the complete report passes; canonical `errors` or `review_needed` always reject.

## Exit Codes

| Exit Code | Meaning | Examples |
|-----------|---------|----------|
| `0` | Success | Complete package generated, validated, and published. Qualifies successful command execution for this invocation, not an enduring file-existence or integrity guarantee against external filesystem replacement. |
| `2` | Usage or Prerequisite Gap | Output directory already exists; draw.io Desktop CLI missing (`DrawioNotFound`); spec or manifest path not found; invalid arguments. |
| `1` | Validation, Layout, Export, or I/O Failure | Spec schema error; manifest error or `review_needed`; strict layout finding; draw.io export crash; image validation error; untrusted ancestor; child write error. |

## Delivery Verification

A zero exit code confirms that the script completed its generation and publication sequence. It does not certify that the visual layout is legible or semantically correct. Authors must open `index.html` and visually inspect both light and dark themes at 100% zoom before handoff.
