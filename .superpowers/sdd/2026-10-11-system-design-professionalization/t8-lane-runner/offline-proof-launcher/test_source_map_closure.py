"""End-to-end synthetic checks for producer source-map closure membership."""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import tempfile
from unittest.mock import patch
import unittest


HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("offline_proof_prepare_source_map_test", HERE / "prepare-manifest.py")
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("manifest preparer module loader unavailable")
PREP = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PREP)


class BuildClosureMapIntegrationTests(unittest.TestCase):
    def fixture(self, root: Path) -> tuple[bytes, dict[str, str]]:
        e_rel = Path("synthetic-evidence")
        packet_rel = e_rel / "packets"
        launcher_rel = e_rel / "runner"
        native_rel = Path("synthetic-native/manifest.json")
        packet_root = root / packet_rel
        (packet_root / "analysis").mkdir(parents=True)
        (packet_root / "grader").mkdir()
        (root / launcher_rel).mkdir(parents=True)
        contents: dict[str, bytes] = {}
        classes: dict[str, str] = {}

        def add(path: str, raw: bytes, category: str) -> None:
            contents[path] = raw
            classes[path] = category

        fixed = [
            (str(e_rel / "g2-instrumented-operator/operator.py"), "operator-source-inert"),
            (str(e_rel / "qf5-collector-report.md"), "review"),
            (str(e_rel / "t8-lane-runner/offline-proof-launcher/approved-plan.md"), "review"),
            (str(e_rel / "t8-lane-runner/reconstruction-wp5-fix2-review.md"), "review"),
            (str(e_rel / "t8-lane-runner/reconstruction-wp6-review.md"), "review"),
            (str(e_rel / "t8-lane-runner/reconstruction-qf5a-fix4-review.md"), "review"),
            (str(e_rel / "t8-execution-contract-draft.md"), "contract"),
            (str(e_rel / "task-7-index-fix-candidate-manifest.json"), "contract"),
            (str(e_rel / "g2-renewal-result.json"), "contract"),
            (str(e_rel / "t8-lane-runner/assemble-grader.py"), "assembler-source-inert"),
            (str(e_rel / "t8-lane-runner/lane-runner.ts"), "adapter-source-inert"),
            (str(e_rel / "t8-lane-runner/run-native.ts"), "adapter-source-inert"),
            ("scripts/evals/execute.ts", "adapter-source-inert"),
        ]
        for index, (path, category) in enumerate(fixed):
            add(path, f"fixed-{index}".encode(), category)
        for name in PREP.LAUNCHER_FILES:
            add(str(launcher_rel / name), ("launcher-" + name).encode(), "adapter-source-inert")

        packet_rows: list[dict[str, object]] = []
        package_lanes: list[dict[str, object]] = []
        native_lanes: list[dict[str, object]] = []
        for index in range(463):
            kind = "package" if index < 114 else "native"
            relative = f"full-package/p{index:03d}.json" if kind == "package" else f"native/p{index:03d}.json"
            raw = f"packet-{index}".encode()
            packet_path = str(packet_rel / relative)
            add(packet_path, raw, "packet")
            digest = PREP.sha256(raw)
            packet_rows.append({"path": relative, "sha256": digest, "byteLength": len(raw), "kind": kind})
            lane = {"packetPath": relative, "packetSha256": digest, "byteLength": len(raw)}
            (package_lanes if kind == "package" else native_lanes).append(lane)
        for name, value in (
            ("packet-inventory.json", {"schema": "t8-packet-inventory-v1", "packetCount": 463, "inventorySha256": "a" * 64, "packets": packet_rows}),
            ("package-bindings.json", {"schema": "t8-package-source-bindings-v1", "lanes": package_lanes}),
            ("native-bindings.json", {"schema": "t8-native-source-bindings-v1", "lanes": native_lanes}),
            ("blind-arm-map.json", {"synthetic": "binding"}),
        ):
            add(str(packet_rel / "analysis" / name), json.dumps(value, separators=(",", ":")).encode(), "inventory" if name == "packet-inventory.json" else "binding")
        pairs = [f"grader-pair-{index:02d}.json" for index in range(19)]
        grader_index = {"schema": "blinded-grader-inventory-v1", "status": "unanswered; no grades", "pairFiles": [f"grader/{name}" for name in pairs]}
        add(str(packet_rel / "grader/index.json"), json.dumps(grader_index, separators=(",", ":")).encode(), "grader")
        add(str(packet_rel / "grader/protocol.json"), b"synthetic protocol", "grader")
        for name in pairs:
            add(str(packet_rel / "grader" / name), name.encode(), "grader")
        for name in pairs + ["index.json", "protocol.json"]:
            (packet_root / "grader" / name).write_bytes(contents[str(packet_rel / "grader" / name)])
        add(str(native_rel), b'{"synthetic":"native manifest"}', "native-manifest")
        for relative, raw in contents.items():
            path = root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
        rows = [
            {"path": relative, "class": classes[relative], "bytes": len(raw), "sha256": PREP.sha256(raw)}
            for relative, raw in sorted(contents.items())
        ]
        pins = {
            "operator": PREP.sha256(contents[fixed[0][0]]),
            "report": PREP.sha256(contents[fixed[1][0]]),
            "plan": PREP.sha256(contents[fixed[2][0]]),
        }
        authority = {"schema": "offline-proof-source-map-v1", "phase": "preparation", "approved_plan_sha256": pins["plan"], "files": rows}
        return json.dumps(authority, sort_keys=True, separators=(",", ":")).encode(), pins
    def run_main(self, root: Path, map_raw: bytes, pins: dict[str, str]) -> Path:
        map_path = root / "source-map.json"
        map_path.write_bytes(map_raw)
        output_parent = root / "outputs"
        output_parent.mkdir(mode=0o700)
        output = output_parent / "closure"
        argv = ["--output-dir", str(output), "--source-map", str(map_path), "--source-map-sha256", PREP.sha256(map_raw)]
        with patch.multiple(
            PREP,
            REPO=root,
            E_REL=Path("synthetic-evidence"),
            PACKET_REL=Path("synthetic-evidence/packets"),
            PACKET_ROOT=root / "synthetic-evidence/packets",
            LAUNCHER_REL=Path("synthetic-evidence/runner"),
            NATIVE_MANIFEST_REL=Path("synthetic-native/manifest.json"),
            OPERATOR_SHA256=pins["operator"],
            REPORT_SHA256=pins["report"],
            PLAN_SHA256=pins["plan"],
        ):
            PREP.main(argv)
        return output

    def test_exact_synthetic_map_reaches_manifest_emission(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            map_raw, pins = self.fixture(root)
            output = self.run_main(root, map_raw, pins)
            self.assertTrue((output / "manifest.json").is_file())

    def test_extra_approved_but_unused_row_refuses_before_output_creation(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            map_raw, pins = self.fixture(root)
            document = json.loads(map_raw)
            document["files"].append({"path": "unused/approved.bin", "class": "packet", "bytes": 1, "sha256": PREP.sha256(b"x")})
            document["files"].sort(key=lambda row: row["path"])
            changed = json.dumps(document, sort_keys=True, separators=(",", ":")).encode()
            with self.assertRaisesRegex(ValueError, "staged source closure differs"):
                self.run_main(root, changed, pins)
            self.assertFalse((root / "outputs/closure").exists())

    def test_actual_membership_omission_refuses_before_output_creation(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            map_raw, pins = self.fixture(root)
            document = json.loads(map_raw)
            document["files"] = [row for row in document["files"] if row["path"] != "synthetic-evidence/runner/protocol.py"]
            changed = json.dumps(document, sort_keys=True, separators=(",", ":")).encode()
            with self.assertRaisesRegex(ValueError, "membership/class/byte bound refuses read"):
                self.run_main(root, changed, pins)
            self.assertFalse((root / "outputs/closure").exists())
