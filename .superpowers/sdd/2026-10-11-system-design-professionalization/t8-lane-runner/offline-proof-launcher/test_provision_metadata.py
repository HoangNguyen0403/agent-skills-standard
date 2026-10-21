"""Focused offline tests for the pinned Debian build metadata contract."""
from __future__ import annotations

import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest

HERE = Path(__file__).absolute().parent
SPEC = importlib.util.spec_from_file_location("offline_provision", HERE / "provision.py")
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("cannot load local provisioner for its offline contract test")
provision = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(provision)

DEBIAN = {
    "archive_url": "https://cloud.debian.org/images/cloud/trixie/20261017-2634/debian-13-generic-arm64-20261017-2634.tar.xz",
    "build": "20261017-2634",
}
ARCHIVE_STEM = "trixie/20261017-2634/debian-13-generic-arm64-20261017-2634"


def metadata() -> dict[str, object]:
    return {
        "kind": "List",
        "items": [
            {
                "kind": "Build",
                "data": {
                    "info": {
                        "release_baseid": "13",
                        "arch": "arm64",
                        "vendor": "generic",
                        "version": "20261017-2634",
                        "type": "official",
                    },
                    "packages": [{"name": "python3.13", "version": "3.13.5-2+deb13u5"}],
                },
            },
            *[
                {"kind": "Upload", "data": {"provider": "cloud.debian.org", "ref": ref}}
                for ref in (f"{ARCHIVE_STEM}.tar.xz", f"{ARCHIVE_STEM}.raw", f"{ARCHIVE_STEM}.qcow2")
            ],
        ],
    }


class DebianBuildMetadataTests(unittest.TestCase):
    def test_selects_the_single_pinned_build_from_build_and_upload_list(self) -> None:
        info, packages = provision.debian_build_metadata(metadata(), DEBIAN)
        self.assertEqual(info["version"], DEBIAN["build"])
        self.assertEqual(packages, [{"name": "python3.13", "version": "3.13.5-2+deb13u5"}])

    def test_rejects_unknown_item_kind(self) -> None:
        document = metadata()
        document["items"].append({"kind": "Other", "data": {}})
        with self.assertRaises(provision.ProvisionError):
            provision.debian_build_metadata(document, DEBIAN)

    def test_rejects_duplicate_build_and_mismatched_upload_set(self) -> None:
        document = metadata()
        document["items"].append(document["items"][0])
        with self.assertRaises(provision.ProvisionError):
            provision.debian_build_metadata(document, DEBIAN)
        document = metadata()
        document["items"][1]["data"]["ref"] = f"{ARCHIVE_STEM}.bad"
        with self.assertRaises(provision.ProvisionError):
            provision.debian_build_metadata(document, DEBIAN)

class ConfinedFileReadTests(unittest.TestCase):
    def test_hashes_and_reads_through_directory_descriptors(self) -> None:
        with tempfile.TemporaryDirectory(dir=HERE) as temporary:
            root = Path(temporary)
            parent = root / "real"
            parent.mkdir()
            path = parent / "asset.bin"
            payload = b"pinned fixture bytes"
            path.write_bytes(payload)
            self.assertEqual(provision.digest(path, "sha256", 1024), hashlib.sha256(payload).hexdigest())
            self.assertEqual(provision.read_bounded(path, 1024), payload)

    def test_rejects_symlink_in_parent_chain(self) -> None:
        with tempfile.TemporaryDirectory(dir=HERE) as temporary:
            root = Path(temporary)
            parent = root / "real"
            parent.mkdir()
            (parent / "asset.bin").write_bytes(b"not followed")
            (root / "alias").symlink_to(parent, target_is_directory=True)
            with self.assertRaises(OSError):
                provision.read_bounded(root / "alias" / "asset.bin", 1024)


if __name__ == "__main__":
    unittest.main()
