#!/usr/bin/env python3
"""Comprehensive behavioral tests for static HTML export and security invariants."""

from __future__ import annotations

import base64
import hashlib
import html.parser
import json
import os
import struct
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

# Ensure local script directory is in sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import export_drawio
import export_html
import validate_manifest


def make_minimal_png(width: int = 100, height: int = 100) -> bytes:
    """Construct a minimal valid PNG byte buffer with valid signature and IHDR."""
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr_payload = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    ihdr_crc = struct.pack(">I", 0x12345678)
    ihdr_chunk = struct.pack(">I", len(ihdr_payload)) + b"IHDR" + ihdr_payload + ihdr_crc
    iend_chunk = struct.pack(">I", 0) + b"IEND" + struct.pack(">I", 0xAE426082)
    return sig + ihdr_chunk + iend_chunk


def make_valid_spec(**overrides) -> dict:
    spec = {
        "title": "Core Banking Architecture",
        "type": "container",
        "audience": "tech",
        "version": "1.0",
        "date": "2026-11-05",
        "scope": "Payment routing boundary.",
        "nodes": [
            {
                "id": "gateway",
                "label": "API Gateway",
                "kind": "container",
                "lifecycle": "implemented",
                "evidence": "gateway.go:12",
                "evidence_kind": "code",
                "evidence_confidence": "documented",
            },
            {
                "id": "ledger",
                "label": "General Ledger",
                "kind": "db",
                "lifecycle": "implemented",
                "evidence": "schema.sql:40",
                "evidence_kind": "code",
                "evidence_confidence": "documented",
            },
        ],
        "edges": [
            {
                "from": "gateway",
                "to": "ledger",
                "label": "Records settlement / gRPC",
                "style": "sync",
                "lifecycle": "implemented",
                "evidence": "client.go:88",
                "evidence_kind": "code",
                "evidence_confidence": "documented",
            }
        ],
    }
    spec.update(overrides)
    return spec


MANIFEST_SOURCE_CONTENT = "Synthetic view evidence.\n"
MANIFEST_SOURCE_DIGEST = "sha256:" + hashlib.sha256(
    MANIFEST_SOURCE_CONTENT.encode("utf-8")).hexdigest()
MANIFEST_REGENERATION = {
    "authority": "spec",
    "presentation": "drawio",
    "export": "image",
    "manual_edits": "protect",
}


def make_manifest_spec(**overrides) -> dict:
    """A contract-complete spec that canonical manifest validation accepts."""
    spec = make_valid_spec(**overrides)
    capture = {
        "evidence": "view.md:1",
        "evidence_kind": "document",
        "evidence_confidence": "documented",
        "evidence_revision": "r1",
        "evidence_digest": MANIFEST_SOURCE_DIGEST,
    }
    spec["nodes"] = [
        dict(value, identity="core.%s" % value["id"], lifecycle="implemented", **capture)
        for value in spec["nodes"]
    ]
    spec["edges"] = [
        dict(value, identity="core.settlement", lifecycle="implemented", **capture)
        for value in spec["edges"]
    ]
    spec["view"] = {
        "question": "Which boundary records settlement?",
        "decision": "Keep settlement inside the ledger boundary.",
        "scenario": "A payment settles exactly once.",
        "invariant": "One payment has one ledger entry.",
        "status": "implemented",
        "evidence": "view.md:1",
        "evidence_kind": "document",
        "evidence_revision": "r1",
        "evidence_digest": MANIFEST_SOURCE_DIGEST,
        "omissions": [],
    }
    return spec


class TestExportHtmlAncestorsAndSecurity(unittest.TestCase):
    def test_check_trusted_ancestors_valid(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            target = Path(temp_dir) / "output-package"
            # Should not raise for user-owned private directory
            export_html.check_trusted_ancestors(target)

    def test_check_trusted_ancestors_rejects_symlink(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            real_parent = Path(temp_dir) / "real_parent"
            real_parent.mkdir()
            symlink_parent = Path(temp_dir) / "symlink_parent"
            os.symlink(real_parent, symlink_parent)

            target = symlink_parent / "output-package"
            with self.assertRaises(export_html.ExportError) as ctx:
                export_html.check_trusted_ancestors(target)
            self.assertIn("symlink", str(ctx.exception))

    def test_check_trusted_ancestors_rejects_group_writable_without_sticky(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            test_dir = Path(temp_dir) / "group_writable_dir"
            test_dir.mkdir()
            # Set mode 0o775 (group-writable without sticky 0o1000)
            os.chmod(test_dir, 0o775)
            target = test_dir / "output-package"
            with self.assertRaises(export_html.ExportError) as ctx:
                export_html.check_trusted_ancestors(target)
            self.assertIn("writable by group or other without sticky bit", str(ctx.exception))

    def test_check_trusted_ancestors_rejects_world_writable_without_sticky(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            test_dir = Path(temp_dir) / "writable_dir"
            test_dir.mkdir()
            # Set mode 0o777 (world-writable without sticky 0o1000)
            os.chmod(test_dir, 0o777)
            target = test_dir / "output-package"
            with self.assertRaises(export_html.ExportError) as ctx:
                export_html.check_trusted_ancestors(target)
            self.assertIn("writable by group or other without sticky bit", str(ctx.exception))

    def test_check_trusted_ancestors_allows_macos_tmp_alias(self):
        if sys.platform == "darwin":
            tmp_target = Path("/tmp/test_tmp_ancestor_pkg")
            # Should not raise for the macOS /tmp system alias
            export_html.check_trusted_ancestors(tmp_target)


class TestValidatePngBytes(unittest.TestCase):
    def test_validate_png_bytes_valid(self):
        png = make_minimal_png(320, 240)
        w, h = export_html.validate_png_bytes(png, "test image")
        self.assertEqual(w, 320)
        self.assertEqual(h, 240)

    def test_validate_png_bytes_rejects_corrupted_signature(self):
        corrupted = b"NOT_A_PNG" + make_minimal_png(100, 100)[9:]
        with self.assertRaises(export_html.ExportError) as ctx:
            export_html.validate_png_bytes(corrupted, "corrupted image")
        self.assertIn("invalid PNG signature", str(ctx.exception))

    def test_validate_png_bytes_rejects_disguised_markup(self):
        svg_disguise = b"\x89PNG\r\n\x1a\n" + b"<svg xmlns='http://www.w3.org/2000/svg'></svg>"
        with self.assertRaises(export_html.ExportError) as ctx:
            export_html.validate_png_bytes(svg_disguise, "svg disguised as png")
        self.assertIn("contains disallowed markup marker", str(ctx.exception))

    def test_validate_png_bytes_rejects_non_positive_dimensions(self):
        sig = b"\x89PNG\r\n\x1a\n"
        ihdr_payload = struct.pack(">IIBBBBB", 0, 100, 8, 2, 0, 0, 0)
        ihdr_chunk = struct.pack(">I", len(ihdr_payload)) + b"IHDR" + ihdr_payload + b"\x00\x00\x00\x00"
        bad_png = sig + ihdr_chunk
        with self.assertRaises(export_html.ExportError) as ctx:
            export_html.validate_png_bytes(bad_png, "zero width png")
        self.assertIn("non-positive dimensions", str(ctx.exception))


class TestWriteAllBytes(unittest.TestCase):
    def test_write_all_bytes_handles_short_writes(self):
        payload = b"Hello, world! This is a test of partial writes."
        fd = 42

        # Simulate os.write returning at most 7 bytes per invocation
        written = []

        def mock_os_write(fdesc, data):
            chunk = data[:7]
            written.append(chunk)
            return len(chunk)

        with mock.patch("os.write", side_effect=mock_os_write):
            export_html.write_all_bytes(fd, payload)

        self.assertEqual(b"".join(written), payload)

    def test_write_all_bytes_raises_on_zero_write(self):
        with mock.patch("os.write", return_value=0):
            with self.assertRaises(OSError) as ctx:
                export_html.write_all_bytes(1, b"some bytes")
            self.assertIn("zero bytes written", str(ctx.exception))


class TestExportHtmlExecution(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.valid_png_bytes = make_minimal_png(400, 300)

    def tearDown(self):
        self.temp_dir.cleanup()

    def _write_spec(self, data: dict, filename: str = "spec.json") -> Path:
        spec_path = self.root / filename
        spec_path.write_bytes(json.dumps(data, indent=2).encode("utf-8"))
        return spec_path

    def _mock_desktop_export(self, source, output, fmt="png", scale=2, border=20):
        Path(output).write_bytes(self.valid_png_bytes)
        return output

    def _write_manifest_bundle(self, spec_data: dict, view_name: str = "service.spec.json"):
        """Write a real spec + view manifest pair that canonical validation accepts."""
        (self.root / "view.md").write_text(MANIFEST_SOURCE_CONTENT, encoding="utf-8")
        view_spec_file = self._write_spec(spec_data, view_name)
        manifest_data = {
            "version": "1.0",
            "regeneration": MANIFEST_REGENERATION,
            "sources": [{
                "id": "view-md", "path": "view.md", "revision": "r1",
                "digest": MANIFEST_SOURCE_DIGEST,
            }],
            "views": [{
                "id": "service_view",
                "spec": view_name,
                "scope": [value["identity"] for value in spec_data["nodes"]],
                "relationships": [value["identity"] for value in spec_data["edges"]],
            }],
        }
        manifest_file = self.root / "manifest.json"
        manifest_file.write_text(json.dumps(manifest_data, indent=2), encoding="utf-8")
        return view_spec_file, manifest_file

    @mock.patch("render_drawio.render", return_value="<mxfile></mxfile>")
    @mock.patch("export_drawio.export")
    def test_export_html_happy_path(self, mock_export, mock_render):
        mock_export.side_effect = self._mock_desktop_export

        spec_data = make_valid_spec()
        spec_file = self._write_spec(spec_data)
        out_dir = self.root / "pkg_out"

        code = export_html.export_package(spec_file, out_dir)
        self.assertEqual(code, 0)

        # 4 expected output files
        self.assertTrue(out_dir.exists())
        self.assertTrue((out_dir / "spec.json").exists())
        self.assertTrue((out_dir / "light.drawio").exists())
        self.assertTrue((out_dir / "dark.drawio").exists())
        self.assertTrue((out_dir / "index.html").exists())

        # Exact source bytes preserved
        self.assertEqual((out_dir / "spec.json").read_bytes(), spec_file.read_bytes())

        # Check render was called with theme keywords
        mock_render.assert_any_call(mock.ANY, theme="light")
        mock_render.assert_any_call(mock.ANY, theme="dark")

        # Check index.html content
        html_text = (out_dir / "index.html").read_text(encoding="utf-8")
        expected_digest = "sha256:" + hashlib.sha256(spec_file.read_bytes()).hexdigest()
        self.assertIn(expected_digest, html_text)
        self.assertIn("Core Banking Architecture", html_text)
        self.assertIn("Content-Security-Policy", html_text)
        self.assertIn("default-src 'none'", html_text)
        self.assertIn("data:image/png;base64,", html_text)
        self.assertIn("Payment routing boundary.", html_text)
        self.assertIn("gateway.go:12", html_text)

        # Check that light and dark export calls were both made
        self.assertEqual(mock_export.call_count, 2)

    def test_export_html_rejects_existing_output_path(self):
        spec_file = self._write_spec(make_valid_spec())
        out_dir = self.root / "existing_dir"
        out_dir.mkdir()
        canary = out_dir / "canary.txt"
        canary.write_text("do not delete", encoding="utf-8")

        code = export_html.export_package(spec_file, out_dir)
        self.assertEqual(code, 2)
        # Canary untouched
        self.assertTrue(canary.exists())
        self.assertEqual(canary.read_text(encoding="utf-8"), "do not delete")

    def test_export_html_missing_spec_file(self):
        missing_spec = self.root / "missing.json"
        out_dir = self.root / "pkg_out"
        code = export_html.export_package(missing_spec, out_dir)
        self.assertEqual(code, 2)
        self.assertFalse(out_dir.exists())

    @mock.patch("render_drawio.render", return_value="<mxfile></mxfile>")
    @mock.patch("export_drawio.export")
    def test_export_html_missing_desktop_cli(self, mock_export, mock_render):
        mock_export.side_effect = export_drawio.DrawioNotFound("draw.io not found")
        spec_file = self._write_spec(make_valid_spec())
        out_dir = self.root / "pkg_out"

        code = export_html.export_package(spec_file, out_dir)
        self.assertEqual(code, 2)
        self.assertFalse(out_dir.exists())

    @mock.patch("render_drawio.render", return_value="<mxfile></mxfile>")
    @mock.patch("export_drawio.export")
    def test_export_html_desktop_export_runtime_failure(self, mock_export, mock_render):
        mock_export.side_effect = RuntimeError("draw.io export crashed")
        spec_file = self._write_spec(make_valid_spec())
        out_dir = self.root / "pkg_out"

        code = export_html.export_package(spec_file, out_dir)
        self.assertEqual(code, 1)
        self.assertFalse(out_dir.exists())

    def test_export_html_invalid_spec_json(self):
        bad_spec = self.root / "bad.json"
        bad_spec.write_bytes(b"{invalid json content")
        out_dir = self.root / "pkg_out"

        code = export_html.export_package(bad_spec, out_dir)
        self.assertEqual(code, 1)
        self.assertFalse(out_dir.exists())

    def test_export_html_spec_validation_failure(self):
        # Missing required field "type"
        spec_data = make_valid_spec()
        del spec_data["type"]
        bad_spec = self._write_spec(spec_data)
        out_dir = self.root / "pkg_out"

        code = export_html.export_package(bad_spec, out_dir)
        self.assertEqual(code, 1)
        self.assertFalse(out_dir.exists())

    @mock.patch("check_layout.check")
    def test_export_html_strict_geometry_failure(self, mock_check):
        mock_check.return_value = ["layout finding: overlapping node bounds detected"]
        spec_file = self._write_spec(make_valid_spec())
        out_dir = self.root / "pkg_out"

        code = export_html.export_package(spec_file, out_dir)
        self.assertEqual(code, 1)
        self.assertFalse(out_dir.exists())

    @mock.patch("render_drawio.render", return_value="<mxfile></mxfile>")
    @mock.patch("export_drawio.export")
    def test_export_html_manifest_binding_success(self, mock_export, mock_render):
        mock_export.side_effect = self._mock_desktop_export

        spec_file, manifest_file = self._write_manifest_bundle(make_manifest_spec())

        out_dir = self.root / "pkg_out"
        code = export_html.export_package(spec_file, out_dir, manifest_file)
        self.assertEqual(code, 0)
        self.assertTrue(out_dir.exists())
        html_text = (out_dir / "index.html").read_text(encoding="utf-8")
        self.assertIn("manifest.json", html_text)
        self.assertIn("service_view", html_text)
        self.assertEqual((out_dir / "spec.json").read_bytes(), spec_file.read_bytes())

    def test_export_html_manifest_review_needed_fails(self):
        spec_file, manifest_file = self._write_manifest_bundle(make_manifest_spec())
        (self.root / "view.md").write_text("changed evidence\n", encoding="utf-8")

        out_dir = self.root / "pkg_out"
        code = export_html.export_package(spec_file, out_dir, manifest_file)
        self.assertEqual(code, 1)
        self.assertFalse(out_dir.exists())

    def test_export_html_manifest_unrelated_fails(self):
        spec_file = self._write_manifest_bundle(make_manifest_spec())[0]
        self._write_manifest_bundle(
            make_manifest_spec(title="Unrelated Architecture"), view_name="other.spec.json"
        )

        out_dir = self.root / "pkg_out"
        code = export_html.export_package(spec_file, out_dir, self.root / "manifest.json")
        self.assertEqual(code, 1)
        self.assertFalse(out_dir.exists())

    def test_export_html_manifest_rejects_view_swapped_after_canonical_read(self):
        """Selected spec differs from the canonically validated capture; no second read may bind it."""
        validated_spec = make_manifest_spec()
        selected_spec = make_manifest_spec(title="Swapped After Validation")
        selected_file = self._write_spec(selected_spec, "selected.spec.json")
        view_spec_file, manifest_file = self._write_manifest_bundle(
            validated_spec, view_name="view.json"
        )
        selected_bytes = selected_file.read_bytes()
        canonical_view_bytes = view_spec_file.read_bytes()
        self.assertNotEqual(canonical_view_bytes, selected_bytes)

        real_read_bounded = validate_manifest._read_bounded
        swaps = []

        def swap_view_after_read(root_fd, parts, label):
            payload = real_read_bounded(root_fd, parts, label)
            if parts == ("view.json",) and not swaps:
                swaps.append(payload)
                view_spec_file.write_bytes(selected_bytes)
            return payload

        out_dir = self.root / "pkg_out"
        with mock.patch.object(
            validate_manifest, "_read_bounded", side_effect=swap_view_after_read
        ):
            code = export_html.export_package(selected_file, out_dir, manifest_file)

        self.assertEqual(swaps, [canonical_view_bytes])
        self.assertEqual(view_spec_file.read_bytes(), selected_bytes)
        self.assertEqual(code, 1)
        self.assertFalse(out_dir.exists())

    def test_export_html_manifest_does_not_consume_captures_when_report_fails(self):
        spec_file, manifest_file = self._write_manifest_bundle(make_manifest_spec())
        manifest_data = json.loads(manifest_file.read_text(encoding="utf-8"))
        (self.root / "broken.json").write_bytes(b'{"title": "Broken"}')
        manifest_data["views"].append({
            "id": "broken_view",
            "spec": "broken.json",
            "scope": ["broken.api"],
            "relationships": [],
        })
        manifest_file.write_text(json.dumps(manifest_data, indent=2), encoding="utf-8")

        out_dir = self.root / "pkg_out"
        code = export_html.export_package(spec_file, out_dir, manifest_file)
        self.assertEqual(code, 1)
        self.assertFalse(out_dir.exists())

    @mock.patch("render_drawio.render", return_value="<mxfile></mxfile>")
    @mock.patch("export_drawio.export")
    def test_export_html_retains_incomplete_output_on_publish_failure(self, mock_export, mock_render):
        mock_export.side_effect = self._mock_desktop_export
        spec_file = self._write_spec(make_valid_spec())
        out_dir = self.root / "pkg_out"

        # Intercept os.open during publication to fail after writing spec.json
        original_open = os.open

        def failing_open(path, flags, *args, **kwargs):
            if "light.drawio" in str(path):
                raise OSError("Disk write error during child publication")
            return original_open(path, flags, *args, **kwargs)

        with mock.patch("os.open", side_effect=failing_open):
            code = export_html.export_package(spec_file, out_dir)
            self.assertEqual(code, 1)
            # Incomplete final directory and spec.json MUST BE RETAINED!
            self.assertTrue(out_dir.exists())
            self.assertTrue((out_dir / "spec.json").exists())
            # index.html must not be present
            self.assertFalse((out_dir / "index.html").exists())

    @mock.patch("render_drawio.render", return_value="<mxfile></mxfile>")
    @mock.patch("export_drawio.export")
    def test_export_html_theme_toggle_dom_and_css(self, mock_export, mock_render):
        """Verify DOM hierarchy: inputs are prior siblings of .diagram-viewport so CSS selectors work."""
        mock_export.side_effect = self._mock_desktop_export
        spec_file = self._write_spec(make_valid_spec())
        out_dir = self.root / "pkg_out"

        code = export_html.export_package(spec_file, out_dir)
        self.assertEqual(code, 0)

        html_text = (out_dir / "index.html").read_text(encoding="utf-8")

        # Verify radio inputs exist inside .theme-selection-bar before .diagram-viewport
        self.assertIn('<div class="theme-selection-bar">', html_text)
        self.assertIn('<input type="radio" id="theme-auto"', html_text)
        self.assertIn('<input type="radio" id="theme-light"', html_text)
        self.assertIn('<input type="radio" id="theme-dark"', html_text)
        self.assertIn('<div class="diagram-viewport">', html_text)

        # Check sibling order: radio input positions precede .diagram-viewport
        pos_radio_light = html_text.find('id="theme-light"')
        pos_viewport = html_text.find('class="diagram-viewport"')
        self.assertNotEqual(pos_radio_light, -1)
        self.assertNotEqual(pos_viewport, -1)
        self.assertLess(pos_radio_light, pos_viewport)

        # Verify CSS toggle rules exist
        self.assertIn("#theme-light:checked ~ .diagram-viewport .img-light", html_text)
        self.assertIn("#theme-dark:checked ~ .diagram-viewport .img-dark", html_text)
        self.assertIn("#theme-auto:checked ~ .diagram-viewport .img-light", html_text)
        self.assertIn("@media (prefers-color-scheme: dark)", html_text)

    @mock.patch("render_drawio.render", return_value="<mxfile></mxfile>")
    @mock.patch("export_drawio.export")
    def test_export_html_security_escaping_and_literal_text_contract(self, mock_export, mock_render):
        """Verify DOM parsing: no executable scripts/handlers, while literal text remains visible escaped."""
        mock_export.side_effect = self._mock_desktop_export

        malicious_spec = make_valid_spec(
            title="<script>alert('pwned')</script>",
            scope='"><iframe src="javascript:alert(1)"></iframe>',
            version="<img src=x onerror=alert(1)>",
        )
        # Keep the fixture's connected two-node graph; only the citation content is hostile.
        malicious_spec["nodes"][0]["evidence"] = "<script>evil()</script>.go:10"
        spec_file = self._write_spec(malicious_spec)
        out_dir = self.root / "pkg_out"

        code = export_html.export_package(spec_file, out_dir)
        self.assertEqual(code, 0)

        html_text = (out_dir / "index.html").read_text(encoding="utf-8")

        # DOM Parser audit: ensure no executable elements or event handlers are created
        class DOMSecurityAuditor(html.parser.HTMLParser):
            def __init__(self):
                super().__init__()
                self.disallowed_tags = []
                self.active_attributes = []
                self.active_links = []

            def handle_starttag(self, tag, attrs):
                if tag in ("script", "iframe", "object", "embed", "form"):
                    self.disallowed_tags.append(tag)
                for name, value in attrs:
                    if name.lower().startswith("on"):
                        self.active_attributes.append((tag, name, value))
                    if name.lower() in ("href", "src") and value.strip().lower().startswith("javascript:"):
                        self.active_links.append((tag, name, value))

        auditor = DOMSecurityAuditor()
        auditor.feed(html_text)

        self.assertEqual(auditor.disallowed_tags, [], f"Executable tags found: {auditor.disallowed_tags}")
        self.assertEqual(auditor.active_attributes, [], f"Active event handlers found: {auditor.active_attributes}")
        self.assertEqual(auditor.active_links, [], f"Javascript URLs found: {auditor.active_links}")

        # Literal text contract: malicious text in emitted metadata stays visible as escaped content
        self.assertIn("&lt;script&gt;alert(&#x27;pwned&#x27;)&lt;/script&gt;", html_text)
        self.assertIn("&quot;&gt;&lt;iframe", html_text)
        self.assertIn("&lt;img src=x onerror=alert(1)&gt;", html_text)
        self.assertIn("&lt;script&gt;evil()&lt;/script&gt;.go:10", html_text)

        # The same payload must not have become markup anywhere in the page
        self.assertNotIn("<img src=x", html_text)
        self.assertNotIn("<script>alert", html_text)

        # Citations must not be active links
        self.assertNotIn('<a href="', html_text)

        # Absolute paths / environment leaks
        self.assertNotIn(str(Path.home()), html_text)


if __name__ == "__main__":
    unittest.main()
