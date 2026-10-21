"""Strict contracts shared by the pinned Debian asset producer and verifier."""
from __future__ import annotations

from pathlib import PurePosixPath
from typing import Any
from urllib.parse import urlsplit


class DebianMetadataError(ValueError):
    pass


def debian_archive_basename(debian: dict[str, Any]) -> str:
    path = urlsplit(debian["archive_url"]).path
    basename = path.rsplit("/", 1)[-1]
    if not basename.endswith(".tar.xz") or not basename:
        raise DebianMetadataError("pinned Debian archive URL has an unexpected upstream basename")
    return basename


def debian_build_metadata(document: Any, debian: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    if type(document) is not dict or document.get("kind") != "List":
        raise DebianMetadataError("Debian metadata root is not an image-build List")
    items = document.get("items")
    if type(items) is not list:
        raise DebianMetadataError("Debian metadata items are malformed")
    build_rows: list[dict[str, Any]] = []
    upload_refs: list[str] = []
    for row in items:
        if type(row) is not dict or type(row.get("data")) is not dict:
            raise DebianMetadataError("Debian metadata item is malformed")
        if row.get("kind") == "Build":
            build_rows.append(row["data"])
        elif row.get("kind") == "Upload":
            upload = row["data"]
            ref = upload.get("ref")
            if upload.get("provider") != "cloud.debian.org" or type(ref) is not str:
                raise DebianMetadataError("Debian upload metadata is malformed")
            upload_refs.append(ref)
        else:
            raise DebianMetadataError("Debian metadata contains an unknown item kind")
    archive_path = urlsplit(debian["archive_url"]).path
    marker = "/images/cloud/"
    if marker not in archive_path or not archive_path.endswith(".tar.xz"):
        raise DebianMetadataError("pinned Debian archive URL has an unexpected path")
    archive_ref = archive_path.split(marker, 1)[1]
    archive_stem = archive_ref[:-len(".tar.xz")]
    expected_uploads = {archive_ref, f"{archive_stem}.raw", f"{archive_stem}.qcow2"}
    if len(build_rows) != 1 or len(upload_refs) != 3 or len(set(upload_refs)) != 3 or set(upload_refs) != expected_uploads:
        raise DebianMetadataError("Debian metadata build/upload set differs from the pinned image")
    build = build_rows[0]
    info = build.get("info")
    packages = build.get("packages")
    if type(info) is not dict or type(packages) is not list:
        raise DebianMetadataError("Debian image identity or package inventory is malformed")
    if (info.get("release_baseid"), info.get("arch"), info.get("vendor"), info.get("version"), info.get("type")) != ("13", "arm64", "generic", debian["build"], "official"):
        raise DebianMetadataError("Debian metadata identity mismatch")
    return info, packages


def validate_extraction_record(record: Any, *, archive_sha512: str, raw_sha512: str, raw_bytes: int, extracted_path: str) -> None:
    required = {"archive_sha512", "raw_image_sha512", "raw_image_bytes", "archive_members", "extracted", "vm_started"}
    if type(record) is not dict or set(record) != required:
        raise DebianMetadataError("Debian extraction receipt field set mismatch")
    members = record.get("archive_members")
    if type(members) is not list or len(members) != 1 or type(members[0]) is not dict or set(members[0]) != {"path", "bytes", "type"}:
        raise DebianMetadataError("Debian extraction member evidence is malformed")
    member = members[0]
    path = member.get("path")
    if type(path) is not str or "\\" in path:
        raise DebianMetadataError("Debian extraction member path is malformed")
    while path.startswith("./"):
        path = path[2:]
    relative = PurePosixPath(path)
    if not path or relative.is_absolute() or any(part in {"", ".", ".."} for part in relative.parts) or not relative.name.endswith(".raw"):
        raise DebianMetadataError("Debian extraction member path is unsafe or not the sole raw image")
    if type(member.get("bytes")) is not int or member["bytes"] != raw_bytes or member.get("type") != "regular":
        raise DebianMetadataError("Debian extraction member type/size differs from measured raw image")
    if record.get("archive_sha512") != archive_sha512 or record.get("raw_image_sha512") != raw_sha512 or type(record.get("raw_image_bytes")) is not int or record["raw_image_bytes"] != raw_bytes or record.get("extracted") != extracted_path or record.get("vm_started") is not False:
        raise DebianMetadataError("Debian extraction evidence differs from locked archive and measured image")
