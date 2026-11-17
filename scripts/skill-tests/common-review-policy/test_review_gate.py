"""C5 consumer intent: temporary Git repos exercise classification and refusal boundaries.

Intents: classify exact glob grammar; derive immutable control floors from base bytes;
refuse stale source/evidence/criteria/phase proofs; require complete minimum attention;
show a zero exit is consistency only; prove check leaves the Git index/object store unchanged.
Oracle: approved C5 in docs/srs/srs-agent-review-trust.md and SRS-ART-05/06.
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import stat
import unittest
from pathlib import Path
from typing import Any

SCRIPT = Path(__file__).resolve().parents[3] / "skills/common/common-review-policy/scripts/review_gate.py"
spec = importlib.util.spec_from_file_location("review_gate", SCRIPT)
assert spec and spec.loader
review_gate = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = review_gate
spec.loader.exec_module(review_gate)

POLICY = """# Review Policy

## Criticality Map
| Class | Glob | Reason |
| --- | --- | --- |
| trunk | src/core/** | core control |
| leaf | src/** | low-risk leaf |
| leaf | docs/ | docs |
"""


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def snapshot_tree(root: Path, *, include_git: bool = False) -> dict[str, tuple[int, bytes]]:
    snapshot: dict[str, tuple[int, bytes]] = {}
    for directory, names, files in os.walk(root, followlinks=False):
        if not include_git:
            names[:] = sorted(name for name in names if not (Path(directory) == root and name == ".git"))
        for name in sorted(files + [item for item in names if (Path(directory) / item).is_symlink()]):
            path = Path(directory) / name
            relative = path.relative_to(root).as_posix()
            info = path.lstat()
            contents = os.fsencode(os.readlink(path)) if os.path.islink(path) else path.read_bytes()
            snapshot[relative] = (stat.S_IMODE(info.st_mode), contents)
    return snapshot

class GateRepo(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.scope_receipt_path = self.root.parent / f"{self.root.name}-dispatch-scope.json"
        self.addCleanup(self.scope_receipt_path.unlink, missing_ok=True)
        self.git("init", "-q")
        self.git("config", "user.email", "test@example.invalid")
        self.git("config", "user.name", "Test Author")
        (self.root / "docs").mkdir()
        (self.root / "docs/review-policy.md").write_text(POLICY, encoding="utf-8")
        gate = self.root / "skills/common/common-review-policy/scripts/review_gate.py"
        gate.parent.mkdir(parents=True)
        gate.write_text("base checker marker\n", encoding="utf-8")
        (self.root / "src").mkdir()
        (self.root / "src/base.txt").write_text("base\n", encoding="utf-8")
        core = self.root / "src/core"
        core.mkdir()
        (core / "base.txt").write_text("core base\n", encoding="utf-8")
        self.git("add", "docs", "skills", "src")
        self.git("commit", "-qm", "baseline")
        self.base = self.git("rev-parse", "HEAD").stdout.decode().strip()

    def tearDown(self) -> None:
        self.temp.cleanup()

    def git(self, *args: str) -> subprocess.CompletedProcess[bytes]:
        result = subprocess.run(["git", *args], cwd=self.root, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
        if result.returncode:
            self.fail(result.stderr.decode("utf-8", "replace"))
        return result

    def write_scope_receipt(self, inventory: list[str], source_scope: list[dict[str, str]] | None = None) -> dict[str, Any]:
        body = {"schema_version": 1, "artifact_scope": "artifacts/run",
                "artifact_inventory": inventory,
                "source_scope": source_scope or [{"path": "src", "kind": "directory"}]}
        digest = sha(json.dumps(body, sort_keys=True, separators=(",", ":")).encode())
        receipt = {**body, "scope_inventory_sha256": digest}
        path = self.scope_receipt_path
        path.write_text(json.dumps(receipt, sort_keys=True), encoding="utf-8")
        return receipt

    def run_gate(self, *args: str) -> subprocess.CompletedProcess[bytes]:
        return subprocess.run([sys.executable, "-B", str(SCRIPT), *args], cwd=self.root,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)

    def make_report(self, *, verdict: str = "READY", change_class: str = "leaf", review_level: str = "line-review",
                    changed_path: str = "src/change.txt", rename_from: str | None = None, attention: bool = False,
                    criterion_required: bool = True, criterion_applicable: bool = True,
                    criterion_result: str = "PASS", scope_reason: str | None = None) -> Path:
        changed = self.root / changed_path
        changed.parent.mkdir(parents=True, exist_ok=True)
        if rename_from:
            changed.unlink(missing_ok=True)
            os.rename(self.root / rename_from, changed)
        else:
            changed.write_text("added\n", encoding="utf-8")
        artifact_dir = self.root / "artifacts/run"
        artifact_dir.mkdir(parents=True, exist_ok=True)
        names = ["report.json", "criteria.json", "baseline.json", "blind.json", "blind-receipt.json",
                 "check.json", "check-output.txt", "proof.json"]
        for name in names:
            (artifact_dir / name).write_text("{}\n", encoding="utf-8")
        (artifact_dir / "check-output.txt").write_text("focused check passed\n", encoding="utf-8")
        report_path = artifact_dir / "report.json"
        inventory_path = artifact_dir / "criteria.json"
        criteria_doc = {"schema_version": 1, "criteria": [{"id": "C1", "required": criterion_required, "applicable": criterion_applicable}]}
        inventory_path.write_text(json.dumps(criteria_doc), encoding="utf-8")
        inventory = [f"artifacts/run/{name}" for name in names]
        scope_receipt = self.write_scope_receipt(inventory)
        policy_data, policy_digest = review_gate._policy_from_base(self.root, self.base, "docs/review-policy.md")
        self.assertIsNotNone(policy_data)
        head = self.git("rev-parse", "HEAD").stdout.decode().strip()
        excluded = {os.fsencode(path) for path in inventory}
        manifest, base_map, head_map, index_map, fs_map = review_gate._manifest(
            self.root, self.base, head, policy_digest, excluded, inventory, scope_receipt["scope_inventory_sha256"]
        )
        criterion_digest = sha(inventory_path.read_bytes())
        (artifact_dir / "baseline.json").write_text(json.dumps(
            {"schema_version": 1, "base_oid": self.base, "criterion_inventory_sha256": criterion_digest}), encoding="utf-8")
        blind_digest = sha((artifact_dir / "blind.json").read_bytes())
        (artifact_dir / "blind-receipt.json").write_text(json.dumps(
            {"schema_version": 1, "source_revision": head, "dirty_identity": manifest, "artifact_sha256": blind_digest}), encoding="utf-8")
        check_raw = {"path": "artifacts/run/check-output.txt",
                     "sha256": sha((artifact_dir / "check-output.txt").read_bytes())}
        check_entry = {"command": "python -m unittest", "cwd": ".", "exit_code": 0, "raw_output": check_raw,
                       "status": "PASS", "required": True, "scope_reason": None}
        (artifact_dir / "check.json").write_text(json.dumps(
            {"schema_version": 1, "source_revision": head, "dirty_identity": manifest, "checks": [check_entry]}), encoding="utf-8")
        proof = {"path": "artifacts/run/proof.json", "sha256": sha((artifact_dir / "proof.json").read_bytes())}
        all_units = (review_gate._units(base_map, head_map, "base-head")
                     + review_gate._units(base_map, index_map, "base-index")
                     + review_gate._units(base_map, fs_map, "base-worktree"))
        attention_rows: list[dict[str, Any]] = []
        if attention:
            by_path: dict[str, list[str]] = {}
            for unit in all_units:
                by_path.setdefault(unit["path"], []).append(unit["id"])
            attention_rows = [{"path": path, "unit_ids": ids} for path, ids in by_path.items()]
        criterion_file = {"path": "artifacts/run/criteria.json", "sha256": criterion_digest}
        report: dict[str, Any] = {
            "schema_version": 1,
            "dispatch": {"base_oid": self.base, "head_oid": head, "policy_path": "docs/review-policy.md",
                         "policy_sha256": policy_digest, "criterion_inventory": criterion_file,
                         "artifact_inventory": inventory, "artifact_scope": "artifacts/run",
                         "scope_inventory_sha256": scope_receipt["scope_inventory_sha256"]},
            "source_identity": {"base_oid": self.base, "head_oid": head, "manifest_sha256": manifest,
                                 "dirty_identity": manifest, "policy_sha256": policy_digest},
            "artifact_inventory": inventory,
            "baseline_receipt": {"path": "artifacts/run/baseline.json", "sha256": sha((artifact_dir / "baseline.json").read_bytes())},
            "verdict": verdict,
            "change_class": change_class,
            "reversibility": "revertible",
            "review_level": review_level,
            "actors": {"implementer": "author", "reviewer": "reviewer"},
            "criteria": [{"id": "C1", "result": criterion_result, "scope_reason": scope_reason, "proof": proof}],
            "blind_phase": {"artifact": {"path": "artifacts/run/blind.json", "sha256": blind_digest},
                            "frozen_receipt": {"path": "artifacts/run/blind-receipt.json", "sha256": sha((artifact_dir / "blind-receipt.json").read_bytes())},
                            "frozen_before_reconcile": True},
            "orchestrator_check_receipt": {"path": "artifacts/run/check.json", "sha256": sha((artifact_dir / "check.json").read_bytes())},
            "reviewer_reproduced": {"command": "python -m unittest", "claimed": "PASS", "observed": "PASS"},
            "reproduction_gap": None,
            "gate": {"flag": "none: local test", "control": "no external side effects", "rollback": "revert",
                     "reversibility": "revertible", "authorization": None},
            "policy_evidence": {"grant_reference": None, "calibration_evidence": []},
            "findings": [],
            "human_attention": attention_rows,
            "reviewer_nominations": [],
        }
        report_path.write_text(json.dumps(report), encoding="utf-8")
        return report_path

    def check(self, report_path: Path) -> subprocess.CompletedProcess[bytes]:
        return self.run_gate("check", "--report", str(report_path.relative_to(self.root)),
                             "--policy", "docs/review-policy.md", "--base", self.base,
                             "--dispatch-receipt", str(self.scope_receipt_path))
    def rebind_inventory(self, report_path: Path, extra_path: str,
                         source_scope: list[dict[str, str]] | None = None) -> None:
        value = json.loads(report_path.read_text())
        inventory = sorted([*value["artifact_inventory"], extra_path])
        value["artifact_inventory"] = inventory
        value["dispatch"]["artifact_inventory"] = inventory
        scope_receipt = self.write_scope_receipt(inventory, source_scope)
        value["dispatch"]["scope_inventory_sha256"] = scope_receipt["scope_inventory_sha256"]
        policy_data, policy_digest = review_gate._policy_from_base(self.root, self.base, "docs/review-policy.md")
        self.assertIsNotNone(policy_data)
        head = self.git("rev-parse", "HEAD").stdout.decode().strip()
        excluded = {os.fsencode(path) for path in inventory}
        manifest, *_ = review_gate._manifest(
            self.root, self.base, head, policy_digest, excluded, inventory, scope_receipt["scope_inventory_sha256"]
        )
        value["source_identity"]["manifest_sha256"] = manifest
        value["source_identity"]["dirty_identity"] = manifest
        phase_path = self.root / value["blind_phase"]["frozen_receipt"]["path"]
        phase = json.loads(phase_path.read_text())
        phase["dirty_identity"] = manifest
        phase_path.write_text(json.dumps(phase), encoding="utf-8")
        value["blind_phase"]["frozen_receipt"]["sha256"] = sha(phase_path.read_bytes())
        check_path = self.root / value["orchestrator_check_receipt"]["path"]
        check = json.loads(check_path.read_text())
        check["dirty_identity"] = manifest
        check_path.write_text(json.dumps(check), encoding="utf-8")
        value["orchestrator_check_receipt"]["sha256"] = sha(check_path.read_bytes())
        report_path.write_text(json.dumps(value), encoding="utf-8")



class ClassifyTests(GateRepo):
    def test_candidate_policy_classification_and_control_floor(self) -> None:
        result = self.run_gate("classify", "--policy", "docs/review-policy.md", "--paths", "src/core/a.py", "src/app/a.py",
                               "docs/guide.md", "website/home.html", "skills/metadata.json",
                               "CODEOWNERS", ".github/CODEOWNERS", "docs/CODEOWNERS", "--json")
        self.assertEqual(result.returncode, 0, result.stderr.decode())
        values = {item["path"]: item["class"] for item in json.loads(result.stdout)["paths"]}
        self.assertEqual(values, {"src/core/a.py": "trunk", "src/app/a.py": "leaf", "docs/guide.md": "leaf",
                                  "website/home.html": "shared", "skills/metadata.json": "trunk",
                                  "CODEOWNERS": "trunk", ".github/CODEOWNERS": "trunk", "docs/CODEOWNERS": "trunk"})
    def test_candidate_leaf_row_cannot_downgrade_root_ownership_ledger(self) -> None:
        policy = (POLICY.rstrip() + "\n| leaf | .skills-lock.json | leaf override |\n").encode()
        (self.root / "docs/review-policy.md").write_bytes(policy)
        result = self.run_gate("classify", "--policy", "docs/review-policy.md",
                               "--paths", ".skills-lock.json", "--json")
        self.assertEqual(result.returncode, 0, result.stderr.decode())
        self.assertEqual(json.loads(result.stdout)["paths"], [{"path": ".skills-lock.json", "class": "trunk"}])


    def test_component_star_and_recursive_star_differ(self) -> None:
        data = b"## Criticality Map\n| Class | Glob | Reason |\n| --- | --- | --- |\n| leaf | src/* | one component |\n"
        (self.root / "docs/review-policy.md").write_bytes(data)
        result = self.run_gate("classify", "--policy", "docs/review-policy.md", "--paths", "src/file.py", "src/deep/file.py", "--json")
        self.assertEqual(result.returncode, 0, result.stderr.decode())
        values = {item["path"]: item["class"] for item in json.loads(result.stdout)["paths"]}
        self.assertEqual(values, {"src/file.py": "leaf", "src/deep/file.py": "shared"})

    def test_malformed_policy_and_missing_map_are_distinct(self) -> None:
        (self.root / "docs/review-policy.md").write_text("## Criticality Map\n| bad | header |\n", encoding="utf-8")
        malformed = self.run_gate("classify", "--policy", "docs/review-policy.md", "--paths", "src/a.py")
        self.assertEqual(malformed.returncode, 2)
        (self.root / "docs/review-policy.md").write_text("# No map\n", encoding="utf-8")
        missing = self.run_gate("classify", "--policy", "docs/review-policy.md", "--paths", "src/a.py", "--json")
        self.assertEqual(missing.returncode, 0)
        self.assertEqual(json.loads(missing.stdout)["paths"][0]["class"], "unclassified")

    def test_invalid_glob_syntax_is_rejected(self) -> None:
        for glob in ("/absolute", "src/../secret", "src//a", "!src/**", "src/[ab]", "src/escaped\\|pipe"):
            with self.subTest(glob=glob):
                (self.root / "docs/review-policy.md").write_text(
                    f"## Criticality Map\n| Class | Glob | Reason |\n| --- | --- | --- |\n| leaf | {glob} | reason |\n", encoding="utf-8")
                result = self.run_gate("classify", "--policy", "docs/review-policy.md", "--paths", "src/a.py")
                self.assertEqual(result.returncode, 2)


class CheckTests(GateRepo):
    def test_clean_consistent_report_exits_zero_without_repository_mutation(self) -> None:
        report = self.make_report()
        before = snapshot_tree(self.root, include_git=True)
        receipt_before = self.scope_receipt_path.read_bytes()
        result = self.check(report)
        self.assertEqual(result.returncode, 0, result.stderr.decode())
        self.assertIn(b"does not authenticate", result.stdout)
        self.assertEqual(snapshot_tree(self.root, include_git=True), before)
        self.assertEqual(self.scope_receipt_path.read_bytes(), receipt_before)

    def test_same_declared_actor_refuses(self) -> None:
        report = self.make_report()
        value = json.loads(report.read_text())
        value["actors"]["reviewer"] = "author"
        report.write_text(json.dumps(value))
        result = self.check(report)
        self.assertEqual(result.returncode, 1)
        self.assertIn(b"SAME_ACTOR", result.stderr)

    def test_source_change_after_freeze_refuses(self) -> None:
        report = self.make_report()
        (self.root / "src/change.txt").write_text("changed after freeze\n", encoding="utf-8")
        result = self.check(report)
        self.assertEqual(result.returncode, 1)
        self.assertIn(b"SOURCE_IDENTITY_MISMATCH", result.stderr)

    def test_missing_phase_proof_refuses(self) -> None:
        report = self.make_report()
        value = json.loads(report.read_text())
        value["blind_phase"]["artifact"]["sha256"] = "0" * 64
        report.write_text(json.dumps(value))
        result = self.check(report)
        self.assertEqual(result.returncode, 1)
        self.assertIn(b"EVIDENCE_DIGEST_MISMATCH", result.stderr)

    def test_missing_criterion_refuses(self) -> None:
        report = self.make_report()
        value = json.loads(report.read_text())
        value["criteria"] = []
        report.write_text(json.dumps(value))
        result = self.check(report)
        self.assertEqual(result.returncode, 1)
        self.assertIn(b"CRITERION_INVENTORY_MISMATCH", result.stderr)
    def test_ready_requires_a_frozen_required_check_result(self) -> None:
        report = self.make_report()
        check_path = self.root / "artifacts/run/check.json"
        receipt = json.loads(check_path.read_text())
        receipt["checks"][0]["required"] = False
        check_path.write_text(json.dumps(receipt), encoding="utf-8")
        value = json.loads(report.read_text())
        value["orchestrator_check_receipt"]["sha256"] = sha(check_path.read_bytes())
        report.write_text(json.dumps(value), encoding="utf-8")
        result = self.check(report)
        self.assertEqual(result.returncode, 1)
        self.assertIn(b"READY_CHECKS_MISSING", result.stderr)

    def test_report_only_is_unconditionally_disabled(self) -> None:
        report = self.make_report(review_level="report-only")
        result = self.check(report)
        self.assertEqual(result.returncode, 1)
        self.assertIn(b"REPORT_ONLY_DISABLED", result.stderr)

    def test_unjustified_required_not_applicable_refuses_ready(self) -> None:
        report = self.make_report(criterion_applicable=False, criterion_result="NOT APPLICABLE", scope_reason="")
        result = self.check(report)
        self.assertEqual(result.returncode, 1)
        self.assertIn(b"UNJUSTIFIED_NOT_APPLICABLE", result.stderr)

    def test_rename_from_trunk_cannot_be_downgraded(self) -> None:
        report = self.make_report(change_class="trunk", changed_path="src/renamed.txt",
                                  rename_from="src/core/base.txt", attention=True)
        result = self.check(report)
        self.assertEqual(result.returncode, 0, result.stderr.decode())

    def test_trunk_diff_unit_requires_human_attention(self) -> None:
        report = self.make_report(change_class="trunk", changed_path="src/core/new.txt")
        result = self.check(report)
        self.assertEqual(result.returncode, 1)
        self.assertIn(b"ATTENTION_COVERAGE_INCOMPLETE", result.stderr)
    def test_ownership_ledger_requires_and_accepts_complete_trunk_attention(self) -> None:
        missing = self.make_report(change_class="trunk", changed_path=".skills-lock.json")
        refused = self.check(missing)
        self.assertEqual(refused.returncode, 1)
        self.assertIn(b"ATTENTION_COVERAGE_INCOMPLETE", refused.stderr)

        self.tearDown()
        self.setUp()
        complete = self.make_report(change_class="trunk", changed_path=".skills-lock.json", attention=True)
        accepted = self.check(complete)
        self.assertEqual(accepted.returncode, 0, accepted.stderr.decode())

    def test_base_policy_ignores_worktree_policy_edits(self) -> None:
        (self.root / "docs/review-policy.md").write_text("# changed candidate policy\n", encoding="utf-8")
        (self.root / "src/core/new.txt").write_text("new\n", encoding="utf-8")
        self.git("add", "src/core/new.txt")
        self.git("commit", "-qm", "core change")
        result = self.run_gate("classify", "--policy", "docs/review-policy.md", "--base", self.base, "--json")
        self.assertEqual(result.returncode, 0, result.stderr.decode())
        values = {row["path"]: row["class"] for row in json.loads(result.stdout)["paths"]}
        self.assertEqual(values["src/core/new.txt"], "trunk")

    def test_staged_dirty_and_ignored_worktree_content_are_in_identity(self) -> None:
        staged_report = self.make_report()
        self.git("add", "src/change.txt")
        staged = self.check(staged_report)
        self.assertEqual(staged.returncode, 1)
        self.assertIn(b"SOURCE_IDENTITY_MISMATCH", staged.stderr)
        self.tearDown()
        self.setUp()
        ignored_report = self.make_report()
        with (self.root / ".git/info/exclude").open("ab") as exclude:
            exclude.write(b"\nignored-secret\n")
        (self.root / "ignored-secret").write_bytes(b"ignored still counts\n")
        ignored = self.check(ignored_report)
        self.assertEqual(ignored.returncode, 1)
        self.assertIn(b"SOURCE_IDENTITY_MISMATCH", ignored.stderr)

    def test_worktree_mode_and_symlink_changes_are_in_identity(self) -> None:
        report = self.make_report()
        (self.root / "src/change.txt").chmod(0o755)
        result = self.check(report)
        self.assertEqual(result.returncode, 1)
        self.assertIn(b"SOURCE_IDENTITY_MISMATCH", result.stderr)
        self.tearDown()
        self.setUp()
        report = self.make_report()
        (self.root / "src/link").symlink_to("change.txt")
        result = self.check(report)
        self.assertEqual(result.returncode, 1)
        self.assertIn(b"SOURCE_IDENTITY_MISMATCH", result.stderr)

    def test_unmerged_index_and_submodule_are_refused(self) -> None:
        report = self.make_report()
        blob = self.git("rev-parse", "HEAD:src/base.txt").stdout.decode().strip()
        self.git("update-index", "--force-remove", "src/base.txt")
        for stage in (1, 2):
            result = subprocess.run(["git", "update-index", "--index-info"], cwd=self.root,
                                    input=f"100644 {blob} {stage}\tsrc/base.txt\n".encode(),
                                    stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
            self.assertEqual(result.returncode, 0, result.stderr.decode())
        unmerged = self.check(report)
        self.assertEqual(unmerged.returncode, 2)
        self.assertIn(b"UNMERGED_INDEX", unmerged.stderr)
        self.tearDown()
        self.setUp()
        report = self.make_report()
        self.git("update-index", "--add", "--cacheinfo", f"160000,{self.base},submodule")
        submodule = self.check(report)
        self.assertEqual(submodule.returncode, 2)
        self.assertIn(b"UNSUPPORTED_SUBMODULE", submodule.stderr)

    def test_special_files_and_evidence_symlinks_are_refused(self) -> None:
        report = self.make_report()
        os.mkfifo(self.root / "src/pipe")
        special = self.check(report)
        self.assertEqual(special.returncode, 2)
        self.assertIn(b"UNSUPPORTED_FILE_TYPE", special.stderr)
        self.tearDown()
        self.setUp()
        report = self.make_report()
        (self.root / "artifacts/run/alias.json").symlink_to("proof.json")
        self.rebind_inventory(report, "artifacts/run/alias.json")
        result = self.check(report)
        self.assertEqual(result.returncode, 1)
        self.assertIn(b"EVIDENCE_PATH_UNSAFE", result.stderr)

    def test_policy_and_report_path_cannot_escape_or_substitute(self) -> None:
        report = self.make_report()
        (self.root / "docs/review-policy.md").write_text("# altered policy\n", encoding="utf-8")
        policy = self.check(report)
        self.assertEqual(policy.returncode, 1)
        self.assertIn(b"SOURCE_IDENTITY_MISMATCH", policy.stderr)
        external = self.run_gate("check", "--report", str(Path(self.temp.name).parent / "outside.json"),
                                 "--policy", "docs/review-policy.md", "--base", self.base,
                                 "--dispatch-receipt", str(self.scope_receipt_path))
        self.assertEqual(external.returncode, 1)
        self.assertIn(b"EVIDENCE_PATH_UNSAFE", external.stderr)

    def test_unexecuted_reproduction_cannot_support_ready(self) -> None:
        report = self.make_report()
        value = json.loads(report.read_text())
        value["reviewer_reproduced"]["claimed"] = "NOT RUN"
        value["reviewer_reproduced"]["observed"] = "NOT RUN"
        report.write_text(json.dumps(value), encoding="utf-8")
        result = self.check(report)
        self.assertEqual(result.returncode, 1)
        self.assertIn(b"REPRODUCTION_EVIDENCE_MISSING", result.stderr)

    def test_static_review_with_explicit_reproduction_gap_is_consistent(self) -> None:
        report = self.make_report()
        value = json.loads(report.read_text())
        value["reviewer_reproduced"] = None
        value["reproduction_gap"] = "Execution unavailable; source-only review recorded."
        report.write_text(json.dumps(value), encoding="utf-8")
        result = self.check(report)
        self.assertEqual(result.returncode, 0, result.stderr.decode())

    def test_required_not_run_and_missing_reproduction_refuse(self) -> None:
        report = self.make_report(criterion_result="NOT RUN")
        result = self.check(report)
        self.assertEqual(result.returncode, 1)
        self.assertIn(b"REQUIRED_CRITERION_INCOMPLETE", result.stderr)
        self.tearDown()
        self.setUp()
        report = self.make_report()
        value = json.loads(report.read_text())
        value["reviewer_reproduced"] = None
        value["reproduction_gap"] = None
        report.write_text(json.dumps(value))
        result = self.check(report)
        self.assertEqual(result.returncode, 1)
        self.assertIn(b"REPRODUCTION_EVIDENCE_MISSING", result.stderr)

    def test_claim_mismatch_requires_blocker_and_ready_rejects_open_major(self) -> None:
        report = self.make_report()
        value = json.loads(report.read_text())
        value["reviewer_reproduced"]["claimed"] = "FAIL"
        report.write_text(json.dumps(value))
        mismatch = self.check(report)
        self.assertEqual(mismatch.returncode, 1)
        self.assertIn(b"CLAIM_RESULT_MISMATCH", mismatch.stderr)
        self.tearDown()
        self.setUp()
        report = self.make_report()
        value = json.loads(report.read_text())
        value["findings"] = [{"severity": "Major", "path": "src/change.txt", "open": True,
                              "evidence": "test", "why": "risk", "fix": "fix", "prevent_by": "guidance"}]
        report.write_text(json.dumps(value))
        finding = self.check(report)
        self.assertEqual(finding.returncode, 1)
        self.assertIn(b"OPEN_MAJOR_FINDING", finding.stderr)
    def test_hunk_grant_absent_and_one_way_require_line_review(self) -> None:
        report = self.make_report(review_level="hunk-review")
        hunk = self.check(report)
        self.assertEqual(hunk.returncode, 1)
        self.assertIn(b"BASE_POLICY_GRANT_MISSING", hunk.stderr)
        self.tearDown()
        self.setUp()
        report = self.make_report()
        value = json.loads(report.read_text())
        value["gate"].update({"reversibility": "one-way", "rollback": "one-way", "authorization": "auth-ref"})
        value["reversibility"] = "one-way"
        value["review_level"] = "not-assessed"
        report.write_text(json.dumps(value))
        one_way = self.check(report)
        self.assertEqual(one_way.returncode, 1)
        self.assertIn(b"LINE_REVIEW_REQUIRED", one_way.stderr)
    def test_hunk_review_accepts_only_matching_base_policy_grant(self) -> None:
        policy = self.root / "docs/review-policy.md"
        policy.write_text(POLICY + "\n## Approval\n\n"
                          "| Change class | Reversibility | Review level | Reviewer | Approver | Owner grant reference |\n"
                          "| --- | --- | --- | --- | --- | --- |\n"
                          "| leaf | revertible | hunk-review | reviewer role | owner role | grant-7 |\n",
                          encoding="utf-8")
        self.git("add", "docs/review-policy.md")
        self.git("commit", "-qm", "base policy grant")
        self.base = self.git("rev-parse", "HEAD").stdout.decode().strip()
        report = self.make_report(review_level="hunk-review")
        value = json.loads(report.read_text())
        value["policy_evidence"]["grant_reference"] = "grant-7"
        report.write_text(json.dumps(value), encoding="utf-8")
        result = self.check(report)
        self.assertEqual(result.returncode, 0, result.stderr.decode())
    def test_required_check_failure_blocks_ready(self) -> None:
        report = self.make_report()
        check_path = self.root / "artifacts/run/check.json"
        receipt = json.loads(check_path.read_text())
        receipt["checks"][0].update({"status": "FAIL", "exit_code": 1})
        check_path.write_text(json.dumps(receipt), encoding="utf-8")
        value = json.loads(report.read_text())
        value["orchestrator_check_receipt"]["sha256"] = sha(check_path.read_bytes())
        report.write_text(json.dumps(value), encoding="utf-8")
        result = self.check(report)
        self.assertEqual(result.returncode, 1)
        self.assertIn(b"READY_CHECK_INCOMPLETE", result.stderr)

    def test_claim_mismatch_is_represented_by_open_blocker(self) -> None:
        report = self.make_report(verdict="NOT READY", attention=True)
        value = json.loads(report.read_text())
        value["reviewer_reproduced"]["claimed"] = "FAIL"
        value["findings"] = [{"severity": "Blocker", "path": "src/change.txt", "open": True,
                              "evidence": "claimed FAIL but observed PASS", "why": "claim differs from observed",
                              "fix": "resolve evidence", "prevent_by": "test"}]
        report.write_text(json.dumps(value), encoding="utf-8")
        result = self.check(report)
        self.assertEqual(result.returncode, 0, result.stderr.decode())
    def test_non_utf8_filename_bytes_survive_manifest_scan(self) -> None:
        path = os.path.join(os.fsencode(self.root), b"src/\xff")
        try:
            descriptor = os.open(path, os.O_CREAT | os.O_WRONLY, 0o600)
        except OSError as exc:
            self.skipTest(f"filesystem cannot create non-UTF-8 filenames: {exc}")
        try:
            os.write(descriptor, b"raw path\n")
        finally:
            os.close(descriptor)
        report = self.make_report()
        result = self.check(report)
        self.assertEqual(result.returncode, 0, result.stderr.decode())

    def test_duplicate_json_keys_are_malformed(self) -> None:
        report = self.make_report()
        report.write_text('{"schema_version":1,"schema_version":1}')
        result = self.check(report)
        self.assertEqual(result.returncode, 2)
        self.assertIn(b"DUPLICATE_JSON_KEY", result.stderr)
    def test_report_cannot_reference_itself_as_evidence(self) -> None:
        report = self.make_report()
        value = json.loads(report.read_text())
        value["criteria"][0]["proof"]["path"] = "artifacts/run/report.json"
        report.write_text(json.dumps(value))
        result = self.check(report)
        self.assertEqual(result.returncode, 1)
        self.assertIn(b"EVIDENCE_SELF_REFERENCE", result.stderr)

    def test_staged_change_survives_worktree_restoration(self) -> None:
        report = self.make_report()
        source = self.root / "src/base.txt"
        source.write_text("staged but restored\n", encoding="utf-8")
        self.git("add", "src/base.txt")
        source.write_text("base\n", encoding="utf-8")
        result = self.check(report)
        self.assertEqual(result.returncode, 1)
        self.assertIn(b"SOURCE_IDENTITY_MISMATCH", result.stderr)


    def test_unreferenced_artifact_cannot_be_excluded_even_if_changed(self) -> None:
        report = self.make_report()
        plugin = self.root / "artifacts/run/plugin.py"
        plugin.write_text("source masquerading as evidence\n", encoding="utf-8")
        self.rebind_inventory(report, "artifacts/run/plugin.py")
        plugin.write_text("mutated after freeze\n", encoding="utf-8")
        result = self.check(report)
        self.assertEqual(result.returncode, 1)
        self.assertIn(b"ARTIFACT_INVENTORY_UNUSED", result.stderr)

    def test_executable_evidence_cannot_be_excluded_as_artifact(self) -> None:
        report = self.make_report()
        (self.root / "artifacts/run/check-output.txt").chmod(0o755)
        result = self.check(report)
        self.assertEqual(result.returncode, 1)
        self.assertIn(b"ARTIFACT_EXECUTABLE", result.stderr)

    def test_referenced_artifact_cannot_overlap_external_source_scope(self) -> None:
        report = self.make_report()
        plugin_path = "artifacts/run/plugin.py"
        plugin = self.root / plugin_path
        plugin.write_text("source masquerading as proof\n", encoding="utf-8")
        self.rebind_inventory(report, plugin_path,
                              [{"path": "src", "kind": "directory"}, {"path": plugin_path, "kind": "file"}])
        value = json.loads(report.read_text())
        value["criteria"][0]["proof"] = {"path": plugin_path, "sha256": sha(plugin.read_bytes())}
        value["policy_evidence"]["calibration_evidence"] = [
            {"path": "artifacts/run/proof.json", "sha256": sha((self.root / "artifacts/run/proof.json").read_bytes())}
        ]
        report.write_text(json.dumps(value), encoding="utf-8")
        result = self.check(report)
        self.assertEqual(result.returncode, 1)
        self.assertIn(b"ARTIFACT_SOURCE_OVERLAP", result.stderr)

    def test_arbitrary_format_evidence_remains_supported(self) -> None:
        report = self.make_report()
        path = "artifacts/run/opaque.evidence"
        artifact = self.root / path
        artifact.write_bytes(b"\x00arbitrary evidence\xff")
        self.rebind_inventory(report, path)
        value = json.loads(report.read_text())
        value["policy_evidence"]["calibration_evidence"].append(
            {"path": path, "sha256": sha(artifact.read_bytes())})
        report.write_text(json.dumps(value), encoding="utf-8")
        result = self.check(report)
        self.assertEqual(result.returncode, 0, result.stderr.decode())

    def test_external_dispatch_receipt_digest_mismatch_refuses(self) -> None:
        report = self.make_report()
        receipt = json.loads(self.scope_receipt_path.read_text())
        receipt["source_scope"][0]["path"] = "other"
        self.scope_receipt_path.write_text(json.dumps(receipt), encoding="utf-8")
        result = self.check(report)
        self.assertEqual(result.returncode, 1)
        self.assertIn(b"DISPATCH_RECEIPT_DIGEST_MISMATCH", result.stderr)

    def test_pass_criterion_scope_reason_must_be_string_or_null(self) -> None:
        for reason in ([], {}):
            with self.subTest(reason=reason):
                report = self.make_report()
                value = json.loads(report.read_text())
                value["criteria"][0]["scope_reason"] = reason
                report.write_text(json.dumps(value), encoding="utf-8")
                result = self.check(report)
                self.assertEqual(result.returncode, 2)
                self.assertIn(b"REPORT_SCHEMA_INVALID", result.stderr)

    def test_finding_prevent_by_must_use_prescribed_enum(self) -> None:
        report = self.make_report(attention=True)
        value = json.loads(report.read_text())
        value["findings"] = [{"severity": "Nit", "path": "src/change.txt", "open": False,
                              "evidence": "evidence", "why": "why", "fix": "fix",
                              "prevent_by": "review"}]
        report.write_text(json.dumps(value), encoding="utf-8")
        result = self.check(report)
        self.assertEqual(result.returncode, 2)
        self.assertIn(b"REPORT_SCHEMA_INVALID", result.stderr)

    def test_attention_and_nomination_units_stay_bound_to_their_path(self) -> None:
        (self.root / "src/leaf.txt").write_text("leaf change\n", encoding="utf-8")
        report = self.make_report(change_class="trunk", changed_path="src/core/new.txt", attention=True)
        value = json.loads(report.read_text())
        trunk_row = next(row for row in value["human_attention"] if row["path"] == "src/core/new.txt")
        leaf_row = next(row for row in value["human_attention"] if row["path"] == "src/leaf.txt")
        leaf_row["unit_ids"].extend(trunk_row["unit_ids"])
        value["reviewer_nominations"] = [{"path": "src/leaf.txt", "unit_ids": trunk_row["unit_ids"]}]
        report.write_text(json.dumps(value), encoding="utf-8")
        result = self.check(report)
        self.assertEqual(result.returncode, 1)
        self.assertIn(b"ATTENTION_UNIT_PATH_MISMATCH", result.stderr)

    def test_required_fail_and_not_run_are_consistent_on_nonready_verdicts(self) -> None:
        for verdict, status in (("NOT READY", "FAIL"), ("BLOCKED", "NOT RUN")):
            with self.subTest(verdict=verdict, status=status):
                report = self.make_report(verdict=verdict, criterion_result=status)
                result = self.check(report)
                self.assertEqual(result.returncode, 0, result.stderr.decode())

    def test_json_versions_are_exact_integers(self) -> None:
        for version in (True, 1.0):
            with self.subTest(version=version):
                report = self.make_report()
                value = json.loads(report.read_text())
                value["schema_version"] = version
                report.write_text(json.dumps(value), encoding="utf-8")
                result = self.check(report)
                self.assertEqual(result.returncode, 2)
                self.assertIn(b"REPORT_SCHEMA_INVALID", result.stderr)
        report = self.make_report()
        baseline_path = self.root / "artifacts/run/baseline.json"
        baseline = json.loads(baseline_path.read_text())
        baseline["schema_version"] = 1.0
        baseline_path.write_text(json.dumps(baseline), encoding="utf-8")
        value = json.loads(report.read_text())
        value["baseline_receipt"]["sha256"] = sha(baseline_path.read_bytes())
        report.write_text(json.dumps(value), encoding="utf-8")
        result = self.check(report)
        self.assertEqual(result.returncode, 2)
        self.assertIn(b"REPORT_SCHEMA_INVALID", result.stderr)
        criteria_path = self.root / "artifacts/run/criteria.json"
        criteria = json.loads(criteria_path.read_text())
        criteria["schema_version"] = True
        criteria_path.write_text(json.dumps(criteria), encoding="utf-8")
        value = json.loads(report.read_text())
        value["dispatch"]["criterion_inventory"]["sha256"] = sha(criteria_path.read_bytes())
        baseline = json.loads(baseline_path.read_text())
        baseline["criterion_inventory_sha256"] = value["dispatch"]["criterion_inventory"]["sha256"]
        baseline_path.write_text(json.dumps(baseline), encoding="utf-8")
        value["baseline_receipt"]["sha256"] = sha(baseline_path.read_bytes())
        report.write_text(json.dumps(value), encoding="utf-8")
        result = self.check(report)
        self.assertEqual(result.returncode, 2)
        self.assertIn(b"REPORT_SCHEMA_INVALID", result.stderr)

    def test_invalid_classes_levels_and_reproduction_statuses_are_malformed(self) -> None:
        for field, invalid in (("change_class", "unrecognized"), ("review_level", "unrecognized")):
            with self.subTest(field=field):
                report = self.make_report()
                value = json.loads(report.read_text())
                value[field] = invalid
                report.write_text(json.dumps(value), encoding="utf-8")
                result = self.check(report)
                self.assertEqual(result.returncode, 2)
                self.assertIn(b"REPORT_SCHEMA_INVALID", result.stderr)
        report = self.make_report()
        value = json.loads(report.read_text())
        value["reviewer_reproduced"]["claimed"] = "SUCCESS"
        value["reviewer_reproduced"]["observed"] = "SUCCESS"
        report.write_text(json.dumps(value), encoding="utf-8")
        result = self.check(report)
        self.assertEqual(result.returncode, 2)
        self.assertIn(b"REPORT_SCHEMA_INVALID", result.stderr)

    def test_gate_contract_rejects_empty_none_placeholders_and_invalid_pairs(self) -> None:
        cases = (
            ("none:", "revertible", "revert", None),
            ("<flag>", "revertible", "revert", None),
            ("none: no gate applies", "gated", "flag off", None),
            ("named flag", "revertible", "flag off", None),
            ("named flag", "one-way", "one-way", "<authorization>"),
        )
        for flag, reversibility, rollback, authorization in cases:
            with self.subTest(flag=flag, reversibility=reversibility, rollback=rollback):
                report = self.make_report()
                value = json.loads(report.read_text())
                value["gate"].update({"flag": flag, "reversibility": reversibility,
                                      "rollback": rollback, "authorization": authorization})
                value["reversibility"] = reversibility
                report.write_text(json.dumps(value), encoding="utf-8")
                result = self.check(report)
                self.assertEqual(result.returncode, 2)
                self.assertIn(b"GATE_CONTRACT_INVALID", result.stderr)
        report = self.make_report()
        value = json.loads(report.read_text())
        value["gate"].update({"flag": "named feature flag", "reversibility": "gated",
                              "rollback": "flag off", "authorization": None})
        value["reversibility"] = "gated"
        report.write_text(json.dumps(value), encoding="utf-8")
        result = self.check(report)
        self.assertEqual(result.returncode, 0, result.stderr.decode())

    def test_artifact_scope_must_match_report_run_directory(self) -> None:
        report = self.make_report()
        value = json.loads(report.read_text())
        value["dispatch"]["artifact_scope"] = "artifacts/another-run"
        report.write_text(json.dumps(value), encoding="utf-8")
        result = self.check(report)
        self.assertEqual(result.returncode, 1)
        self.assertIn(b"ARTIFACT_SCOPE_INVALID", result.stderr)

    def test_tracked_source_endpoint_cannot_be_declared_as_evidence(self) -> None:
        source = self.root / "artifacts/run/source.py"
        source.parent.mkdir(parents=True, exist_ok=True)
        source.write_text("source file\n", encoding="utf-8")
        self.git("add", "artifacts/run/source.py")
        self.git("commit", "-qm", "tracked source in artifact directory")
        report = self.make_report(change_class="shared")
        self.rebind_inventory(report, "artifacts/run/source.py")
        result = self.check(report)
        self.assertEqual(result.returncode, 1)
        self.assertIn(b"EVIDENCE_PATH_UNSAFE", result.stderr)

    def test_git_replace_refs_do_not_change_base_policy_or_diff(self) -> None:
        (self.root / "src/core/new.txt").write_text("new core\n", encoding="utf-8")
        self.git("add", "src/core/new.txt")
        self.git("commit", "-qm", "head change")
        head = self.git("rev-parse", "HEAD").stdout.decode().strip()
        self.git("replace", self.base, head)
        before = snapshot_tree(self.root, include_git=True)
        result = self.run_gate("classify", "--policy", "docs/review-policy.md",
                               "--base", self.base, "--head", head, "--json")
        self.assertEqual(result.returncode, 0, result.stderr.decode())
        values = {row["path"]: row["class"] for row in json.loads(result.stdout)["paths"]}
        self.assertEqual(values["src/core/new.txt"], "trunk")
        self.assertEqual(snapshot_tree(self.root, include_git=True), before)

    def test_missing_promisor_blob_fails_without_fetch_or_object_write(self) -> None:
        report = self.make_report()
        remote_root = tempfile.TemporaryDirectory()
        self.addCleanup(remote_root.cleanup)
        remote = Path(remote_root.name) / "promisor.git"
        clone = subprocess.run(["git", "clone", "--bare", ".", str(remote)], cwd=self.root,
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
        self.assertEqual(clone.returncode, 0, clone.stderr.decode())
        oid = self.git("rev-parse", "HEAD:src/base.txt").stdout.decode().strip()
        self.git("config", "remote.origin.url", str(remote))
        self.git("config", "remote.origin.promisor", "true")
        self.git("config", "remote.origin.partialclonefilter", "blob:none")
        self.git("config", "extensions.partialClone", "origin")
        object_path = self.root / ".git/objects" / oid[:2] / oid[2:]
        self.assertTrue(object_path.is_file())
        object_path.unlink()
        before = snapshot_tree(self.root, include_git=True)
        remote_before = snapshot_tree(remote, include_git=True)
        result = self.check(report)
        self.assertEqual(result.returncode, 2)
        self.assertIn(b"GIT_INPUT_INVALID", result.stderr)
        self.assertEqual(snapshot_tree(self.root, include_git=True), before)
        self.assertEqual(snapshot_tree(remote, include_git=True), remote_before)


if __name__ == "__main__":
    unittest.main()
