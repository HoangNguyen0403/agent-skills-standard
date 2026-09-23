#!/usr/bin/env python3
"""Behavioral tests for scoped view manifests and local evidence captures."""

from __future__ import annotations

import hashlib
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).parent))

import validate_manifest


SPEC_METADATA = {
    "title": "Test view",
    "type": "container",
    "audience": "tech",
    "version": "1.0",
    "date": "2026-09-22",
    "scope": "Test scope.",
}
REGENERATION = {
    "authority": "spec",
    "presentation": "drawio",
    "export": "image",
    "manual_edits": "protect",
}
VIEW_CONTENT = "Synthetic view evidence.\n"
VIEW_DIGEST = "sha256:" + hashlib.sha256(VIEW_CONTENT.encode()).hexdigest()
VIEW_CONTRACT = {
    "question": "Which boundary owns the request?",
    "decision": "Keep ownership explicit.",
    "scenario": "Assumption: a request is retried.",
    "invariant": "Assumption: one request has one owner.",
    "status": "proposed",
    "evidence": "view.md:1",
    "evidence_kind": "document",
    "evidence_revision": "r1",
    "evidence_digest": VIEW_DIGEST,
    "omissions": ["runtime health"],
}


def spec(nodes, edges, **metadata):
    value = dict(SPEC_METADATA)
    value.update(metadata)
    value["view"] = dict(VIEW_CONTRACT)
    value["nodes"] = nodes
    value["edges"] = edges
    return value


def node(local_id, identity, **extra):
    value = {"id": local_id, "identity": identity, "label": identity,
             "kind": "container", "lifecycle": "proposed",
             "evidence_confidence": "assumed"}
    value.update(extra)
    return value


def edge(identity, source, target, **extra):
    value = {"identity": identity, "from": source, "to": target, "label": "calls",
             "lifecycle": "proposed", "evidence_confidence": "assumed"}
    value.update(extra)
    return value


def write_json(root, name, value):
    path = root / name
    path.write_text(json.dumps(value), encoding="utf-8")
    return path


def source_record(root, name, content, revision="r1"):
    path = root / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    digest = "sha256:" + hashlib.sha256(content.encode()).hexdigest()
    return {"id": name.replace("/", "-"), "path": name,
            "revision": revision, "digest": digest}


class TestManifest(unittest.TestCase):
    def manifest(self, root, views, sources=None):
        if sources is None:
            sources = [source_record(root, "view.md", VIEW_CONTENT)]
        normalized_views = []
        for view in views:
            item = dict(view)
            if "relationships" not in item:
                try:
                    spec_value = json.loads((root / item["spec"]).read_text(encoding="utf-8"))
                except (OSError, json.JSONDecodeError):
                    item["relationships"] = []
                else:
                    item["relationships"] = [edge_value["identity"]
                                             for edge_value in spec_value.get("edges", [])]
            normalized_views.append(item)
        return write_json(root, "manifest.json", {
            "version": "1.0", "regeneration": REGENERATION,
            "sources": sources, "views": normalized_views,
        })

    def test_valid_manifest_accepts_scoped_views(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_json(root, "context.json", spec(
                [node("api", "orders.api"), node("db", "orders.db")],
                [edge("orders.reads", "api", "db")],
            ))
            manifest = self.manifest(root, [{
                "id": "context", "spec": "context.json",
                "scope": ["orders.api", "orders.db"],
            }])
            report = validate_manifest.validate_manifest(manifest)
        self.assertTrue(report.ok)

    def test_refined_endpoints_remain_relationship_consistent(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_json(root, "context.json", spec(
                [node("api", "orders.api"), node("db", "orders.db")],
                [edge("orders.reads", "api", "db")],
            ))
            write_json(root, "component.json", spec(
                [node("api", "orders.api.v2", refines=["orders.api"]),
                 node("db", "orders.db")],
                [edge("orders.reads", "api", "db")],
            ))
            manifest = self.manifest(root, [
                {"id": "context", "spec": "context.json",
                 "scope": ["orders.api", "orders.db"]},
                {"id": "component", "spec": "component.json",
                 "scope": ["orders.api.v2", "orders.db"]},
            ])
            report = validate_manifest.validate_manifest(manifest)
        self.assertEqual(report.errors, ())

    def test_sibling_reversal_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_json(root, "one.json", spec(
                [node("api", "orders.api"), node("db", "orders.db")],
                [edge("orders.reads", "api", "db")],
            ))
            write_json(root, "two.json", spec(
                [node("api", "other.api"), node("db", "orders.db")],
                [edge("orders.reads", "db", "api")],
            ))
            manifest = self.manifest(root, [
                {"id": "one", "spec": "one.json",
                 "scope": ["orders.api", "orders.db"]},
                {"id": "two", "spec": "two.json",
                 "scope": ["other.api", "orders.db"]},
            ])
            report = validate_manifest.validate_manifest(manifest)
        self.assertIn("inconsistent", " ".join(report.errors))

    def test_missing_expected_relationship_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_json(root, "view.json", spec(
                [node("api", "orders.api"), node("db", "orders.db")],
                [edge("orders.reads", "api", "db")],
            ))
            manifest = self.manifest(root, [{
                "id": "view", "spec": "view.json",
                "scope": ["orders.api", "orders.db"],
                "relationships": ["orders.reads", "orders.writes"],
            }])
            report = validate_manifest.validate_manifest(manifest)
        self.assertIn("missing expected relationship orders.writes", " ".join(report.errors))

    def test_capture_is_compared_by_source_and_changed_file_needs_review(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = source_record(root, "evidence.txt", "initial evidence\n")
            digest = source["digest"]
            captured = {"evidence": "evidence.txt:1", "evidence_kind": "document",
                        "evidence_revision": "r1",
                        "evidence_digest": digest, "evidence_confidence": "documented"}
            write_json(root, "one.json", spec(
                [node("api", "orders.api", **captured), node("db", "orders.db")],
                [edge("orders.reads", "api", "db")],
            ))
            manifest = self.manifest(root, [{
                "id": "one", "spec": "one.json",
                "scope": ["orders.api", "orders.db"],
            }], sources=[source, source_record(root, "view.md", VIEW_CONTENT)])
            (root / "evidence.txt").write_text("changed evidence\n", encoding="utf-8")
            report = validate_manifest.validate_manifest(manifest)
        self.assertEqual(report.errors, ())
        self.assertTrue(any("evidence.txt digest changed" in finding
                            for finding in report.review_needed))

    def test_refinement_and_ownership_cycles_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_json(root, "cycle.json", spec(
                [node("a", "orders.a", refines=["orders.b"], owner="orders.b"),
                 node("b", "orders.b", refines=["orders.a"], owner="orders.a")],
                [edge("orders.link", "a", "b")],
            ))
            manifest = self.manifest(root, [{
                "id": "cycle", "spec": "cycle.json",
                "scope": ["orders.a", "orders.b"],
            }])
            report = validate_manifest.validate_manifest(manifest)
        text = " ".join(report.errors)
        self.assertIn("refinement cycle", text)
        self.assertIn("ownership cycle", text)
    def test_same_identity_may_use_distinct_source_captures(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            one = source_record(root, "one.txt", "first source\n")
            two = source_record(root, "two.txt", "second source\n")
            first_capture = {
                "evidence": "one.txt:1", "evidence_kind": "document",
                "evidence_revision": one["revision"],
                "evidence_digest": one["digest"], "evidence_confidence": "documented",
            }
            second_capture = {
                "evidence": "two.txt:1", "evidence_kind": "document",
                "evidence_revision": two["revision"],
                "evidence_digest": two["digest"], "evidence_confidence": "documented",
            }
            write_json(root, "one.json", spec(
                [node("api", "orders.api", **first_capture), node("db", "orders.db")],
                [edge("orders.reads", "api", "db")],
            ))
            write_json(root, "two.json", spec(
                [node("api", "orders.api", **second_capture), node("db", "orders.db")],
                [edge("orders.reads", "api", "db")],
            ))
            manifest = self.manifest(root, [
                {"id": "one", "spec": "one.json",
                 "scope": ["orders.api", "orders.db"]},
                {"id": "two", "spec": "two.json",
                 "scope": ["orders.api", "orders.db"]},
            ], sources=[one, two, source_record(root, "view.md", VIEW_CONTENT)])
            report = validate_manifest.validate_manifest(manifest)
        self.assertEqual(report.errors, ())
        self.assertEqual(report.review_needed, ())
    def test_referenced_directory_and_oversized_spec_are_errors(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "specdir").mkdir()
            manifest = self.manifest(root, [{
                "id": "directory", "spec": "specdir",
                "scope": ["orders.api"], "relationships": [],
            }])
            report = validate_manifest.validate_manifest(manifest)
            self.assertIn("ordinary file", " ".join(report.errors))

            oversized = root / "oversized.json"
            oversized.write_bytes(b"x" * (validate_manifest.MAX_FILE_BYTES + 1))
            manifest = self.manifest(root, [{
                "id": "oversized", "spec": "oversized.json",
                "scope": ["orders.api"], "relationships": [],
            }])
            report = validate_manifest.validate_manifest(manifest)
        self.assertIn("byte bound", " ".join(report.errors))

    def test_fifo_source_is_rejected_without_reading_from_it(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            if not hasattr(os, "mkfifo"):
                self.skipTest("mkfifo is unavailable")
            os.mkfifo(root / "evidence.pipe")
            source = {
                "id": "pipe",
                "path": "evidence.pipe",
                "revision": "r1",
                "digest": "sha256:" + hashlib.sha256(b"").hexdigest(),
            }
            write_json(root, "view.json", spec(
                [node("api", "orders.api"), node("db", "orders.db")],
                [edge("orders.reads", "api", "db")],
            ))
            manifest = self.manifest(root, [{
                "id": "view", "spec": "view.json",
                "scope": ["orders.api", "orders.db"],
            }], sources=[source, source_record(root, "view.md", VIEW_CONTENT)])
            report = validate_manifest.validate_manifest(manifest)
        self.assertTrue(any("ordinary file" in finding for finding in report.review_needed))

    def test_symlink_component_in_referenced_spec_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            real = root / "real"
            real.mkdir()
            write_json(real, "view.json", spec(
                [node("api", "orders.api"), node("db", "orders.db")],
                [edge("orders.reads", "api", "db")],
            ))
            (root / "link").symlink_to(real, target_is_directory=True)
            manifest = self.manifest(root, [{
                "id": "linked", "spec": "link/view.json",
                "scope": ["orders.api", "orders.db"], "relationships": [],
            }])
            report = validate_manifest.validate_manifest(manifest)
        self.assertTrue(report.errors)

    def test_scope_identity_must_exist_in_local_nodes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_json(root, "view.json", spec(
                [node("api", "orders.api"), node("db", "orders.db")],
                [edge("orders.reads", "api", "db")],
            ))
            manifest = self.manifest(root, [{
                "id": "view", "spec": "view.json",
                "scope": ["orders.api", "orders.missing"],
            }])
            report = validate_manifest.validate_manifest(manifest)
        self.assertIn("scope identity orders.missing is absent", " ".join(report.errors))

    def test_malformed_endpoint_refinement_and_owner_types_do_not_raise(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            malformed = node(
                "api", "orders.api", refines={"bad": True}, owner={"bad": True},
            )
            write_json(root, "view.json", spec(
                [malformed, node("db", "orders.db")],
                [{"identity": "orders.bad", "from": {"id": "api"},
                 "to": "db", "label": "calls"}],
            ))
            manifest = self.manifest(root, [{
                "id": "view", "spec": "view.json",
                "scope": ["orders.api", "orders.db"], "relationships": [],
            }])
            report = validate_manifest.validate_manifest(manifest)
        text = " ".join(report.errors)
        self.assertIn("refines", text)
        self.assertIn("owner", text)
        self.assertIn("edge references", text)

    def test_deep_cycle_detection_is_iterative(self):
        graph = {"n%d" % index: {"n%d" % (index + 1)} for index in range(5000)}
        graph["n5000"] = set()
        self.assertEqual(validate_manifest._cycle_nodes(graph), [])
        graph["n5000"] = {"n0"}
        self.assertTrue(validate_manifest._cycle_nodes(graph))

    def test_pairwise_relationship_comparison_rejects_sibling_endpoints(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            views = []
            definitions = [
                ("broad", "orders.api", "orders.db", [], []),
                ("one", "orders.api.one", "orders.db.one",
                 ["orders.api"], ["orders.db"]),
                ("two", "orders.api.two", "orders.db.two",
                 ["orders.api"], ["orders.db"]),
            ]
            for view_id, api, database, api_parent, db_parent in definitions:
                filename = "%s.json" % view_id
                write_json(root, filename, spec(
                    [node("api", api, refines=api_parent),
                     node("db", database, refines=db_parent)],
                    [edge("orders.reads", "api", "db")],
                ))
                views.append({
                    "id": view_id, "spec": filename,
                    "scope": [api, database],
                })
            manifest = self.manifest(root, views)
            report = validate_manifest.validate_manifest(manifest)
        self.assertIn("relationship orders.reads is inconsistent", " ".join(report.errors))

    def test_duplicate_relationship_identity_with_different_local_endpoints_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_json(root, "view.json", spec(
                [node("api", "orders.api"), node("db", "orders.db"),
                 node("audit", "orders.audit")],
                [edge("orders.reads", "api", "db"),
                 edge("orders.reads", "api", "audit")],
            ))
            manifest = self.manifest(root, [{
                "id": "view", "spec": "view.json",
                "scope": ["orders.api", "orders.db", "orders.audit"],
                "relationships": ["orders.reads"],
            }])
            report = validate_manifest.validate_manifest(manifest)
        self.assertIn("conflicting local endpoints", " ".join(report.errors))


    def test_descriptor_anchoring_survives_parent_replacement(self):
        with tempfile.TemporaryDirectory() as directory:
            parent = Path(directory).resolve()
            root = parent / "manifest"
            root.mkdir()
            outside = parent / "outside"
            outside.mkdir()
            write_json(outside, "view.json", {"not": "a valid spec"})
            nested = root / "nested"
            nested.mkdir()
            write_json(nested, "view.json", spec(
                [node("api", "orders.api"), node("db", "orders.db")],
                [edge("orders.reads", "api", "db")],
            ))
            manifest = self.manifest(root, [{
                "id": "nested", "spec": "nested/view.json",
                "scope": ["orders.api", "orders.db"],
                "relationships": ["orders.reads"],
            }])
            real_open = os.open
            replaced = False

            def replace_parent():
                nonlocal replaced
                replaced = True
                os.rename(nested, root / "nested-original")
                nested.symlink_to(outside, target_is_directory=True)

            def raced_open(path, flags, mode=0o777, *, dir_fd=None):
                if not replaced and dir_fd is None and Path(path) == nested / "view.json":
                    replace_parent()
                descriptor = real_open(path, flags, mode, dir_fd=dir_fd)
                if not replaced and path == "nested" and dir_fd is not None:
                    replace_parent()
                return descriptor

            with mock.patch.object(validate_manifest.os, "open", side_effect=raced_open):
                report = validate_manifest.validate_manifest(manifest)
        self.assertTrue(replaced)
        self.assertEqual(report.errors, ())
        self.assertEqual(report.review_needed, ())


    def test_manifest_rejects_parent_path_without_opening_it(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            manifest = self.manifest(root, [{
                "id": "escape", "spec": "../outside.json", "scope": ["x"],
            }])
            report = validate_manifest.validate_manifest(manifest)
        self.assertIn("inside the manifest directory", " ".join(report.errors))


if __name__ == "__main__":
    unittest.main(verbosity=2)
