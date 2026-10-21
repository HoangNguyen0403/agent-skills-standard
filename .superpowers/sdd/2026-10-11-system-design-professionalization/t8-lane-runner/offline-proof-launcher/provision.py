#!/usr/bin/env python3
"""Create the private campaign store, acquire only pinned official assets, and preflight them.

This module never starts a VM. It has no operator/vendor execution path.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import platform
import plistlib
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import ssl
from typing import Any

HERE = Path(__file__).absolute().parent
sys.path.insert(0, str(HERE))
from debian_contract import DebianMetadataError, debian_archive_basename, debian_build_metadata as _debian_build_metadata, validate_extraction_record
LOCK_PATH = HERE / "backend.lock.json"
STORAGE = Path("/Users/Shared/ass-qf5-linux-v1")
MIB = 1024 * 1024
GIB = 1024 * MIB
DOWNLOAD_CHUNK = 1024 * 1024
MAX_RESPONSE_HEADER = 64 * 1024


class ProvisionError(RuntimeError):
    pass


def fail(message: str) -> "NoReturn":
    raise ProvisionError(message)


def canonical(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode("utf-8")


def unique_pairs(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    value: dict[str, Any] = {}
    for key, item in pairs:
        if key in value:
            fail(f"duplicate JSON key: {key}")
        value[key] = item
    return value


def strict_json(raw: bytes, label: str) -> Any:
    try:
        return json.loads(raw.decode("utf-8", "strict"), object_pairs_hook=unique_pairs, parse_constant=lambda value: fail(f"invalid JSON constant in {label}: {value}"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ProvisionError(f"invalid {label} JSON") from exc


def write_all(fd: int, payload: bytes) -> None:
    view = memoryview(payload)
    while view:
        count = os.write(fd, view)
        if count <= 0:
            fail("short protected ledger write")
        view = view[count:]


def write_exclusive(path: Path, payload: bytes, mode: int = 0o400) -> None:
    parent_fd = open_directory_chain(path.parent)
    fd = -1
    try:
        fd = os.open(path.name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), mode, dir_fd=parent_fd)
        write_all(fd, payload)
        os.fchmod(fd, mode)
        os.fsync(fd)
        os.fsync(parent_fd)
    finally:
        if fd >= 0:
            os.close(fd)
        os.close(parent_fd)


def _digest_open_fd(fd: int, algorithm: str, maximum: int, path: Path) -> str:
    info = os.fstat(fd)
    if not stat.S_ISREG(info.st_mode) or info.st_size > maximum:
        fail(f"not a bounded regular file: {path}")
    os.lseek(fd, 0, os.SEEK_SET)
    h = hashlib.new(algorithm)
    total = 0
    while True:
        chunk = os.read(fd, DOWNLOAD_CHUNK)
        if not chunk:
            break
        total += len(chunk)
        if total > maximum:
            fail(f"file grew beyond its limit: {path}")
        h.update(chunk)
    after = os.fstat(fd)
    if total != info.st_size or (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns) != (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_ctime_ns):
        fail(f"file changed while hashing: {path}")
    os.lseek(fd, 0, os.SEEK_SET)
    return h.hexdigest()


def digest(path: Path, algorithm: str, maximum: int) -> str:
    parent_fd = open_directory_chain(path.parent)
    fd = -1
    try:
        fd = os.open(path.name, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0), dir_fd=parent_fd)
        return _digest_open_fd(fd, algorithm, maximum, path)
    finally:
        if fd >= 0:
            os.close(fd)
        os.close(parent_fd)


def _read_open_fd(fd: int, maximum: int, path: Path) -> bytes:
    before = os.fstat(fd)
    if not stat.S_ISREG(before.st_mode) or before.st_size > maximum:
        fail(f"not a bounded regular file: {path}")
    os.lseek(fd, 0, os.SEEK_SET)
    out = bytearray()
    while True:
        block = os.read(fd, min(DOWNLOAD_CHUNK, maximum + 1 - len(out)))
        if not block:
            break
        out.extend(block)
        if len(out) > maximum:
            fail(f"file exceeds {maximum} bytes: {path}")
    after = os.fstat(fd)
    if len(out) != before.st_size or (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns, before.st_ctime_ns) != (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_ctime_ns):
        fail(f"file changed while reading: {path}")
    return bytes(out)


def read_bounded(path: Path, maximum: int) -> bytes:
    parent_fd, fd = open_confined_file(path)
    try:
        return _read_open_fd(fd, maximum, path)
    finally:
        os.close(fd)
        os.close(parent_fd)
def load_lock() -> dict[str, Any]:
    value = strict_json(read_bounded(LOCK_PATH, 1024 * 1024), "backend lock")
    if type(value) is not dict or value.get("schema") != "offline-proof-backend-lock-v1" or value.get("operator_execution") != "DENY":
        fail("backend lock schema or execution denial mismatch")
    return value


def ensure_real_directory(path: Path, *, owner: int | None = None, mode: int | None = 0o700) -> None:
    info = path.lstat()
    if not stat.S_ISDIR(info.st_mode) or stat.S_ISLNK(info.st_mode):
        fail(f"path is not a real directory: {path}")
    if owner is not None and info.st_uid != owner:
        fail(f"directory is not owned by the current user: {path}")
    if mode is not None and stat.S_IMODE(info.st_mode) != mode:
        fail(f"directory permissions are not {mode:04o}: {path}")


def open_directory_chain(path: Path) -> int:
    absolute = path.absolute()
    flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0)
    current = os.open(absolute.anchor, flags)
    try:
        for component in absolute.parts[1:]:
            next_fd = os.open(component, flags, dir_fd=current)
            if not stat.S_ISDIR(os.fstat(next_fd).st_mode):
                os.close(next_fd)
                fail(f"non-directory path component: {absolute}")
            os.close(current)
            current = next_fd
        return current
    except BaseException:
        os.close(current)
        raise
def open_confined_file(path: Path) -> tuple[int, int]:
    parent_fd = open_directory_chain(path.parent)
    try:
        fd = os.open(path.name, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0), dir_fd=parent_fd)
        return parent_fd, fd
    except BaseException:
        os.close(parent_fd)
        raise

def logical_usage(root: Path, reserve: int = 0) -> int:
    maximum = 64 * GIB
    if type(reserve) is not int or reserve < 0 or reserve > maximum:
        fail("invalid campaign storage reservation")
    total = 0
    pending = [root]
    while pending:
        directory = pending.pop()
        with os.scandir(directory) as entries:
            for entry in entries:
                info = entry.stat(follow_symlinks=False)
                if stat.S_ISLNK(info.st_mode):
                    fail(f"symlink in private campaign store: {entry.path}")
                if stat.S_ISDIR(info.st_mode):
                    if info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o700:
                        fail("campaign store contains a non-private or foreign directory")
                    pending.append(Path(entry.path))
                elif stat.S_ISREG(info.st_mode):
                    if info.st_uid != os.getuid() or info.st_nlink != 1 or stat.S_IMODE(info.st_mode) & 0o077:
                        fail("campaign store contains a foreign, linked or non-private file")
                    total += info.st_size
                    if total + reserve > maximum:
                        fail("64 GiB campaign logical storage bound exceeded")
                else:
                    fail(f"unexpected non-regular campaign entry: {entry.path}")
    return total


def create_private_tree() -> None:
    parent_fd = open_directory_chain(STORAGE.parent)
    root_fd = -1
    try:
        parent_space = os.fstatvfs(parent_fd)
        if parent_space.f_bavail * parent_space.f_frsize < 16 * GIB:
            fail("less than 16 GiB free before campaign storage creation")
        try:
            os.mkdir(STORAGE.name, mode=0o700, dir_fd=parent_fd)
        except FileExistsError:
            fail(f"storage already exists; refusing adoption or deletion: {STORAGE}")
        root_fd = os.open(STORAGE.name, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0), dir_fd=parent_fd)
        root_info = os.fstat(root_fd)
        if root_info.st_uid != os.getuid():
            fail("new storage root owner differs from invoking user")
        os.fchmod(root_fd, 0o700)
        for relative in ("bin", "cache", "build", "images", "runs", "ledger"):
            os.mkdir(relative, mode=0o700, dir_fd=root_fd)
            child_fd = os.open(relative, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0), dir_fd=root_fd)
            try:
                child_info = os.fstat(child_fd)
                if child_info.st_uid != os.getuid():
                    fail(f"campaign child owner differs from invoking user: {relative}")
                os.fchmod(child_fd, 0o700)
                os.fsync(child_fd)
            finally:
                os.close(child_fd)
        ledger_fd = os.open("ledger", os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0), dir_fd=root_fd)
        try:
            active_fd = os.open("active-vm.lock", os.O_RDWR | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o600, dir_fd=ledger_fd)
            try:
                os.fchmod(active_fd, 0o600)
                os.fsync(active_fd)
            finally:
                os.close(active_fd)
            os.fsync(ledger_fd)
        finally:
            os.close(ledger_fd)
        space = os.fstatvfs(root_fd)
        free_bytes = space.f_bavail * space.f_frsize
        if free_bytes < 16 * GIB:
            fail("less than 16 GiB free for the approved image and evidence lifecycle")
        os.fsync(root_fd)
        os.fsync(parent_fd)
    finally:
        if root_fd >= 0:
            os.close(root_fd)
        os.close(parent_fd)
    print(json.dumps({"storage": str(STORAGE), "mode": "0700", "owner_uid": os.getuid(), "free_bytes": free_bytes, "vm_started": False}, sort_keys=True))


class RestrictedRedirect(urllib.request.HTTPRedirectHandler):
    def __init__(self, allowed_hosts: set[str]) -> None:
        super().__init__()
        self.allowed_hosts = allowed_hosts

    def redirect_request(self, req: urllib.request.Request, fp: Any, code: int, msg: str, headers: Any, newurl: str) -> urllib.request.Request:
        old = urllib.parse.urlsplit(req.full_url)
        new = urllib.parse.urlsplit(newurl)
        if new.scheme != "https" or new.username or new.password or new.port not in (None, 443) or new.fragment or (new.hostname or "").lower() not in self.allowed_hosts:
            fail("redirect left the pinned HTTPS host allowlist")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def opener_for(allowed_hosts: list[str]) -> urllib.request.OpenerDirector:
    context = ssl.create_default_context()
    return urllib.request.build_opener(
        urllib.request.ProxyHandler({}),
        urllib.request.HTTPSHandler(context=context),
        RestrictedRedirect({host.lower() for host in allowed_hosts}),
    )


def _assert_directory_path_matches(path: Path, fd: int) -> None:
    opened = os.fstat(fd)
    named = path.lstat()
    if not stat.S_ISDIR(opened.st_mode) or not stat.S_ISDIR(named.st_mode) or stat.S_ISLNK(named.st_mode) or (opened.st_dev, opened.st_ino, opened.st_uid, stat.S_IMODE(opened.st_mode)) != (named.st_dev, named.st_ino, named.st_uid, stat.S_IMODE(named.st_mode)):
        fail(f"download parent changed after descriptor acquisition: {path}")


def download_once(url: str, destination: Path, *, maximum: int, hosts: list[str], expected: tuple[str, str] | None = None, accept: str = "application/octet-stream") -> dict[str, Any]:
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != "https" or parsed.username or parsed.password or parsed.port not in (None, 443) or parsed.fragment or (parsed.hostname or "").lower() not in {host.lower() for host in hosts}:
        fail(f"download URL is outside pinned HTTPS allowlist: {url}")
    ensure_real_directory(destination.parent, owner=os.getuid())
    parent_fd = open_directory_chain(destination.parent)
    partial = destination.with_name(destination.name + ".part")
    fd = source_fd = destination_fd = -1
    try:
        _assert_directory_path_matches(destination.parent, parent_fd)
        for name in (destination.name, partial.name):
            try:
                os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
            except FileNotFoundError:
                continue
            fail(f"refusing existing download destination or partial: {name}")
        logical_usage(STORAGE, reserve=2 * maximum)
        fd = os.open(partial.name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o600, dir_fd=parent_fd)
        request = urllib.request.Request(url, method="GET", headers={"Accept": accept, "User-Agent": "offline-proof-launcher/1"})
        h = hashlib.sha256()
        total = 0
        with opener_for(hosts).open(request, timeout=30) as response:
            final = urllib.parse.urlsplit(response.geturl())
            if final.scheme != "https" or final.username or final.password or final.port not in (None, 443) or final.fragment or (final.hostname or "").lower() not in {host.lower() for host in hosts}:
                fail("final download URL is outside pinned HTTPS host allowlist")
            if response.status != 200:
                fail(f"unexpected HTTP status {response.status}")
            length = response.headers.get("Content-Length")
            if length is not None and (not length.isdigit() or int(length) > maximum):
                fail("declared asset length exceeds limit")
            content_type = response.headers.get("Content-Type", "")[:256]
            while True:
                chunk = response.read(DOWNLOAD_CHUNK)
                if not chunk:
                    break
                total += len(chunk)
                if total > maximum:
                    fail("asset exceeded its hard byte limit")
                h.update(chunk)
                view = memoryview(chunk)
                while view:
                    written = os.write(fd, view)
                    if written <= 0:
                        fail("short download write")
                    view = view[written:]
            if length is not None and total != int(length):
                fail("downloaded byte count differs from the server's declared length")
        os.fsync(fd)
        if expected is not None:
            algorithm, wanted = expected
            if algorithm != "sha256" or h.hexdigest() != wanted:
                fail(f"download digest mismatch: {destination.name}")
        if total == 0:
            fail("empty download refused")
        os.fchmod(fd, 0o400)
        os.close(fd)
        fd = -1
        _assert_directory_path_matches(destination.parent, parent_fd)
        source_fd = os.open(partial.name, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0), dir_fd=parent_fd)
        source_info = os.fstat(source_fd)
        if not stat.S_ISREG(source_info.st_mode) or source_info.st_uid != os.getuid() or source_info.st_nlink != 1 or source_info.st_size != total:
            fail("completed partial download identity changed before promotion")
        destination_fd = os.open(destination.name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o600, dir_fd=parent_fd)
        copied = 0
        copied_hash = hashlib.sha256()
        while True:
            chunk = os.read(source_fd, DOWNLOAD_CHUNK)
            if not chunk:
                break
            copied += len(chunk)
            if copied > total:
                fail("partial download grew beyond its verified length")
            copied_hash.update(chunk)
            view = memoryview(chunk)
            while view:
                written = os.write(destination_fd, view)
                if written <= 0:
                    fail("short verified-download promotion write")
                view = view[written:]
        after = os.fstat(source_fd)
        if copied != total or copied_hash.hexdigest() != h.hexdigest() or (source_info.st_dev, source_info.st_ino, source_info.st_size, source_info.st_mtime_ns) != (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns):
            fail("partial download changed while promoting verified bytes")
        os.fsync(destination_fd)
        os.fchmod(destination_fd, 0o400)
        os.fsync(destination_fd)
        os.fsync(parent_fd)
        _assert_directory_path_matches(destination.parent, parent_fd)
        return {"url": url, "final_url": final.geturl(), "bytes": total, "sha256": h.hexdigest(), "content_type": content_type, "tls": "default certificate verification", "proxy": "disabled", "retry": False}
    finally:
        for open_fd in (destination_fd, source_fd, fd, parent_fd):
            if open_fd >= 0:
                os.close(open_fd)


def verify_sha512_sums(raw: bytes, filename: str, expected: str) -> None:
    try:
        text = raw.decode("ascii", "strict")
    except UnicodeDecodeError as exc:
        raise ProvisionError("Debian SHA512SUMS is not ASCII") from exc
    matches = []
    for line in text.splitlines():
        fields = line.split()
        if len(fields) >= 2 and fields[-1].lstrip("*") == filename:
            matches.append(fields[0].lower())
    if matches != [expected]:
        fail("official Debian SHA512SUMS entry is missing, duplicated, or differs from lock")


def verify_vfkit(lock: dict[str, Any]) -> dict[str, Any]:
    binary = STORAGE / "bin/vfkit"
    expected = lock["assets"]["vfkit"]["sha256"]
    if digest(binary, "sha256", lock["assets"]["vfkit"]["max_download_bytes"]) != expected:
        fail("vfkit binary hash mismatch")
    codesign = Path("/usr/bin/codesign")
    if not codesign.is_file() or not os.access(codesign, os.X_OK):
        fail("/usr/bin/codesign unavailable; cannot establish signature/entitlement")
    verify = subprocess.run([str(codesign), "--verify", "--strict", "--verbose=2", str(binary)], stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15, check=False)
    if verify.returncode != 0 or len(verify.stdout) + len(verify.stderr) > 256 * 1024:
        fail("vfkit code signature verification failed")
    entitlement = subprocess.run([str(codesign), "-d", "--entitlements", ":-", str(binary)], stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15, check=False)
    if entitlement.returncode != 0 or len(entitlement.stdout) + len(entitlement.stderr) > 256 * 1024:
        fail("vfkit entitlement query failed")
    try:
        plist = plistlib.loads(entitlement.stdout)
    except Exception as exc:
        raise ProvisionError("vfkit entitlement plist malformed") from exc
    if type(plist) is not dict or plist.get("com.apple.security.virtualization") is not True:
        fail("vfkit lacks the required virtualization entitlement")
    evidence = {
        "binary_sha256": expected,
        "codesign_verify_stdout": verify.stdout.decode("utf-8", "replace"),
        "codesign_verify_stderr": verify.stderr.decode("utf-8", "replace"),
        "entitlements": plist,
        "checked_at_unix": int(time.time()),
        "vm_started": False,
    }
    write_exclusive(STORAGE / "ledger/vfkit-signature.json", canonical(evidence) + b"\n", 0o400)
    return evidence


def inspect_and_extract_debian(lock: dict[str, Any]) -> dict[str, Any]:
    debian = lock["assets"]["debian"]
    archive = STORAGE / "cache/debian.tar.xz"
    cache_fd = open_directory_chain(archive.parent)
    archive_fd = -1
    images_fd = -1
    image_dir_fd = -1
    raw_fd = -1
    try:
        archive_fd = os.open(archive.name, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0), dir_fd=cache_fd)
        archive_info = os.fstat(archive_fd)
        if not stat.S_ISREG(archive_info.st_mode) or archive_info.st_uid != os.getuid() or archive_info.st_nlink != 1 or stat.S_IMODE(archive_info.st_mode) != 0o400:
            fail("Debian archive descriptor identity or permissions are unsafe")
        archive_sha512 = _digest_open_fd(archive_fd, "sha512", debian["max_archive_bytes"], archive)
        if archive_sha512 != debian["archive_sha512"]:
            fail("Debian archive SHA-512 mismatch")
        images_fd = open_directory_chain(STORAGE / "images")
        images_info = os.fstat(images_fd)
        if not stat.S_ISDIR(images_info.st_mode) or images_info.st_uid != os.getuid() or stat.S_IMODE(images_info.st_mode) != 0o700:
            fail("Debian image parent is not the owned private directory")
        os.mkdir("debian", mode=0o700, dir_fd=images_fd)
        os.fsync(images_fd)
        image_dir_fd = os.open("debian", os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0), dir_fd=images_fd)
        image_info = os.fstat(image_dir_fd)
        if not stat.S_ISDIR(image_info.st_mode) or image_info.st_uid != os.getuid() or stat.S_IMODE(image_info.st_mode) != 0o700 or image_info.st_dev != images_info.st_dev:
            fail("new Debian image directory identity is unsafe")
        files: list[tarfile.TarInfo] = []
        expanded = 0
        seen: set[str] = set()
        member_count = 0
        os.lseek(archive_fd, 0, os.SEEK_SET)
        with os.fdopen(os.dup(archive_fd), "rb") as archive_stream:
            with tarfile.open(fileobj=archive_stream, mode="r|xz") as tf:
                for member in tf:
                    member_count += 1
                    if member_count > 4096:
                        fail("Debian archive exceeds the 4096-entry inspection bound")
                    original_name = member.name
                    name = original_name
                    while name.startswith("./"):
                        name = name[2:]
                    if not name and member.isdir():
                        continue
                    path = PurePosixPath(name)
                    if not name or path.is_absolute() or "\\" in name or any(part in {"", ".", ".."} for part in path.parts):
                        fail(f"unsafe Debian archive path: {original_name!r}")
                    normalized = path.as_posix().rstrip("/")
                    if normalized in seen:
                        fail(f"duplicate Debian archive member: {name}")
                    seen.add(normalized)
                    if member.isdir():
                        continue
                    if member.issym() or member.islnk() or member.isdev() or member.isfifo():
                        fail(f"links, devices and FIFOs are not accepted: {original_name}")
                    if not member.isfile() or getattr(member, "sparse", None):
                        fail(f"unsupported Debian archive member type: {original_name}")
                    expanded += member.size
                    if member.size < 0 or expanded > debian["max_expanded_bytes"]:
                        fail("Debian archive expands beyond the approved bound")
                    if not path.name.endswith(".raw"):
                        fail(f"unexpected Debian archive payload: {name}")
                    files.append(member)
        if len(files) != 1:
            fail("Debian archive must contain exactly one raw disk image")
        raw_name = "debian-13-generic-arm64.raw"
        raw_fd = os.open(raw_name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o400, dir_fd=image_dir_fd)
        h = hashlib.sha512()
        written_total = 0
        os.lseek(archive_fd, 0, os.SEEK_SET)
        with os.fdopen(os.dup(archive_fd), "rb") as archive_stream:
            with tarfile.open(fileobj=archive_stream, mode="r:xz") as tf:
                stream = tf.extractfile(files[0])
                if stream is None:
                    fail("Debian raw image payload unavailable")
                with stream:
                    while True:
                        block = stream.read(DOWNLOAD_CHUNK)
                        if not block:
                            break
                        written_total += len(block)
                        if written_total > debian["max_expanded_bytes"]:
                            fail("raw image extraction exceeded bound")
                        h.update(block)
                        view = memoryview(block)
                        while view:
                            count = os.write(raw_fd, view)
                            if count <= 0:
                                fail("short raw image write")
                            view = view[count:]
        os.fsync(raw_fd)
        os.fchmod(raw_fd, 0o400)
        if written_total != files[0].size or h.hexdigest() != debian["raw_image_sha512"]:
            fail("extracted Debian raw image digest/size mismatch")
        if _digest_open_fd(archive_fd, "sha512", debian["max_archive_bytes"], archive) != debian["archive_sha512"]:
            fail("Debian archive changed during inspection or extraction")
        os.fsync(image_dir_fd)
        logical_usage(STORAGE)
        return {"archive_sha512": debian["archive_sha512"], "raw_image_sha512": h.hexdigest(), "raw_image_bytes": written_total, "archive_members": [{"path": member.name, "bytes": member.size, "type": "regular"} for member in files], "extracted": str(STORAGE / "images/debian" / raw_name), "vm_started": False}
    except (tarfile.TarError, OSError) as exc:
        raise ProvisionError("Debian archive inspection/extraction failed; evidence retained") from exc
    finally:
        for fd in (raw_fd, image_dir_fd, images_fd, archive_fd, cache_fd):
            if fd >= 0:
                os.close(fd)


def debian_build_metadata(document: Any, debian: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    try:
        return _debian_build_metadata(document, debian)
    except DebianMetadataError as exc:
        raise ProvisionError(str(exc)) from exc


def acquire(lock: dict[str, Any]) -> dict[str, Any]:
    vf = lock["assets"]["vfkit"]
    deb = lock["assets"]["debian"]
    cache = STORAGE / "cache"
    vf_metadata = download_once(vf["release_metadata_url"], cache / "vfkit-release.json", maximum=8 * MIB, hosts=vf["allowed_hosts"], accept="application/vnd.github+json")
    metadata = strict_json(read_bounded(cache / "vfkit-release.json", 8 * MIB), "vfkit release metadata")
    if type(metadata) is not dict or metadata.get("tag_name") != f"v{vf['version']}":
        fail("vfkit release tag differs from lock")
    assets = [row for row in metadata.get("assets", []) if type(row) is dict and row.get("id") == vf["asset_id"] and row.get("name") == vf["asset_name"]]
    if len(assets) != 1 or not isinstance(assets[0].get("browser_download_url"), str) or assets[0]["browser_download_url"] != vf["download_url"]:
        fail("vfkit asset metadata differs from approved release lock")
    vf_binary = download_once(vf["download_url"], STORAGE / "bin/vfkit", maximum=vf["max_download_bytes"], hosts=vf["allowed_hosts"], expected=("sha256", vf["sha256"]))
    os.chmod(STORAGE / "bin/vfkit", 0o500)

    package_metadata = download_once(deb["package_inventory_url"], cache / "debian-image.json", maximum=deb["max_metadata_bytes"], hosts=deb["allowed_hosts"], accept="application/json")
    package_json = strict_json(read_bounded(cache / "debian-image.json", deb["max_metadata_bytes"]), "Debian package inventory")
    info, packages = debian_build_metadata(package_json, deb)
    locked_packages = lock["guest_packages"]
    package_versions: dict[str, str] = {}
    for item in packages:
        if type(item) is not dict or type(item.get("name")) is not str or type(item.get("version")) is not str:
            fail("Debian package inventory row is malformed")
        name = item["name"]
        if name in locked_packages:
            if name in package_versions:
                fail(f"Debian package inventory duplicates locked package: {name}")
            package_versions[name] = item["version"]
    for name, version in locked_packages.items():
        if package_versions.get(name) != version:
            fail(f"Debian metadata package version mismatch: {name}")
    sums_result = download_once(deb["checksums_url"], cache / "debian-SHA512SUMS", maximum=deb["max_metadata_bytes"], hosts=deb["allowed_hosts"], accept="text/plain")
    sums = read_bounded(cache / "debian-SHA512SUMS", deb["max_metadata_bytes"])
    archive_name = urllib.parse.urlsplit(deb["archive_url"]).path.rsplit("/", 1)[-1]
    verify_sha512_sums(sums, archive_name, deb["archive_sha512"])
    archive_result = download_once(deb["archive_url"], cache / "debian.tar.xz", maximum=deb["max_archive_bytes"], hosts=deb["allowed_hosts"], expected=None, accept="application/x-xz")
    if digest(cache / "debian.tar.xz", "sha512", deb["max_archive_bytes"]) != deb["archive_sha512"]:
        fail("downloaded Debian archive differs from published/locked SHA-512")
    raw_result = inspect_and_extract_debian(lock)
    signature = verify_vfkit(lock)
    result = {
        "schema": "offline-proof-acquisition-v1",
        "plan_sha256": lock["approved_plan_sha256"],
        "assets": {"vfkit_release_metadata": vf_metadata, "vfkit": vf_binary, "debian_metadata": package_metadata, "debian_sums": sums_result, "debian_archive": archive_result, "debian_raw": raw_result},
        "debian_image_identity": info,
        "locked_guest_package_versions": locked_packages,
        "vfkit_signature": {"binary_sha256": signature["binary_sha256"], "virtualization_entitlement": True},
        "network_policy": "HTTPS only; proxy disabled; exact official host allowlist; no credentials; no retries/fallback",
        "vm_started": False,
    }
    path = STORAGE / "ledger/acquisition.json"
    acquisition_raw = canonical(result) + b"\n"
    write_exclusive(path, acquisition_raw)
    print(json.dumps({"acquisition_sha256": hashlib.sha256(acquisition_raw).hexdigest(), "assets": list(result["assets"]), "vm_started": False}, sort_keys=True))
    return result


def runtime_identity() -> dict[str, Any]:
    executable = Path(sys.executable)
    resolved = executable.resolve(strict=True)
    info = resolved.stat()
    if not stat.S_ISREG(info.st_mode) or not os.access(resolved, os.X_OK):
        fail("host Python executable is not a regular executable")
    return {"sys_executable": str(executable), "resolved_executable": str(resolved), "python_version": sys.version.split()[0], "machine": platform.machine(), "executable_sha256": digest(resolved, "sha256", 512 * MIB), "isolation_mode_required": "python -I -S -B", "target_execution": "launcher files only"}


def preflight(lock: dict[str, Any]) -> dict[str, Any]:
    debian = lock["assets"]["debian"]
    ensure_real_directory(STORAGE, owner=os.getuid())
    for child in ("bin", "cache", "build", "images", "runs", "ledger"):
        ensure_real_directory(STORAGE / child, owner=os.getuid())
    if platform.system() != "Darwin" or platform.machine() not in {"arm64", "aarch64"}:
        fail("host is not the approved Darwin arm64 platform")
    space = shutil.disk_usage(STORAGE)
    capacity = lock["storage"]["campaign_logical_bytes_max"]
    if type(capacity) is not int or capacity != 64 * GIB:
        fail("campaign logical capacity differs from the approved lock")
    usage = logical_usage(STORAGE)
    if usage > capacity or space.free < lock["storage"]["runtime_image_bytes_max"] + 64 * MIB:
        fail("private store exceeds its bound or lacks room for the next bounded phase")
    vf_signature_raw = read_bounded(STORAGE / "ledger/vfkit-signature.json", 1024 * 1024)
    vf_signature = strict_json(vf_signature_raw, "vfkit signature receipt")
    signature_keys = {"binary_sha256", "codesign_verify_stdout", "codesign_verify_stderr", "entitlements", "checked_at_unix", "vm_started"}
    if type(vf_signature) is not dict or set(vf_signature) != signature_keys:
        fail("vfkit signature receipt shape mismatch")
    signature_stdout = vf_signature.get("codesign_verify_stdout")
    signature_stderr = vf_signature.get("codesign_verify_stderr")
    if type(signature_stdout) is not str or type(signature_stderr) is not str or len(signature_stdout.encode("utf-8")) + len(signature_stderr.encode("utf-8")) > 256 * 1024:
        fail("vfkit signature command output exceeds its retained bound")
    entitlements = vf_signature.get("entitlements")
    if type(vf_signature.get("checked_at_unix")) is not int or vf_signature["checked_at_unix"] < 0 or vf_signature.get("vm_started") is not False or type(entitlements) is not dict or vf_signature.get("binary_sha256") != lock["assets"]["vfkit"]["sha256"] or entitlements.get("com.apple.security.virtualization") is not True:
        fail("vfkit signature/entitlement evidence absent or mismatched")
    acquisition_raw = read_bounded(STORAGE / "ledger/acquisition.json", 4 * MIB)
    acquisition = strict_json(acquisition_raw, "acquisition receipt")
    if type(acquisition) is not dict or acquisition.get("schema") != "offline-proof-acquisition-v1" or acquisition.get("vm_started") is not False or acquisition.get("plan_sha256") != lock["approved_plan_sha256"]:
        fail("acquisition ledger is not bound to this plan")
    expected_records = {
        "vfkit_release_metadata": (STORAGE / "cache/vfkit-release.json", 8 * MIB),
        "vfkit": (STORAGE / "bin/vfkit", lock["assets"]["vfkit"]["max_download_bytes"]),
        "debian_metadata": (STORAGE / "cache/debian-image.json", lock["assets"]["debian"]["max_metadata_bytes"]),
        "debian_sums": (STORAGE / "cache/debian-SHA512SUMS", lock["assets"]["debian"]["max_metadata_bytes"]),
        "debian_archive": (STORAGE / "cache/debian.tar.xz", lock["assets"]["debian"]["max_archive_bytes"]),
    }
    records = acquisition.get("assets")
    if type(records) is not dict or set(records) != set(expected_records) | {"debian_raw"}:
        fail("acquisition asset receipt set is incomplete or unexpected")
    for name, (path, maximum) in expected_records.items():
        row = records[name]
        if type(row) is not dict or type(row.get("bytes")) is not int or row["bytes"] < 0 or row["bytes"] > maximum:
            fail(f"acquisition receipt has invalid bounded size: {name}")
        parent_fd, asset_fd = open_confined_file(path)
        try:
            asset_info = os.fstat(asset_fd)
            expected_mode = 0o500 if name == "vfkit" else 0o400
            if not stat.S_ISREG(asset_info.st_mode) or asset_info.st_uid != os.getuid() or asset_info.st_nlink != 1 or stat.S_IMODE(asset_info.st_mode) != expected_mode or row["bytes"] != asset_info.st_size:
                fail(f"acquisition receipt size or file identity differs from retained asset: {name}")
            if row.get("sha256") != _digest_open_fd(asset_fd, "sha256", maximum, path):
                fail(f"acquisition receipt does not match retained asset: {name}")
        finally:
            os.close(asset_fd)
            os.close(parent_fd)
    archive_path = STORAGE / "cache/debian.tar.xz"
    archive_parent_fd, archive_fd = open_confined_file(archive_path)
    try:
        archive_sha512 = _digest_open_fd(archive_fd, "sha512", debian["max_archive_bytes"], archive_path)
        if records["debian_archive"].get("sha256") != _digest_open_fd(archive_fd, "sha256", debian["max_archive_bytes"], archive_path) or archive_sha512 != debian["archive_sha512"]:
            fail("Debian archive receipt digest mismatch")
    finally:
        os.close(archive_fd)
        os.close(archive_parent_fd)
    sums_path = STORAGE / "cache/debian-SHA512SUMS"
    sums_row = records["debian_sums"]
    sums_parent_fd, sums_fd = open_confined_file(sums_path)
    try:
        sums_info = os.fstat(sums_fd)
        sums = _read_open_fd(sums_fd, debian["max_metadata_bytes"], sums_path)
        if type(sums_row.get("bytes")) is not int or sums_row["bytes"] != sums_info.st_size or sums_row.get("sha256") != hashlib.sha256(sums).hexdigest():
            fail("Debian SHA512SUMS receipt differs from retained bytes")
    finally:
        os.close(sums_fd)
        os.close(sums_parent_fd)
    verify_sha512_sums(sums, debian_archive_basename(debian), debian["archive_sha512"])
    raw = STORAGE / "images/debian/debian-13-generic-arm64.raw"
    raw_parent_fd, raw_fd = open_confined_file(raw)
    try:
        raw_info = os.fstat(raw_fd)
        raw_sha512 = _digest_open_fd(raw_fd, "sha512", debian["max_expanded_bytes"], raw)
        raw_row = records["debian_raw"]
        try:
            validate_extraction_record(raw_row, archive_sha512=archive_sha512, raw_sha512=raw_sha512, raw_bytes=raw_info.st_size, extracted_path=str(raw))
        except DebianMetadataError as exc:
            raise ProvisionError(str(exc)) from exc
        if raw_sha512 != debian["raw_image_sha512"] or not stat.S_ISREG(raw_info.st_mode) or raw_info.st_uid != os.getuid() or raw_info.st_nlink != 1 or stat.S_IMODE(raw_info.st_mode) != 0o400:
            fail("raw Debian image failed pinned acquisition receipt/digest")
    finally:
        os.close(raw_fd)
        os.close(raw_parent_fd)
    if acquisition.get("vfkit_signature") != {"binary_sha256": lock["assets"]["vfkit"]["sha256"], "virtualization_entitlement": True}:
        fail("acquisition ledger signature summary differs from approved binary")
    if vf_signature.get("binary_sha256") != digest(STORAGE / "bin/vfkit", "sha256", lock["assets"]["vfkit"]["max_download_bytes"]):
        fail("vfkit signature evidence does not bind retained binary")
    image_identity = acquisition.get("debian_image_identity")
    if type(image_identity) is not dict or (image_identity.get("release_baseid"), image_identity.get("arch"), image_identity.get("vendor"), image_identity.get("version"), image_identity.get("type")) != ("13", "arm64", "generic", debian["build"], "official"):
        fail("acquisition Debian image metadata identity differs from lock")
    packages = acquisition.get("locked_guest_package_versions")
    if packages != lock["guest_packages"]:
        fail("acquisition guest package versions differ from lock")
    result = {
        "schema": "offline-proof-preflight-v1",
        "plan_sha256": lock["approved_plan_sha256"],
        "host_python": runtime_identity(),
        "storage": {"path": str(STORAGE), "owner_uid": os.getuid(), "mode": "0700", "logical_bytes": usage, "free_bytes": space.free, "total_bytes": space.total},
        "vfkit_sha256": lock["assets"]["vfkit"]["sha256"],
        "vfkit_signature_sha256": hashlib.sha256(vf_signature_raw).hexdigest(),
        "acquisition_sha256": hashlib.sha256(acquisition_raw).hexdigest(),
        "debian_archive_sha512": lock["assets"]["debian"]["archive_sha512"],
        "debian_raw_sha512": debian["raw_image_sha512"],
        "vm_started": False,
    }
    dest = STORAGE / "ledger/preflight.json"
    write_exclusive(dest, canonical(result) + b"\n")
    print(json.dumps(result, sort_keys=True))
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("initialize", help="create only the absent exclusive 0700 campaign root")
    sub.add_parser("acquire", help="download pinned official assets and verify before extraction")
    sub.add_parser("preflight", help="verify already acquired assets; never starts a VM")
    args = parser.parse_args(argv)
    if args.command == "initialize":
        create_private_tree()
    else:
        lock = load_lock()
        if args.command == "acquire":
            acquire(lock)
        elif args.command == "preflight":
            preflight(lock)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, ProvisionError, urllib.error.URLError, TimeoutError, tarfile.TarError) as exc:
        print(f"provision: {exc}", file=sys.stderr)
        raise SystemExit(2)
