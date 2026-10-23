#!/usr/bin/env python3
"""Behavioral regressions for the explicit assignment packet contract (SRS D2 / AC-2).

The helper is exercised through its CLI, so the assertions cover only observable
packet/error behavior: preserved authority and invariants, embedded dependency
evidence, rejection of incomplete or stale input, task section isolation,
content-addressed immutability and repository-state preservation.
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parents[3] / "skills/common/common-subagent-driven-development/scripts"
HELPER = SCRIPTS_DIR / "task_brief.py"

DEPENDENCY_BODY = "DEPENDENCY_BODY_SENTINEL: producer output text stays usable in the packet."


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class TaskBriefPacketTests(unittest.TestCase):
    BASE_PLAN = """# Provider-neutral plan

Preamble authority prose that must not be copied wholesale: ALLOW_ANYTHING_PREAMBLE.

## Task 1: Build the packet

TASK_ONE_BODY.

### Acceptance

- packet behavior exists

## Task 2: Unrelated work

TASK_TWO_UNRELATED_BODY.
"""

    def setUp(self) -> None:
        self.root = Path(tempfile.mkdtemp(prefix="sdd-task-brief-")).resolve()
        self.workspace = self.root / "workspace"
        self.workspace.mkdir()
        self.git("init")
        self.git("config", "user.name", "SDD Test")
        self.git("config", "user.email", "sdd@example.com")

        self.plan_path = self.workspace / "plan.md"
        self.plan_path.write_text(self.BASE_PLAN, encoding="utf-8")
        (self.workspace / "src").mkdir()
        (self.workspace / "src/module.py").write_text("MODULE = 'baseline'\n", encoding="utf-8")
        (self.workspace / "standards").mkdir()
        (self.workspace / "standards/python-testing.md").write_text("# Python testing\n", encoding="utf-8")
        (self.workspace / "owned-verification-dir").mkdir()
        self.git("add", "-A")
        self.git("commit", "-m", "baseline")

    def tearDown(self) -> None:
        shutil.rmtree(self.root, ignore_errors=True)

    # -- fixtures ---------------------------------------------------------

    def git(self, *args: str) -> str:
        return subprocess.run(
            ["git", *args],
            cwd=self.workspace,
            capture_output=True,
            text=True,
            check=True,
            timeout=60,
        ).stdout.strip()

    def set_plan(self, text: str) -> None:
        self.plan_path.write_text(text, encoding="utf-8")

    def out_path(self, name: str = "packet.md") -> Path:
        return self.workspace / "out" / name

    def assignment(self, *, task_number: int = 1, drop: tuple[str, ...] = (), **overrides) -> dict:
        data = {
            "schema_version": 1,
            "task_id": "task-1-packet",
            "task_number": task_number,
            "goal": "PACKET_GOAL_SENTINEL: produce the standalone packet.",
            "owner": "packet-owner",
            "project_domain": "agent-skills-standard / Personal",
            "workspace_root": str(self.workspace),
            "plan_sha256": sha256_file(self.plan_path),
            "non_goals": ["NON_GOAL_SENTINEL: no unrelated cleanup."],
            "authority": {
                "allowed_operations": ["AUTHORITY_ALLOWED: MAY edit only owned paths."],
                "forbidden_actions": ["AUTHORITY_FORBIDDEN: MUST NOT push or commit."],
                "required_approvals": ["AUTHORITY_APPROVAL: OPS-7 human approval."],
            },
            "global_invariants": ["INVARIANT_SENTINEL: never mutate the caller's git index."],
            "owned_paths": ["src/module.py"],
            "acceptance_criteria": [
                {"id": "AC-2.a", "expectation": "AC_EXPECTATION_SENTINEL: constraints appear in the packet."}
            ],
            "verification": [
                {
                    "command": "VERIFICATION_COMMAND_SENTINEL: python3 -m unittest",
                    "cwd": "owned-verification-dir",
                    "expected": "exit 0",
                }
            ],
            "required_standards": [
                {
                    "id": "python/python-testing",
                    "path": "standards/python-testing.md",
                    "revision": "rev-standards-1",
                }
            ],
            "source_revision": {"commit": "abc123", "branch": "task-2"},
            "dirty_identity": {"status": "dirty", "references": ["plan.md"]},
            "source_files": [
                {"path": "src/module.py", "sha256": sha256_file(self.workspace / "src/module.py")}
            ],
            "dependencies": [],
            "output_contract": {
                "receipt_destination": ".agent/sdd/plan/task-1-report.md",
                "status_vocabulary": ["TESTS_READY", "GREEN", "BLOCKED"],
                "stop_conditions": ["STOP_CONDITION_SENTINEL: no production helper edits at TESTS_READY."],
            },
            "limits": {"status": "unavailable", "note": "host resource limits not supplied"},
        }
        for key in drop:
            data.pop(key, None)
        data.update(overrides)
        return data

    def write_assignment(self, data: dict, name: str = "assignment.json") -> Path:
        path = self.workspace / name
        path.write_text(json.dumps(data), encoding="utf-8")
        return path

    def write_evidence(self, revision: str = "rev-1", body: str = DEPENDENCY_BODY) -> Path:
        path = self.workspace / "evidence" / "receipt.json"
        path.parent.mkdir(exist_ok=True)
        path.write_text(
            json.dumps(
                {
                    "artifact_id": "artifact-a",
                    "producer_task": "task-0-contracts",
                    "revision": revision,
                    "body": body,
                }
            ),
            encoding="utf-8",
        )
        return path

    def dependency_entry(self, required_revision: str = "rev-1") -> dict:
        return {
            "artifact_id": "artifact-a",
            "producer_task": "task-0-contracts",
            "required_revision": required_revision,
            "evidence_path": "evidence/receipt.json",
            "sha256": sha256_file(self.workspace / "evidence/receipt.json"),
        }

    def prepare(self, assignment_path: Path, *extra: str, task: str = "1", cwd: Path | None = None):
        return subprocess.run(
            ["python3", str(HELPER), str(self.plan_path), task, "--assignment", str(assignment_path), *extra],
            cwd=cwd or self.workspace,
            capture_output=True,
            text=True,
            timeout=60,
        )

    def prepare_success(self, assignment_path: Path, outfile: Path) -> str:
        result = self.prepare(assignment_path, "--out", str(outfile))
        self.assertEqual(result.returncode, 0, msg=result.stderr + result.stdout)
        self.assertTrue(outfile.is_file(), msg=result.stderr + result.stdout)
        return outfile.read_text(encoding="utf-8")

    def assert_rejected(self, result, code: int, outfile: Path, *tokens: str, must_not_exist: bool = True) -> None:
        self.assertEqual(result.returncode, code, msg=result.stderr + result.stdout)
        if must_not_exist:
            self.assertFalse(outfile.exists(), "failed preparation must not publish a packet")
        if tokens:
            stderr = result.stderr.lower()
            self.assertTrue(
                any(token.lower() in stderr for token in tokens),
                msg=f"error must identify {tokens!r}: {result.stderr}",
            )

    # -- preserved authority and task isolation ---------------------------

    def test_authority_and_invariants_preserved_without_unrelated_tasks(self) -> None:
        assignment_path = self.write_assignment(self.assignment())
        packet = self.prepare_success(assignment_path, self.out_path())

        for sentinel in (
            "PACKET_GOAL_SENTINEL",
            "packet-owner",
            "AUTHORITY_ALLOWED",
            "AUTHORITY_FORBIDDEN",
            "AUTHORITY_APPROVAL",
            "INVARIANT_SENTINEL",
            "NON_GOAL_SENTINEL",
            "AC-2.a",
            "AC_EXPECTATION_SENTINEL",
            "VERIFICATION_COMMAND_SENTINEL",
            "owned-verification-dir",
            "STOP_CONDITION_SENTINEL",
            "TASK_ONE_BODY",
        ):
            self.assertIn(sentinel, packet)

        self.assertNotIn("TASK_TWO_UNRELATED_BODY", packet)
        self.assertNotIn("ALLOW_ANYTHING_PREAMBLE", packet)

    # -- incomplete required input ---------------------------------------

    def test_incomplete_required_input_blocks_packet(self) -> None:
        cases = (
            ("owner", "", "owner"),
            ("acceptance_criteria", [], "acceptance_criteria"),
            ("verification", [], "verification"),
            ("owned_paths", [], "owned_paths"),
        )
        for field, value, token in cases:
            with self.subTest(field=field):
                assignment_path = self.write_assignment(self.assignment(**{field: value}))
                self.assert_rejected(
                    self.prepare(assignment_path, "--out", str(self.out_path())),
                    2,
                    self.out_path(),
                    token,
                )

    def test_missing_authority_blocks_packet(self) -> None:
        assignment_path = self.write_assignment(self.assignment(drop=("authority",)))
        self.assert_rejected(
            self.prepare(assignment_path, "--out", str(self.out_path())),
            2,
            self.out_path(),
            "authority",
        )

    def test_empty_authority_blocks_packet(self) -> None:
        assignment_path = self.write_assignment(self.assignment(authority={}))
        self.assert_rejected(
            self.prepare(assignment_path, "--out", str(self.out_path())),
            2,
            self.out_path(),
            "authority",
        )

    # -- stale identity ---------------------------------------------------

    def test_stale_plan_digest_rejected(self) -> None:
        assignment_path = self.write_assignment(self.assignment(plan_sha256="0" * 64))
        self.assert_rejected(
            self.prepare(assignment_path, "--out", str(self.out_path())),
            2,
            self.out_path(),
            "plan_sha256",
            "digest",
        )

    def test_stale_source_bytes_rejected(self) -> None:
        assignment_path = self.write_assignment(self.assignment())
        (self.workspace / "src/module.py").write_text("MODULE = 'changed after declaration'\n", encoding="utf-8")
        self.assert_rejected(
            self.prepare(assignment_path, "--out", str(self.out_path())),
            2,
            self.out_path(),
            "src/module.py",
            "source",
        )

    def test_stale_dependency_bytes_rejected(self) -> None:
        self.write_evidence()
        assignment_path = self.write_assignment(self.assignment(dependencies=[self.dependency_entry()]))
        self.write_evidence(body="DEPENDENCY_BODY_TAMPERED_AFTER_DIGEST")
        self.assert_rejected(
            self.prepare(assignment_path, "--out", str(self.out_path())),
            2,
            self.out_path(),
            "dependency",
            "digest",
            "receipt.json",
        )

    def test_dependency_producer_revision_mismatch_rejected(self) -> None:
        self.write_evidence(revision="rev-old")
        assignment_path = self.write_assignment(
            self.assignment(dependencies=[self.dependency_entry(required_revision="rev-new")])
        )
        self.assert_rejected(
            self.prepare(assignment_path, "--out", str(self.out_path())),
            2,
            self.out_path(),
            "revision",
            "rev-old",
            "rev-new",
        )

    # -- embedded dependency evidence ------------------------------------

    def test_required_dependency_evidence_embedded(self) -> None:
        self.write_evidence()
        assignment_path = self.write_assignment(self.assignment(dependencies=[self.dependency_entry()]))
        packet = self.prepare_success(assignment_path, self.out_path())

        self.assertIn(DEPENDENCY_BODY, packet)
        self.assertIn("artifact-a", packet)
        self.assertIn("task-0-contracts", packet)
        self.assertIn("rev-1", packet)

    # -- heading selection ------------------------------------------------

    def test_task_zero_nested_headings_and_fenced_pseudoheadings(self) -> None:
        plan = """# Provider-neutral plan

## Task 0: contracts

TASK_ZERO_INTRO

### Nested detail

NESTED_TASK_ZERO_CONTENT

~~~markdown
## Task 2: pseudo heading inside fence
FENCED_PSEUDO_CONTENT
~~~

TASK_ZERO_AFTER_FENCE

## Task 2: unrelated

TASK_TWO_REAL_BODY
"""
        self.set_plan(plan)
        assignment_path = self.write_assignment(
            self.assignment(task_number=0, task_id="task-0-contracts", owner="contracts-owner")
        )
        result = self.prepare(assignment_path, "--out", str(self.out_path()), task="0")
        self.assertEqual(result.returncode, 0, msg=result.stderr + result.stdout)
        packet = self.out_path().read_text(encoding="utf-8")

        self.assertIn("TASK_ZERO_INTRO", packet)
        self.assertIn("NESTED_TASK_ZERO_CONTENT", packet)
        self.assertIn("TASK_ZERO_AFTER_FENCE", packet)
        self.assertNotIn("TASK_TWO_REAL_BODY", packet)

    def test_duplicate_task_headings_rejected(self) -> None:
        self.set_plan(
            """# Plan

## Task 1: first

FIRST_BODY

## Task 1: second

SECOND_BODY
"""
        )
        assignment_path = self.write_assignment(self.assignment())
        self.assert_rejected(
            self.prepare(assignment_path, "--out", str(self.out_path())),
            3,
            self.out_path(),
        )

    # -- path boundaries --------------------------------------------------

    def test_traversal_and_symlink_escape_refused(self) -> None:
        self.write_evidence()
        outside = self.root / "outside-receipt.json"
        outside.write_text(
            json.dumps({"artifact_id": "artifact-a", "producer_task": "task-0-contracts", "revision": "rev-1",
                        "body": DEPENDENCY_BODY}),
            encoding="utf-8",
        )

        traversal = self.dependency_entry()
        traversal["evidence_path"] = "../outside-receipt.json"
        traversal["sha256"] = sha256_file(outside)
        assignment_path = self.write_assignment(self.assignment(dependencies=[traversal]))
        self.assert_rejected(
            self.prepare(assignment_path, "--out", str(self.out_path())),
            2,
            self.out_path(),
            "outside-receipt.json",
        )

        link = self.workspace / "evidence" / "linked-receipt.json"
        link.parent.mkdir(exist_ok=True)
        link.symlink_to(outside)
        symlinked = self.dependency_entry()
        symlinked["evidence_path"] = "evidence/linked-receipt.json"
        symlinked["sha256"] = sha256_file(outside)
        assignment_path = self.write_assignment(self.assignment(dependencies=[symlinked]), name="symlink.json")
        self.assert_rejected(
            self.prepare(assignment_path, "--out", str(self.out_path())),
            2,
            self.out_path(),
            "linked-receipt.json",
            "outside-receipt.json",
        )

    def test_explicit_output_outside_workspace_refused(self) -> None:
        assignment_path = self.write_assignment(self.assignment())
        escaped = self.root / "escaped-packet.md"
        self.assert_rejected(
            self.prepare(assignment_path, "--out", str(escaped)),
            2,
            escaped,
            "escaped-packet.md",
        )


    def test_default_primary_candidate_symlink_escape_refused_before_marker_write(self) -> None:
        artifact_root = self.workspace / ".agent" / "sdd"
        artifact_root.mkdir(parents=True)
        outside = self.root / "outside-primary"
        outside.mkdir()
        (artifact_root / "plan").symlink_to(outside, target_is_directory=True)
        assignment_path = self.write_assignment(self.assignment())

        result = self.prepare(assignment_path)

        self.assertEqual(result.returncode, 2, msg=result.stderr + result.stdout)
        self.assertFalse((outside / "plan-path").exists())

    def test_default_fallback_candidate_symlink_escape_refused_before_marker_write(self) -> None:
        artifact_root = self.workspace / ".agent" / "sdd"
        primary = artifact_root / "plan"
        primary.mkdir(parents=True)
        (primary / "plan-path").write_text("another-plan\n", encoding="utf-8")
        outside = self.root / "outside-fallback"
        outside.mkdir()
        (artifact_root / "plan-workspace").symlink_to(outside, target_is_directory=True)
        assignment_path = self.write_assignment(self.assignment())

        result = self.prepare(assignment_path)

        self.assertEqual(result.returncode, 2, msg=result.stderr + result.stdout)
        self.assertFalse((outside / "plan-path").exists())

    def test_default_numbered_candidate_symlink_escape_refused_before_marker_write(self) -> None:
        artifact_root = self.workspace / ".agent" / "sdd"
        primary = artifact_root / "plan"
        primary.mkdir(parents=True)
        (primary / "plan-path").write_text("another-plan\n", encoding="utf-8")
        fallback = artifact_root / "plan-workspace"
        fallback.mkdir()
        (fallback / "plan-path").write_text("another-plan\n", encoding="utf-8")
        outside = self.root / "outside-numbered"
        outside.mkdir()
        (artifact_root / "plan-workspace-2").symlink_to(outside, target_is_directory=True)
        assignment_path = self.write_assignment(self.assignment())

        result = self.prepare(assignment_path)

        self.assertEqual(result.returncode, 2, msg=result.stderr + result.stdout)
        self.assertFalse((outside / "plan-path").exists())

    def test_default_marker_symlink_escape_refused_before_open(self) -> None:
        artifact_root = self.workspace / ".agent" / "sdd"
        candidate = artifact_root / "plan"
        candidate.mkdir(parents=True)
        outside_marker = self.root / "outside-marker"
        outside_marker.write_text("preserve-me\n", encoding="utf-8")
        (candidate / "plan-path").symlink_to(outside_marker)
        assignment_path = self.write_assignment(self.assignment())

        result = self.prepare(assignment_path)

        self.assertEqual(result.returncode, 2, msg=result.stderr + result.stdout)
        self.assertEqual(outside_marker.read_text(encoding="utf-8"), "preserve-me\n")

    def test_legacy_workspace_resolution_without_authorized_root_still_works(self) -> None:
        result = subprocess.run(
            ["python3", str(SCRIPTS_DIR / "sdd_workspace.py"), str(self.plan_path)],
            cwd=self.workspace,
            capture_output=True,
            text=True,
            timeout=60,
        )

        self.assertEqual(result.returncode, 0, msg=result.stderr + result.stdout)

    def test_default_output_outside_declared_workspace_refused(self) -> None:
        subproject = self.workspace / "subproject"
        subproject.mkdir()
        assignment_path = self.write_assignment(self.assignment(
            workspace_root=str(subproject),
            owned_paths=["newdir/new.py"],
            verification=[{"command": "python3 -m unittest", "cwd": ".", "expected": "exit 0"}],
            source_files=[],
            required_standards=[],
        ))
        result = self.prepare(assignment_path)
        self.assertEqual(result.returncode, 2, msg=result.stderr + result.stdout)
        self.assertIn("workspace_root", result.stderr)
        self.assertFalse((self.workspace / ".agent").exists(),
                         "preflight must reject the resolver artifact root before creating it")

    def test_default_artifact_root_symlink_escape_refused(self) -> None:
        outside = self.root / "outside-agent"
        outside.mkdir()
        (self.workspace / ".agent").symlink_to(outside, target_is_directory=True)
        assignment_path = self.write_assignment(self.assignment())

        result = self.prepare(assignment_path)

        self.assertEqual(result.returncode, 2, msg=result.stderr + result.stdout)
        self.assertFalse((outside / "sdd").exists(), "resolver must not create escaped artifact directories")
        self.assertEqual(list(outside.glob("**/*.md")), [])

    def test_default_artifact_root_different_invocation_cwd_refused(self) -> None:
        assignment_path = self.write_assignment(self.assignment())
        result = self.prepare(assignment_path, cwd=self.root)

        self.assertEqual(result.returncode, 2, msg=result.stderr + result.stdout)
        self.assertIn("workspace_root", result.stderr)
        self.assertFalse((self.root / ".agent").exists(),
                         "preflight must reject an artifact root derived from a foreign working directory")

    def test_owned_directory_symlink_back_to_root_refused_and_new_paths_allowed(self) -> None:
        (self.workspace / "linked").symlink_to(self.workspace, target_is_directory=True)
        rejected = self.write_assignment(self.assignment(owned_paths=["linked"]), name="linked.json")
        self.assert_rejected(
            self.prepare(rejected, "--out", str(self.out_path())),
            2,
            self.out_path(),
            "owned_paths",
        )

        accepted = self.write_assignment(
            self.assignment(owned_paths=["newdir/new.py", "src/generated.py"]), name="new-paths.json"
        )
        packet = self.prepare_success(accepted, self.out_path("new-paths.md"))
        self.assertIn("newdir/new.py", packet)
        self.assertIn("src/generated.py", packet)

    def test_limits_require_concrete_declaration_or_status(self) -> None:
        invalid = self.write_assignment(self.assignment(limits={"note": "unspecified"}), name="limits-invalid.json")
        self.assert_rejected(
            self.prepare(invalid, "--out", str(self.out_path())),
            2,
            self.out_path(),
            "limits",
        )

        explicit = self.write_assignment(
            self.assignment(limits={"status": "advisory", "note": "host limits are advisory"}),
            name="limits-advisory.json",
        )
        self.prepare_success(explicit, self.out_path("limits.md"))

    def test_unwritable_output_parent_reports_prerequisite(self) -> None:
        blocker = self.workspace / "blocked"
        blocker.write_text("not a directory\n", encoding="utf-8")
        outfile = blocker / "packet.md"
        assignment_path = self.write_assignment(self.assignment())

        self.assert_rejected(self.prepare(assignment_path, "--out", str(outfile)), 2, outfile)

    @unittest.skipIf(os.name != "posix" or (hasattr(os, "geteuid") and os.geteuid() == 0),
                     "requires a non-root POSIX permission boundary")
    def test_unreadable_source_file_reports_prerequisite(self) -> None:
        assignment_path = self.write_assignment(self.assignment())
        source = self.workspace / "src/module.py"
        os.chmod(source, 0o000)
        try:
            result = self.prepare(assignment_path, "--out", str(self.out_path()))
        finally:
            os.chmod(source, 0o644)

        self.assert_rejected(result, 2, self.out_path(), "src/module.py", "source")

    def test_non_utf8_plan_rejected(self) -> None:
        raw = b"# Plan\n\n## Task 1\n\nTASK_ONE_BODY\n\xff\xfe\n"
        self.plan_path.write_bytes(raw)
        assignment_path = self.write_assignment(self.assignment())
        self.assert_rejected(
            self.prepare(assignment_path, "--out", str(self.out_path())),
            2,
            self.out_path(),
            "plan",
        )

    def test_non_utf8_dependency_receipt_rejected(self) -> None:
        evidence = self.workspace / "evidence" / "receipt.json"
        evidence.parent.mkdir(exist_ok=True)
        evidence.write_bytes(b'{"revision": "rev-1", "body": "\xff\xfe"}')
        dependency = {
            "artifact_id": "artifact-a",
            "producer_task": "task-0-contracts",
            "required_revision": "rev-1",
            "evidence_path": "evidence/receipt.json",
            "sha256": hashlib.sha256(evidence.read_bytes()).hexdigest(),
        }
        assignment_path = self.write_assignment(self.assignment(dependencies=[dependency]))
        self.assert_rejected(
            self.prepare(assignment_path, "--out", str(self.out_path())),
            2,
            self.out_path(),
            "evidence",
            "receipt.json",
        )

    # -- immutability and content addressing ------------------------------

    def packet_files(self) -> set[Path]:
        return set((self.workspace / ".agent" / "sdd").glob("**/*.md"))

    def test_changed_packets_are_content_addressed_and_collisions_protected(self) -> None:
        assignment_path = self.write_assignment(self.assignment())
        first = self.prepare(assignment_path)
        self.assertEqual(first.returncode, 0, msg=first.stderr + first.stdout)
        packets = self.packet_files()
        self.assertEqual(len(packets), 1, msg=first.stdout)
        first_packet = packets.pop()
        first_contents = first_packet.read_text(encoding="utf-8")
        self.assertIn("PACKET_GOAL_SENTINEL", first_contents)

        reused = self.prepare(assignment_path)
        self.assertEqual(reused.returncode, 0, msg=reused.stderr + reused.stdout)
        self.assertEqual(self.packet_files(), {first_packet})
        self.assertEqual(first_packet.read_text(encoding="utf-8"), first_contents)

        changed = self.write_assignment(self.assignment(goal="CHANGED_GOAL_SENTINEL"), name="changed.json")
        second = self.prepare(changed)
        self.assertEqual(second.returncode, 0, msg=second.stderr + second.stdout)
        packets = self.packet_files()
        self.assertEqual(len(packets), 2, msg=second.stdout)
        second_packet = (packets - {first_packet}).pop()
        self.assertIn("CHANGED_GOAL_SENTINEL", second_packet.read_text(encoding="utf-8"))
        self.assertEqual(first_packet.read_text(encoding="utf-8"), first_contents)

        explicit = self.out_path("explicit.md")
        self.assertIn("PACKET_GOAL_SENTINEL", self.prepare_success(assignment_path, explicit))
        original_explicit = explicit.read_text(encoding="utf-8")
        collision = self.prepare(changed, "--out", str(explicit))
        self.assert_rejected(collision, 3, explicit, must_not_exist=False)
        self.assertEqual(explicit.read_text(encoding="utf-8"), original_explicit)

    def test_default_preparation_does_not_mutate_repository_state(self) -> None:
        assignment_path = self.write_assignment(self.assignment())
        head_before = self.git("rev-parse", "HEAD")
        tree_before = self.git("write-tree")
        status_before = self.git("status", "--porcelain")

        result = self.prepare(assignment_path)
        self.assertEqual(result.returncode, 0, msg=result.stderr + result.stdout)

        self.assertEqual(self.git("rev-parse", "HEAD"), head_before)
        self.assertEqual(self.git("write-tree"), tree_before)
        self.assertEqual(self.git("status", "--porcelain"), status_before)
        self.assertEqual(len(self.packet_files()), 1, msg=result.stdout)


if __name__ == "__main__":
    unittest.main()
