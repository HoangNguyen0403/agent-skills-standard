#!/usr/bin/env python3
"""Export a .drawio file to PNG/SVG/PDF using the draw.io Desktop CLI.

The .drawio file is the deliverable; this step only produces the picture that
gets pasted into a deck. A missing CLI must therefore fail loudly rather than
silently leave a diagram nobody can view.

Usage:
    python3 export_drawio.py diagram.drawio -f png -o diagram.png
"""

import argparse
import os
import shutil
import subprocess
import sys

BUNDLE_CANDIDATES = [
    "/Applications/draw.io.app/Contents/MacOS/draw.io",
    "/Applications/Draw io.app/Contents/MacOS/draw.io",
    "/opt/drawio/drawio",
    "/usr/bin/drawio",
    "/usr/local/bin/drawio",
    r"C:\Program Files\draw.io\draw.io.exe",
]

INSTALL_HINT = (
    "draw.io Desktop not found. The .drawio file is still written and editable.\n"
    "  macOS:   brew install --cask drawio\n"
    "  Linux:   download the .deb/.rpm from https://github.com/jgraph/drawio-desktop/releases\n"
    "  Windows: winget install JGraph.Draw\n"
    "Or point DRAWIO_BIN at the binary, e.g. "
    "DRAWIO_BIN='/Applications/draw.io.app/Contents/MacOS/draw.io'"
)


class DrawioNotFound(RuntimeError):
    """The Desktop CLI could not be located."""


def resolve_binary():
    """Find the CLI: explicit override, then PATH, then per-OS install locations."""
    override = os.environ.get("DRAWIO_BIN")
    if override:
        if os.path.exists(override):
            return override
        raise DrawioNotFound("DRAWIO_BIN points at %r which does not exist.\n%s"
                             % (override, INSTALL_HINT))
    found = shutil.which("drawio") or shutil.which("draw.io")
    if found:
        return found
    for candidate in BUNDLE_CANDIDATES:
        if os.path.exists(candidate):
            return candidate
    raise DrawioNotFound(INSTALL_HINT)


def build_command(binary, source, output, fmt, scale=2, border=20):
    return [binary, "-x", "-f", fmt, "-e", "-b", str(border), "-s", str(scale),
            "-o", output, source]


def export(source, output, fmt="png", scale=2, border=20):
    """Export one diagram. Returns the output path; raises on CLI failure."""
    binary = resolve_binary()
    command = build_command(binary, source, output, fmt, scale, border)
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0 or not os.path.exists(output):
        raise RuntimeError("draw.io export failed (exit %d): %s"
                           % (result.returncode, (result.stderr or "").strip()))
    return output


def main(argv=None):
    parser = argparse.ArgumentParser(description="Export a .drawio file to an image.")
    parser.add_argument("source", help="input .drawio path")
    parser.add_argument("-o", "--output", required=True, help="output image path")
    parser.add_argument("-f", "--format", default="png",
                        choices=["png", "svg", "pdf", "jpg"], help="export format")
    parser.add_argument("-s", "--scale", default=2, type=int, help="output scale")
    parser.add_argument("-b", "--border", default=20, type=int, help="border width")
    args = parser.parse_args(argv)

    try:
        path = export(args.source, args.output, args.format, args.scale, args.border)
    except DrawioNotFound as error:
        sys.stderr.write("%s\n" % error)
        return 2
    except RuntimeError as error:
        sys.stderr.write("%s\n" % error)
        return 1
    sys.stderr.write("wrote %s\n" % path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
