"""Strict length/digest framing for trusted VM evidence channels.

Guest target stdout/stderr are payload channels only. The target never receives
this transport's control descriptor; only the trusted guest supervisor emits
control records.
"""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
import struct
from typing import Any, Iterable

MAGIC = b"QF5OFFLINE\x01"
HEADER_LIMIT = 4096
STREAM_LIMIT = 16 * 1024 * 1024
RECORD_LIMIT = 64 * 1024 * 1024
CHANNELS = frozenset({"stdout", "stderr", "control", "status", "guest-error", "kernel", "initrd"})


class ProtocolError(ValueError):
    """Malformed or out-of-order evidence frame."""


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")


def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ProtocolError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def _strict_json(raw: bytes) -> dict[str, Any]:
    try:
        value = json.loads(raw.decode("utf-8", "strict"), object_pairs_hook=_unique_object, parse_constant=lambda x: (_ for _ in ()).throw(ProtocolError(f"invalid JSON constant {x}")))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ProtocolError("invalid frame header JSON") from exc
    if type(value) is not dict:
        raise ProtocolError("frame header must be an object")
    return value


@dataclass(frozen=True, slots=True)
class Frame:
    run_id: str
    sequence: int
    channel: str
    payload: bytes

    def header(self) -> dict[str, Any]:
        return {
            "channel": self.channel,
            "length": len(self.payload),
            "run_id": self.run_id,
            "sequence": self.sequence,
            "sha256": hashlib.sha256(self.payload).hexdigest(),
        }


def encode_frame(frame: Frame) -> bytes:
    _validate_identity(frame.run_id, frame.sequence, frame.channel, len(frame.payload))
    header = canonical_json(frame.header())
    if len(header) > HEADER_LIMIT:
        raise ProtocolError("frame header exceeds limit")
    return MAGIC + struct.pack(">I", len(header)) + header + frame.payload


def _validate_identity(run_id: str, sequence: int, channel: str, payload_length: int) -> None:
    if type(run_id) is not str or not run_id or len(run_id) > 128 or any(ord(ch) < 0x21 for ch in run_id):
        raise ProtocolError("invalid run id")
    if type(sequence) is not int or sequence < 0:
        raise ProtocolError("invalid sequence")
    if channel not in CHANNELS:
        raise ProtocolError("unknown evidence channel")
    limit = STREAM_LIMIT if channel in {"stdout", "stderr"} else RECORD_LIMIT
    if type(payload_length) is not int or payload_length < 0 or payload_length > limit:
        raise ProtocolError("payload length exceeds channel limit")


class FrameDecoder:
    """Incremental single-run decoder with exact sequence and total-payload accounting."""

    def __init__(self, expected_run_id: str, *, max_total_bytes: int = RECORD_LIMIT) -> None:
        if not expected_run_id:
            raise ValueError("expected run id is required")
        if type(max_total_bytes) is not int or not 0 < max_total_bytes <= RECORD_LIMIT:
            raise ValueError("invalid total frame budget")
        self.expected_run_id = expected_run_id
        self.max_total_bytes = max_total_bytes
        self._buffer = bytearray()
        self._expected_sequence = 0
        self._total_payload = 0

    def feed(self, data: bytes) -> list[Frame]:
        frames: list[Frame] = []
        self.feed_each(data, frames.append)
        return frames

    def feed_each(self, data: bytes, on_frame: Any) -> None:
        if type(data) is not bytes:
            raise TypeError("frame input must be bytes")
        if not callable(on_frame):
            raise TypeError("frame callback must be callable")
        self._buffer.extend(data)
        while True:
            frame = self._pop_one()
            if frame is None:
                return
            on_frame(frame)

    def _pop_one(self) -> Frame | None:
        prefix = len(MAGIC) + 4
        if len(self._buffer) < prefix:
            return None
        if self._buffer[:len(MAGIC)] != MAGIC:
            raise ProtocolError("bad frame magic")
        header_length = struct.unpack(">I", self._buffer[len(MAGIC):prefix])[0]
        if header_length <= 0 or header_length > HEADER_LIMIT:
            raise ProtocolError("invalid frame header length")
        header_end = prefix + header_length
        if len(self._buffer) < header_end:
            return None
        header = _strict_json(bytes(self._buffer[prefix:header_end]))
        if set(header) != {"channel", "length", "run_id", "sequence", "sha256"}:
            raise ProtocolError("unexpected frame header fields")
        length = header["length"]
        _validate_identity(header["run_id"], header["sequence"], header["channel"], length)
        if header["run_id"] != self.expected_run_id:
            raise ProtocolError("frame belongs to another run")
        if header["sequence"] != self._expected_sequence:
            raise ProtocolError("frame sequence gap or replay")
        frame_end = header_end + length
        if len(self._buffer) < frame_end:
            return None
        payload = bytes(self._buffer[header_end:frame_end])
        if hashlib.sha256(payload).hexdigest() != header["sha256"]:
            raise ProtocolError("payload digest mismatch")
        self._total_payload += length
        if self._total_payload > self.max_total_bytes:
            raise ProtocolError("trusted evidence total exceeds budget")
        del self._buffer[:frame_end]
        self._expected_sequence += 1
        return Frame(header["run_id"], header["sequence"], header["channel"], payload)

    def finish(self) -> None:
        if self._buffer:
            raise ProtocolError("truncated final frame")

    @property
    def payload_bytes(self) -> int:
        return self._total_payload


def encode_frames(run_id: str, records: Iterable[tuple[str, bytes]]) -> bytes:
    output = bytearray()
    count = 0
    for sequence, (channel, payload) in enumerate(records):
        output.extend(encode_frame(Frame(run_id, sequence, channel, payload)))
        count = sequence + 1
    maximum = RECORD_LIMIT + (HEADER_LIMIT + len(MAGIC) + 4) * count
    if len(output) > maximum:
        raise ProtocolError("encoded evidence exceeds transport bound")
    return bytes(output)
