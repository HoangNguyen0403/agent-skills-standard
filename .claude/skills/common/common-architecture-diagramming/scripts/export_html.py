#!/usr/bin/env python3
"""Export a diagram spec to a self-contained, offline static viewing package.

Validates the input spec, renders coordinated light and dark draw.io files,
exports PNGs via draw.io Desktop, and generates a secure static HTML page embedding
the PNGs as data URIs. No active scripts, external resources, or raw markup are permitted.

Usage:
    python3 export_html.py SPEC.json --output-dir DIRECTORY [--manifest MANIFEST.json]
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import html
import json
import os
import shutil
import struct
import sys
import tempfile
from pathlib import Path
from typing import Any

# Ensure local script directory is in sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import check_layout
import export_drawio
import render_drawio
import validate_manifest
import validate_spec

CSP_HEADER = (
    "default-src 'none'; "
    "img-src data:; "
    "style-src 'unsafe-inline'; "
    "script-src 'none'; "
    "connect-src 'none'; "
    "base-uri 'none'; "
    "form-action 'none';"
)

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
DISALLOWED_IMAGE_MARKERS = (b"<svg", b"<?xml", b"<html", b"<!doctype")


class ExportError(Exception):
    """An error that should produce exit code 1."""


class PrerequisiteError(Exception):
    """A missing prerequisite, usage, or existing path error that should produce exit code 2."""


def check_trusted_ancestors(target_dir: Path) -> None:
    """Verify that target_dir does not exist and its existing ancestors are trusted directories.

    Preserves original path components to test for un-followed symlinks.
    Ancestors must:
    - Exist and be directories
    - Not be symlinks (accounting deliberately for macOS root aliases /tmp, /var, /etc)
    - Be owned by the current UID or root (UID 0)
    - Not be world-writable (unless sticky bit is set, e.g. /tmp)
    - Not be group-writable by an untrusted foreign group
    """
    abs_target = target_dir.absolute()
    current = abs_target.parent

    visited: set[Path] = set()
    while True:
        if current in visited:
            break
        visited.add(current)

        if os.path.islink(current):
            is_macos_system_alias = False
            if sys.platform == "darwin":
                try:
                    target_link = os.readlink(current)
                    if (str(current) == "/tmp" and target_link in ("private/tmp", "/private/tmp")) or \
                       (str(current) == "/var" and target_link in ("private/var", "/private/var")) or \
                       (str(current) == "/etc" and target_link in ("private/etc", "/private/etc")):
                        is_macos_system_alias = True
                except OSError:
                    pass
            if not is_macos_system_alias:
                raise ExportError(f"Ancestor directory {current} is a symlink")

        if not os.path.isdir(current):
            raise ExportError(f"Ancestor directory {current} is not a directory")

        try:
            st = os.stat(current)
        except OSError as err:
            raise ExportError(f"Cannot stat ancestor directory {current}: {err}") from err

        current_uid = os.getuid() if hasattr(os, "getuid") else 0
        if st.st_uid != current_uid and st.st_uid != 0:
            raise ExportError(
                f"Ancestor directory {current} is not owned by current user (UID {current_uid}) or root"
            )

        # Check permissions: reject non-sticky ancestors writable by group OR other (mode & 0o022)
        if (st.st_mode & 0o022) != 0 and (st.st_mode & 0o1000) == 0:
            raise ExportError(
                f"Ancestor directory {current} is writable by group or other without sticky bit (mode {oct(st.st_mode)})"
            )
        parent = current.parent
        if parent == current:
            break
        current = parent


def render_theme(spec: dict[str, Any], mode: str) -> str:
    """Render draw.io XML for a specific theme mode via settled shared interface."""
    return render_drawio.render(spec, theme=mode)


def validate_png_bytes(data: bytes, label: str) -> tuple[int, int]:
    """Validate PNG signature, check for positive dimensions, and reject disguised SVG/HTML."""
    if not data.startswith(PNG_SIGNATURE):
        raise ExportError(f"{label} has invalid PNG signature (disguised or corrupt image)")

    prefix = data[:1024].lower()
    for marker in DISALLOWED_IMAGE_MARKERS:
        if marker in prefix:
            raise ExportError(f"{label} contains disallowed markup marker ({marker.decode()}); rejected")

    if len(data) < 24:
        raise ExportError(f"{label} truncated (less than 24 bytes)")

    chunk_type = data[12:16]
    if chunk_type != b"IHDR":
        raise ExportError(f"{label} missing initial IHDR chunk")

    width, height = struct.unpack(">II", data[16:24])
    if width <= 0 or height <= 0:
        raise ExportError(f"{label} has non-positive dimensions ({width}x{height})")

    return width, height


def validate_and_bind_manifest(manifest_path: Path, selected_spec_bytes: bytes) -> str:
    """Validate manifest canonically and bind the selected SPEC to a captured view digest.

    The canonical validator records a digest of the exact bounded view-spec bytes it opened
    and validated. Binding compares the selected input digest against those captures, so no
    view file is read a second time and bytes swapped after canonical validation cannot bind.
    """
    root = manifest_path.parent
    root_fd: int | None = None
    try:
        root_fd = validate_manifest._open_manifest_root(root)
        manifest_data = validate_manifest._read_json_from_root(root_fd, (manifest_path.name,))
        captures: dict[str, str] = {}
        report = validate_manifest._validate_manifest_data(
            manifest_data, root, root_fd, captures=captures
        )
        if report.errors:
            raise ExportError(f"manifest validation failed: {'; '.join(report.errors)}")
        if report.review_needed:
            raise ExportError(f"manifest rejected: review_needed reported ({'; '.join(report.review_needed)})")

        selected_digest = "sha256:" + hashlib.sha256(selected_spec_bytes).hexdigest()
        for view_id, captured_digest in captures.items():
            if captured_digest == selected_digest:
                return f"{manifest_path.name} (view: {view_id})"

        raise ExportError(
            "manifest rejected: does not contain a validated view matching the selected spec bytes"
        )
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError) as err:
        raise ExportError(f"manifest processing error: {err}") from err
    finally:
        validate_manifest._close_fd(root_fd)


def write_all_bytes(fd: int, payload: bytes) -> None:
    """Write complete payload to fd in a loop, preventing short writes."""
    total_written = 0
    length = len(payload)
    while total_written < length:
        n = os.write(fd, payload[total_written:])
        if n == 0:
            raise OSError("zero bytes written during child publication")
        total_written += n


def build_html_page(
    spec: dict[str, Any],
    source_digest: str,
    light_png_bytes: bytes,
    dark_png_bytes: bytes,
    manifest_id: str | None = None,
) -> str:
    """Build the self-contained static HTML page with strict CSP and escaped content."""
    title_raw = spec.get("title", "Architecture Diagram")
    title_esc = html.escape(str(title_raw), quote=True)
    scope_esc = html.escape(str(spec.get("scope", "")), quote=True)
    type_esc = html.escape(str(spec.get("type", "")), quote=True)
    audience_esc = html.escape(str(spec.get("audience", "")), quote=True)
    version_esc = html.escape(str(spec.get("version", "1.0")), quote=True)
    date_esc = html.escape(str(spec.get("date", "")), quote=True)
    digest_esc = html.escape(source_digest, quote=True)

    light_b64 = base64.b64encode(light_png_bytes).decode("ascii")
    dark_b64 = base64.b64encode(dark_png_bytes).decode("ascii")

    # Legend summary: count nodes by kind
    nodes = spec.get("nodes") or []
    edges = spec.get("edges") or []

    kind_counts: dict[str, int] = {}
    for n in nodes:
        k = str(n.get("kind", "unknown"))
        kind_counts[k] = kind_counts.get(k, 0) + 1

    legend_items_html = []
    for kind, count in sorted(kind_counts.items()):
        k_esc = html.escape(kind, quote=True)
        legend_items_html.append(f"<li><span class=\"badge\">{k_esc}</span>: {count}</li>")
    legend_html = "\n".join(legend_items_html) if legend_items_html else "<li>None</li>"

    # Evidence summary: count confidence levels and list citations safely as plain text
    confidence_counts: dict[str, int] = {}
    citations: list[str] = []
    for item in nodes + edges:
        conf = str(item.get("evidence_confidence", "unspecified"))
        confidence_counts[conf] = confidence_counts.get(conf, 0) + 1
        ev = item.get("evidence")
        if ev and isinstance(ev, str):
            citations.append(ev)

    evidence_summary_html = []
    for conf, count in sorted(confidence_counts.items()):
        c_esc = html.escape(conf, quote=True)
        evidence_summary_html.append(f"<li><strong>{c_esc}</strong>: {count}</li>")
    evidence_counts_html = "\n".join(evidence_summary_html) if evidence_summary_html else "<li>None</li>"

    # Format citations as plain text entries (never active links)
    citation_items_html = []
    for cit in sorted(set(citations)):
        cit_esc = html.escape(cit, quote=True)
        citation_items_html.append(f"<code>{cit_esc}</code>")
    citations_html = ", ".join(citation_items_html) if citation_items_html else "None"

    # View contract details if present (accepts both spec['view'] and spec['view_contract'])
    view_section = ""
    view_contract = spec.get("view") or spec.get("view_contract")
    if isinstance(view_contract, dict):
        q = html.escape(str(view_contract.get("question", "")), quote=True)
        dec = html.escape(str(view_contract.get("decision", "")), quote=True)
        scen = html.escape(str(view_contract.get("scenario", "")), quote=True)
        inv = html.escape(str(view_contract.get("invariant", "")), quote=True)
        st = html.escape(str(view_contract.get("status", "")), quote=True)
        ev = html.escape(str(view_contract.get("evidence", "")), quote=True)
        omissions = view_contract.get("omissions") or []
        omissions_esc = ", ".join(html.escape(str(o), quote=True) for o in omissions)

        dl_items = [
            f"<dt>Status</dt><dd>{st}</dd>",
            f"<dt>Question</dt><dd>{q}</dd>",
            f"<dt>Decision</dt><dd>{dec}</dd>",
            f"<dt>Scenario</dt><dd>{scen}</dd>",
            f"<dt>Invariant</dt><dd>{inv}</dd>",
        ]
        if ev:
            dl_items.append(f"<dt>Evidence</dt><dd><code>{ev}</code></dd>")
        if omissions_esc:
            dl_items.append(f"<dt>Omissions</dt><dd>{omissions_esc}</dd>")

        view_section = f"""
    <section class="meta-section">
      <h2>View Contract</h2>
      <dl>
        {''.join(dl_items)}
      </dl>
    </section>
"""

    manifest_badge = ""
    if manifest_id:
        m_esc = html.escape(manifest_id, quote=True)
        manifest_badge = f"<dt>Manifest</dt><dd><code>{m_esc}</code></dd>"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="{CSP_HEADER}">
  <title>{title_esc} — Offline Architecture Package</title>
  <style>
    :root {{
      --bg: #ffffff;
      --text: #1f2937;
      --card-bg: #f9fafb;
      --border: #e5e7eb;
      --accent: #2563eb;
      --code-bg: #f3f4f6;
    }}
    @media (prefers-color-scheme: dark) {{
      :root {{
        --bg: #111827;
        --text: #f9fafb;
        --card-bg: #1f2937;
        --border: #374151;
        --accent: #3b82f6;
        --code-bg: #374151;
      }}
    }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }}
    header {{
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 16px;
    }}
    h1 {{
      margin: 0 0 8px 0;
      font-size: 1.75rem;
    }}
    .metadata-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-top: 12px;
      background: var(--card-bg);
      padding: 12px 16px;
      border-radius: 6px;
      border: 1px solid var(--border);
    }}
    .metadata-grid > *,
    .details-grid > * {{
      min-width: 0;
    }}
    .metadata-grid dd,
    .details-grid dd,
    .details-grid p {{
      overflow-wrap: anywhere;
    }}
    dl {{
      margin: 0;
    }}
    dt {{
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.75;
    }}
    dd {{
      margin: 0 0 8px 0;
      font-weight: 500;
    }}
    code {{
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.85em;
      background: var(--code-bg);
      padding: 2px 4px;
      border-radius: 4px;
    }}
    .theme-selection-bar {{
      margin: 20px 0;
    }}
    .theme-radio {{
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
      pointer-events: none;
    }}
    .theme-controls {{
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }}
    .control-label {{
      font-weight: 600;
      margin-right: 4px;
    }}
    .theme-label {{
      cursor: pointer;
      font-size: 0.9rem;
      padding: 6px 14px;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--card-bg);
      color: var(--text);
      user-select: none;
      transition: background 0.15s, border-color 0.15s;
    }}
    .theme-label:hover {{
      border-color: var(--accent);
    }}
    #theme-auto:focus-visible ~ .theme-controls #label-theme-auto,
    #theme-light:focus-visible ~ .theme-controls #label-theme-light,
    #theme-dark:focus-visible ~ .theme-controls #label-theme-dark {{
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }}
    #theme-auto:checked ~ .theme-controls #label-theme-auto,
    #theme-light:checked ~ .theme-controls #label-theme-light,
    #theme-dark:checked ~ .theme-controls #label-theme-dark {{
      background: var(--accent);
      color: #ffffff;
      border-color: var(--accent);
      font-weight: 600;
    }}
    .diagram-viewport {{
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      background: var(--card-bg);
      display: flex;
      justify-content: center;
      overflow: auto;
    }}
    .diagram-img {{
      max-width: 100%;
      height: auto;
      display: block;
    }}
    /* Default Auto: follows prefers-color-scheme */
    #theme-auto:checked ~ .diagram-viewport .img-light {{ display: block; }}
    #theme-auto:checked ~ .diagram-viewport .img-dark {{ display: none; }}
    @media (prefers-color-scheme: dark) {{
      #theme-auto:checked ~ .diagram-viewport .img-light {{ display: none; }}
      #theme-auto:checked ~ .diagram-viewport .img-dark {{ display: block; }}
    }}
    /* Explicit Light override */
    #theme-light:checked ~ .diagram-viewport .img-light {{ display: block !important; }}
    #theme-light:checked ~ .diagram-viewport .img-dark {{ display: none !important; }}
    /* Explicit Dark override */
    #theme-dark:checked ~ .diagram-viewport .img-light {{ display: none !important; }}
    #theme-dark:checked ~ .diagram-viewport .img-dark {{ display: block !important; }}

    .details-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin-top: 24px;
    }}
    .meta-section {{
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 16px;
    }}
    .meta-section h2 {{
      margin-top: 0;
      font-size: 1.1rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
    }}
    ul {{
      margin: 0;
      padding-left: 20px;
    }}
    .badge {{
      display: inline-block;
      font-weight: 600;
    }}
  </style>
</head>
<body>
  <header>
    <h1>{title_esc}</h1>
    <div class="metadata-grid">
      <dl>
        <dt>Scope</dt><dd>{scope_esc}</dd>
        <dt>Type</dt><dd>{type_esc}</dd>
      </dl>
      <dl>
        <dt>Audience</dt><dd>{audience_esc}</dd>
        <dt>Version / Date</dt><dd>{version_esc} ({date_esc})</dd>
      </dl>
      <dl>
        <dt>Source Digest</dt><dd><code>{digest_esc}</code></dd>
        {manifest_badge}
      </dl>
    </div>
  </header>

  <div class="theme-selection-bar">
    <input type="radio" id="theme-auto" name="theme-select" class="theme-radio" checked>
    <input type="radio" id="theme-light" name="theme-select" class="theme-radio">
    <input type="radio" id="theme-dark" name="theme-select" class="theme-radio">

    <div class="theme-controls" role="radiogroup" aria-label="Diagram theme">
      <span class="control-label">Theme:</span>
      <label for="theme-auto" class="theme-label" id="label-theme-auto">Auto (System)</label>
      <label for="theme-light" class="theme-label" id="label-theme-light">Light</label>
      <label for="theme-dark" class="theme-label" id="label-theme-dark">Dark</label>
    </div>

    <div class="diagram-viewport">
      <img class="diagram-img img-light" src="data:image/png;base64,{light_b64}" alt="{title_esc} (Light theme)">
      <img class="diagram-img img-dark" src="data:image/png;base64,{dark_b64}" alt="{title_esc} (Dark theme)">
    </div>
  </div>

  <div class="details-grid">
    <section class="meta-section">
      <h2>Diagram Elements</h2>
      <ul>
        {legend_html}
      </ul>
    </section>

    <section class="meta-section">
      <h2>Evidence &amp; Confidence</h2>
      <ul>
        {evidence_counts_html}
      </ul>
      <p style="margin-top: 12px; font-size: 0.9rem;">
        <strong>Citations:</strong> {citations_html}
      </p>
    </section>

    {view_section}
  </div>
</body>
</html>
"""


def export_package(
    spec_path: str | Path,
    output_dir: str | Path,
    manifest_path: str | Path | None = None,
) -> int:
    """Execute the full static export sequence per SRS LLD-002."""
    spec_path = Path(spec_path)
    output_dir = Path(output_dir)

    # 1. Prerequisite check: spec file must exist
    if not spec_path.exists() or not spec_path.is_file():
        sys.stderr.write(f"prerequisite error: spec file not found: {spec_path}\n")
        return 2

    # 2. Prerequisite check: output path must not exist (including symlinks)
    if os.path.lexists(output_dir):
        sys.stderr.write(f"prerequisite error: output directory already exists: {output_dir}\n")
        return 2

    # 3. Check trusted ancestor directories
    try:
        check_trusted_ancestors(output_dir)
    except ExportError as err:
        sys.stderr.write(f"security error: {err}\n")
        return 1

    # 4. Read single exact spec byte source and calculate digest
    try:
        spec_bytes = spec_path.read_bytes()
    except OSError as err:
        sys.stderr.write(f"I/O error reading spec: {err}\n")
        return 1

    spec_digest = "sha256:" + hashlib.sha256(spec_bytes).hexdigest()

    try:
        spec = json.loads(spec_bytes.decode("utf-8"))
    except Exception as err:
        sys.stderr.write(f"invalid JSON in spec: {err}\n")
        return 1

    if not isinstance(spec, dict):
        sys.stderr.write("invalid spec: root must be a JSON object\n")
        return 1

    errors = validate_spec.validate(spec)
    if errors:
        sys.stderr.write(f"spec validation failed: {'; '.join(errors)}\n")
        return 1

    # 5. Manifest check if provided (canonical validation & exact spec byte binding)
    manifest_info = None
    if manifest_path is not None:
        manifest_path = Path(manifest_path)
        if not manifest_path.exists() or not manifest_path.is_file():
            sys.stderr.write(f"prerequisite error: manifest file not found: {manifest_path}\n")
            return 2

        try:
            manifest_info = validate_and_bind_manifest(manifest_path, spec_bytes)
        except ExportError as err:
            sys.stderr.write(f"{err}\n")
            return 1

    # 6. Strict geometry / layout check
    try:
        lay = render_drawio.layout(spec)
        findings = check_layout.check(spec, lay)
    except Exception as err:
        sys.stderr.write(f"layout evaluation error: {err}\n")
        return 1

    if findings:
        sys.stderr.write(f"strict geometry failure: {'; '.join(findings)}\n")
        return 1

    # 7. Create private staging directory
    staging_dir = tempfile.mkdtemp(prefix="export_html_stage_")
    try:
        os.chmod(staging_dir, 0o700)
    except OSError:
        pass

    try:
        # Render light and dark draw.io XML via settled shared interface
        try:
            light_xml = render_theme(spec, "light")
            dark_xml = render_theme(spec, "dark")
        except Exception as err:
            sys.stderr.write(f"rendering failed: {err}\n")
            shutil.rmtree(staging_dir, ignore_errors=True)
            return 1

        staging_path = Path(staging_dir)
        light_drawio_stage = staging_path / "light.drawio"
        dark_drawio_stage = staging_path / "dark.drawio"
        light_png_stage = staging_path / "light.png"
        dark_png_stage = staging_path / "dark.png"

        light_drawio_stage.write_text(light_xml, encoding="utf-8")
        dark_drawio_stage.write_text(dark_xml, encoding="utf-8")

        # 8. Export PNGs using Desktop CLI
        try:
            export_drawio.export(str(light_drawio_stage), str(light_png_stage), fmt="png")
            export_drawio.export(str(dark_drawio_stage), str(dark_png_stage), fmt="png")
        except export_drawio.DrawioNotFound as err:
            sys.stderr.write(f"prerequisite error: draw.io Desktop unavailable: {err}\n")
            shutil.rmtree(staging_dir, ignore_errors=True)
            return 2
        except Exception as err:
            sys.stderr.write(f"draw.io Desktop export failed: {err}\n")
            shutil.rmtree(staging_dir, ignore_errors=True)
            return 1

        # 9. Validate PNG bytes
        try:
            light_png_bytes = light_png_stage.read_bytes()
            dark_png_bytes = dark_png_stage.read_bytes()
            validate_png_bytes(light_png_bytes, "light theme PNG")
            validate_png_bytes(dark_png_bytes, "dark theme PNG")
        except Exception as err:
            sys.stderr.write(f"image validation failed: {err}\n")
            shutil.rmtree(staging_dir, ignore_errors=True)
            return 1

        # 10. Generate index.html
        html_content = build_html_page(
            spec=spec,
            source_digest=spec_digest,
            light_png_bytes=light_png_bytes,
            dark_png_bytes=dark_png_bytes,
            manifest_id=manifest_info,
        )

        # 11. Exclusively create private final output directory
        try:
            os.mkdir(output_dir, 0o700)
        except FileExistsError:
            sys.stderr.write(f"prerequisite error: output directory already exists: {output_dir}\n")
            shutil.rmtree(staging_dir, ignore_errors=True)
            return 2
        except Exception as err:
            sys.stderr.write(f"failed to create final output directory: {err}\n")
            shutil.rmtree(staging_dir, ignore_errors=True)
            return 1

        # Publication has begun!
        # Once final output directory is created:
        # Never automatically unlink final entries or recursively remove final content.
        # Clean only staging directory.
        publish_sequence = [
            ("spec.json", spec_bytes),
            ("light.drawio", light_xml.encode("utf-8")),
            ("dark.drawio", dark_xml.encode("utf-8")),
            ("index.html", html_content.encode("utf-8")),
        ]

        open_flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
        if hasattr(os, "O_NOFOLLOW"):
            open_flags |= os.O_NOFOLLOW

        publication_failed = False
        try:
            for fname, payload in publish_sequence:
                fpath = output_dir / fname
                fd = os.open(str(fpath), open_flags, 0o600)
                try:
                    write_all_bytes(fd, payload)
                finally:
                    os.close(fd)
        except Exception as err:
            publication_failed = True
            sys.stderr.write(
                f"publication failed: {err}; incomplete final output retained at {output_dir}\n"
            )

        # Clean staging directory only
        shutil.rmtree(staging_dir, ignore_errors=True)

        if publication_failed:
            return 1

        sys.stderr.write(f"wrote static package to {output_dir}\n")
        return 0

    except Exception as err:
        shutil.rmtree(staging_dir, ignore_errors=True)
        sys.stderr.write(f"unexpected export error: {err}\n")
        return 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Export a diagram spec to a self-contained offline static HTML package."
    )
    parser.add_argument("spec", help="input diagram spec JSON file")
    parser.add_argument(
        "-o",
        "--output-dir",
        required=True,
        help="new directory to receive the exported package",
    )
    parser.add_argument(
        "-m",
        "--manifest",
        default=None,
        help="optional view-manifest JSON to validate and bind",
    )
    args = parser.parse_args(argv)

    return export_package(
        spec_path=args.spec,
        output_dir=args.output_dir,
        manifest_path=args.manifest,
    )


if __name__ == "__main__":
    sys.exit(main())
