#!/usr/bin/env python3
"""record_dispatch.py - Append one dispatch-scoped observation under the shared lock.

Usage:
    record_dispatch.py <kind> --observations <FILE> --change <ID> --revision <REV> [fields]

Kinds and their fields beyond id/change_id/revision/observed_at/source_ref/kind:
    dispatch    dispatch_id role capability_hint authority_ref
                [provider] [model] [effort] [orchestrator_model] [orchestrator_ref]
    round       dispatch_id round
    verdict     dispatch_id round verdict reviewer_ref
    acceptance  dispatch_id round decision authority_ref
    end         dispatch_id state
    coverage    from through [--complete]

Every kind accepts --observed-at (default: now, UTC), --source-ref and
--lock-timeout-ms. The lock wait also reads AGS_OBSERVATIONS_LOCK_TIMEOUT_MS.

`id` is `<kind>#` plus the first 32 lowercase hex characters of SHA-256 over the
`|`-joined domain identity, so an identical replay is a no-op, a conflicting
replay is refused, and the same id with a different identity is refused.

The helper validates the kinds it writes: reference strings, timestamps,
identity rules, round numbering, last-round acceptance, end before acceptance
and coverage windows. Usage and inventory overlap rules belong to the importer
and to the registry's metrics reader (optional; not required by consumers).

Exit codes: 0 written or replay no-op, 1 rejected or lock failure, 2 usage error.
Diagnostics carry a fixed code and at most one reference string or argument
name: never a path, never a supplied value, never a traceback.
"""

from __future__ import annotations

import argparse
import datetime
import hashlib
import json
import os
import re
import sys
import tempfile
import time

EXIT_OK = 0
EXIT_REJECTED = 1
EXIT_USAGE = 2

SCHEMA_VERSION = 1
SOURCE_KIND = "operator-recorded"
DEFAULT_SOURCE_REF = "record-dispatch"
DEFAULT_LOCK_TIMEOUT_MS = 10_000
LOCK_RETRY_SECONDS = 0.1
STALE_LOCK_SECONDS = 600

CAPABILITY_HINTS = ("fast", "standard", "strong", "unknown")
END_STATES = ("completed", "cancelled", "failed", "errored")
VERDICTS = ("approved", "changes_requested")
DECISIONS = ("accepted", "rejected")

# SRS-008: the five recorded kinds a coverage entry lists.
RECORDED_KINDS = [
    "dispatch",
    "dispatch-round",
    "dispatch-verdict",
    "dispatch-acceptance",
    "dispatch-end",
]

# SRS-010: closed charset, no `/`, `\`, `~`, or whitespace; a leading alphanumeric.
REFERENCE_STRING = re.compile(r"[A-Za-z0-9][A-Za-z0-9._:@#-]{0,127}")
UTC_ISO = re.compile(r"(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(?:Z|\+00:00)")
IDENTITY_HASH_CHARS = 32


class UsageError(Exception):
    """A usage error carrying a fixed code and, at most, one argument name."""

    def __init__(self, code: str, subject: str = "") -> None:
        super().__init__(code)
        self.code = code
        self.subject = subject

    def message(self) -> str:
        return f"error {self.code} {self.subject}".rstrip()


class Rejected(Exception):
    """A refused write, carrying the fixed diagnostic code emitted to stderr."""

    def __init__(self, code: str, subject: str = "") -> None:
        super().__init__(code)
        self.code = code
        self.subject = subject

    def message(self) -> str:
        return f"error {self.code} {self.subject}".rstrip()


# -- Field validation ------------------------------------------------------


def reference_string(field: str, value: str) -> str:
    """Rejects anything a path, home marker or whitespace could travel in; never echoes it."""
    if not isinstance(value, str) or not REFERENCE_STRING.fullmatch(value):
        raise Rejected("invalid-reference", field)
    return value


def utc_timestamp(field: str, value: str) -> str:
    """Strict UTC ISO-8601, canonicalized to millisecond `Z` form (SRS-007)."""
    if not isinstance(value, str):
        raise Rejected("invalid-timestamp", field)
    match = UTC_ISO.fullmatch(value)
    if not match:
        raise Rejected("invalid-timestamp", field)
    year, month, day, hour, minute, second = (int(match.group(i)) for i in range(1, 7))
    millis = int(match.group(7).ljust(3, "0")) if match.group(7) else 0
    if not 1 <= month <= 12 or hour > 23 or minute > 59 or second > 59:
        raise Rejected("invalid-timestamp", field)
    try:
        days_in_month = (datetime.date(year + (month == 12), month % 12 + 1, 1) - datetime.timedelta(days=1)).day
        if not 1 <= day <= days_in_month:
            raise ValueError("day out of range")
        stamp = datetime.datetime(
            year, month, day, hour, minute, second, millis * 1000, tzinfo=datetime.timezone.utc
        )
    except ValueError:
        raise Rejected("invalid-timestamp", field) from None
    return instant_string(stamp)


def instant_string(stamp: datetime.datetime) -> str:
    """One canonical spelling for identity, replay comparison and ordering (SRS-007)."""
    return stamp.astimezone(datetime.timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def instant_of(event: dict) -> datetime.datetime:
    """Reads an existing event's instant, tolerating any spelling it was written with."""
    value = event.get("observed_at")
    if not isinstance(value, str):
        raise Rejected("invalid-observations")
    try:
        parsed = datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise Rejected("invalid-observations") from None
    if parsed.tzinfo is None:
        raise Rejected("invalid-observations")
    return parsed.astimezone(datetime.timezone.utc)


def now_timestamp() -> str:
    return instant_string(datetime.datetime.now(datetime.timezone.utc))


# -- Event construction ----------------------------------------------------


def event_base(args) -> dict:
    return {
        "change_id": reference_string("change_id", args.change),
        "revision": reference_string("revision", args.revision),
        "observed_at": utc_timestamp("observed_at", args.observed_at or now_timestamp()),
        "source_ref": reference_string("source_ref", args.source_ref),
    }


def build_event(kind: str, args) -> dict:
    event = event_base(args)
    if kind == "dispatch":
        event.update(
            {
                "kind": "dispatch",
                "dispatch_id": reference_string("dispatch_id", args.dispatch_id),
                "role": reference_string("role", args.role),
                "capability_hint": choice("capability_hint", args.capability_hint, CAPABILITY_HINTS),
                "actual": {
                    "provider": reference_string("provider", args.provider or "unknown"),
                    "model": reference_string("model", args.model or "unknown"),
                    "effort": reference_string("effort", args.effort or "unknown"),
                },
                "authority_ref": reference_string("authority_ref", args.authority_ref),
                "orchestrator_model": reference_string(
                    "orchestrator_model", args.orchestrator_model or "unknown"
                ),
                "orchestrator_ref": reference_string("orchestrator_ref", args.orchestrator_ref or "unknown"),
            }
        )
    elif kind == "round":
        event.update(
            {
                "kind": "dispatch-round",
                "dispatch_id": reference_string("dispatch_id", args.dispatch_id),
                "round": positive_integer("round", args.round),
            }
        )
    elif kind == "verdict":
        event.update(
            {
                "kind": "dispatch-verdict",
                "dispatch_id": reference_string("dispatch_id", args.dispatch_id),
                "round": positive_integer("round", args.round),
                "verdict": choice("verdict", args.verdict, VERDICTS),
                "reviewer_ref": reference_string("reviewer_ref", args.reviewer_ref),
            }
        )
    elif kind == "acceptance":
        event.update(
            {
                "kind": "dispatch-acceptance",
                "dispatch_id": reference_string("dispatch_id", args.dispatch_id),
                "round": positive_integer("round", args.round),
                "decision": choice("decision", args.decision, DECISIONS),
                "authority_ref": reference_string("authority_ref", args.authority_ref),
            }
        )
    elif kind == "end":
        event.update(
            {
                "kind": "dispatch-end",
                "dispatch_id": reference_string("dispatch_id", args.dispatch_id),
                "state": choice("state", args.state, END_STATES),
            }
        )
    else:
        raise Rejected("unsupported-kind")
    event["id"] = event_id(event)
    return event


def event_id(event: dict) -> str:
    """`<kind>#<32 hex>` over the UTF-8 domain identity; deterministic and collision-safe."""
    digest = hashlib.sha256(identity_of(event).encode("utf-8")).hexdigest()[:IDENTITY_HASH_CHARS]
    return reference_string("id", f"{event['kind']}#{digest}")


def choice(field: str, value: str, allowed: tuple) -> str:
    if value not in allowed:
        raise Rejected("invalid-enum", field)
    return value


def positive_integer(field: str, value: str) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        raise Rejected("invalid-integer", field) from None
    if number <= 0:
        raise Rejected("invalid-integer", field)
    return number


def identity_of(event: dict) -> str:
    """The `|`-joined domain identity key that the event id is hashed from."""
    kind = event["kind"]
    if kind == "dispatch":
        return f"dispatch|{event['dispatch_id']}"
    if kind == "dispatch-round":
        return f"dispatch-round|{event['dispatch_id']}|{event['round']}"
    if kind == "dispatch-verdict":
        return f"dispatch-verdict|{event['dispatch_id']}|{event['round']}|{event['reviewer_ref']}"
    if kind == "dispatch-acceptance":
        return f"dispatch-acceptance|{event['dispatch_id']}"
    return f"dispatch-end|{event['dispatch_id']}"


def build_coverage(args) -> dict:
    change = reference_string("change_id", args.change)
    revision = reference_string("revision", args.revision)
    # `from` is a Python keyword, so argparse stores it under the same dest name.
    start = utc_timestamp("from", args.__dict__["from"])
    end = utc_timestamp("through", args.through)
    if start > end:
        raise Rejected("inverted-window")
    return {
        "change_id": change,
        "revisions": [revision],
        "from": start,
        "through": end,
        "kinds": list(RECORDED_KINDS),
        "complete": bool(args.complete),
    }


# -- Merge and validate ----------------------------------------------------


def canonical_json(value: object) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def read_file(path: str) -> dict:
    if not os.path.exists(path):
        return {"schema_version": SCHEMA_VERSION, "source_kind": SOURCE_KIND, "coverage": [], "events": []}
    try:
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, json.JSONDecodeError):
        raise Rejected("invalid-observations") from None
    if (
        not isinstance(data, dict)
        or not isinstance(data.get("events"), list)
        or not isinstance(data.get("coverage"), list)
    ):
        raise Rejected("invalid-observations")
    data.setdefault("schema_version", SCHEMA_VERSION)
    data.setdefault("source_kind", SOURCE_KIND)
    return data


def merge_event(data: dict, event: dict) -> bool:
    """Returns True when the event is new, False for an identical replay, raises a conflict."""
    payload = canonical_json({key: value for key, value in event.items() if key != "id"})
    identity = identity_of(event)
    for existing in data["events"]:
        if not isinstance(existing, dict):
            continue
        if existing.get("id") == event["id"] and existing_identity_of(existing) != identity:
            raise Rejected("id-collision", event["id"])
        existing_identity = existing_identity_of(existing)
        if existing_identity is None or existing_identity != identity:
            continue
        if canonical_json({key: value for key, value in existing.items() if key != "id"}) != payload:
            raise Rejected("conflicting-replay", event["id"])
        return False
    data["events"].append(event)
    return True


def existing_identity_of(event: dict) -> str | None:
    kind = event.get("kind")
    try:
        if kind == "dispatch":
            return f"dispatch|{event['dispatch_id']}"
        if kind == "dispatch-round":
            return f"dispatch-round|{event['dispatch_id']}|{event['round']}"
        if kind == "dispatch-verdict":
            return f"dispatch-verdict|{event['dispatch_id']}|{event['round']}|{event['reviewer_ref']}"
        if kind == "dispatch-acceptance":
            return f"dispatch-acceptance|{event['dispatch_id']}"
        if kind == "dispatch-end":
            return f"dispatch-end|{event['dispatch_id']}"
    except KeyError:
        return None
    return None


def merge_coverage(data: dict, entry: dict) -> bool:
    payload = canonical_json(entry)
    if any(canonical_json(existing) == payload for existing in data["coverage"]):
        return False
    data["coverage"].append(entry)
    return True


def at(event: dict) -> datetime.datetime:
    return instant_of(event)


def check_invariants(events: list) -> None:
    """The reader's referential, chronology and combination rules for the written kinds."""
    dispatches = {}
    ends = {}
    acceptances = {}
    rounds_by_dispatch = {}
    for event in events:
        if not isinstance(event, dict):
            continue
        kind = event.get("kind")
        if kind == "dispatch":
            dispatches[event["dispatch_id"]] = event
        elif kind == "dispatch-end":
            ends[event["dispatch_id"]] = event
        elif kind == "dispatch-acceptance":
            acceptances[event["dispatch_id"]] = event
        elif kind == "dispatch-round":
            rounds_by_dispatch.setdefault(event["dispatch_id"], []).append(event)

    for event in events:
        if not isinstance(event, dict) or event.get("kind") in ("dispatch", None):
            continue
        if "dispatch_id" not in event:
            continue
        dispatch = dispatches.get(event["dispatch_id"])
        if dispatch is None:
            raise Rejected("unknown-dispatch", str(event.get("id", "")))
        if dispatch.get("change_id") != event.get("change_id"):
            raise Rejected("change-mismatch", str(event.get("id", "")))
        if at(event) < at(dispatch):
            raise Rejected("precedes-dispatch", str(event.get("id", "")))

    for dispatch_id, rounds in rounds_by_dispatch.items():
        ordered = sorted(rounds, key=lambda item: item["round"])
        for index, event in enumerate(ordered):
            if event["round"] != index + 1:
                raise Rejected("round-gap", str(event.get("id", "")))
        for previous, current in zip(ordered, ordered[1:]):
            if not at(current) > at(previous):
                raise Rejected("round-order", str(current.get("id", "")))
        end = ends.get(dispatch_id)
        if end is not None and any(at(event) > at(end) for event in ordered):
            raise Rejected("round-after-end", str(end.get("id", "")))

    for event in events:
        kind = event.get("kind") if isinstance(event, dict) else None
        if kind not in ("dispatch-verdict", "dispatch-acceptance"):
            continue
        rounds = rounds_by_dispatch.get(event["dispatch_id"], [])
        matching = [item for item in rounds if item["round"] == event["round"]]
        if not matching:
            raise Rejected("unknown-round", str(event.get("id", "")))
        if at(event) < at(matching[0]):
            raise Rejected("verdict-precedes-round", str(event.get("id", "")))
        if kind == "dispatch-acceptance":
            last_round = max(item["round"] for item in rounds)
            if event["round"] != last_round:
                raise Rejected("acceptance-not-last-round", str(event.get("id", "")))

    for dispatch_id, acceptance in acceptances.items():
        end = ends.get(dispatch_id)
        if end is None:
            raise Rejected("acceptance-requires-end", str(acceptance.get("id", "")))
        if acceptance.get("decision") == "accepted" and end.get("state") != "completed":
            raise Rejected("accepted-after-non-completed", str(acceptance.get("id", "")))


# -- Locked transaction ----------------------------------------------------


def lock_timeout_ms(args) -> int:
    if args.lock_timeout_ms is not None:
        return args.lock_timeout_ms
    configured = os.environ.get("AGS_OBSERVATIONS_LOCK_TIMEOUT_MS")
    if configured is None:
        return DEFAULT_LOCK_TIMEOUT_MS
    try:
        value = int(configured)
    except (TypeError, ValueError):
        raise Rejected("invalid-lock-timeout") from None
    if value < 0:
        raise Rejected("invalid-lock-timeout")
    return value


def milliseconds(value: str) -> int:
    """`--lock-timeout-ms` values are a usage error when malformed; argparse exits 2."""
    try:
        number = int(value)
    except ValueError:
        raise argparse.ArgumentTypeError("must be an integer") from None
    if number < 0:
        raise argparse.ArgumentTypeError("must not be negative")
    return number


def lock_age_seconds(path: str) -> int | None:
    try:
        return int(time.time() - os.path.getmtime(path))
    except OSError:
        return None


def acquire_lock(path: str, timeout_ms: int) -> None:
    deadline = time.monotonic() + timeout_ms / 1000
    while True:
        try:
            descriptor = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
        except FileExistsError:
            if time.monotonic() >= deadline:
                age = lock_age_seconds(path)
                if age is not None and age >= STALE_LOCK_SECONDS:
                    raise Rejected("lock-timeout", f"stale-age-{age}s") from None
                raise Rejected("lock-timeout") from None
            time.sleep(LOCK_RETRY_SECONDS)
            continue
        except OSError:
            raise Rejected("lock-unavailable") from None
        try:
            with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
                json.dump({"pid": os.getpid(), "created_at": now_timestamp()}, handle)
        except Exception:
            remove_lock_quietly(path)
            raise Rejected("lock-unavailable") from None
        return


def remove_lock_quietly(path: str) -> None:
    try:
        os.unlink(path)
    except OSError:
        pass


def write_atomic(path: str, data: dict) -> None:
    directory = os.path.dirname(os.path.abspath(path))
    descriptor, temporary = tempfile.mkstemp(
        prefix=f"{os.path.basename(path)}.tmp-{os.getpid()}-", dir=directory
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    except BaseException:
        if os.path.exists(temporary):
            os.unlink(temporary)
        raise


def transact(path: str, apply) -> bool:
    """Acquire the lock, apply the change under it, write atomically, release the lock."""
    lock = f"{path}.lock"
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    acquire_lock(lock, lock_timeout_ms(ARGS))
    try:
        data = read_file(path)
        created = apply(data)
        if not created:
            return False
        write_atomic(path, data)
        return True
    finally:
        remove_lock_quietly(lock)


# -- CLI -------------------------------------------------------------------


def common_arguments(parser) -> None:
    parser.add_argument("--observations", required=True, help="delivery observation file")
    parser.add_argument("--change", required=True, help="change id")
    parser.add_argument("--revision", required=True, help="revision")
    parser.add_argument("--observed-at", help="UTC ISO timestamp; default now")
    parser.add_argument("--source-ref", default=DEFAULT_SOURCE_REF, help="source reference")
    parser.add_argument("--lock-timeout-ms", type=milliseconds, help="bounded lock wait in milliseconds")


def dispatch_arguments(parser) -> None:
    parser.add_argument("--dispatch-id", required=True)
    parser.add_argument("--role", required=True)
    parser.add_argument("--capability-hint", required=True, choices=CAPABILITY_HINTS)
    parser.add_argument("--provider")
    parser.add_argument("--model")
    parser.add_argument("--effort")
    parser.add_argument("--authority-ref", required=True)
    parser.add_argument("--orchestrator-model")
    parser.add_argument("--orchestrator-ref")


def round_arguments(parser) -> None:
    parser.add_argument("--dispatch-id", required=True)
    parser.add_argument("--round", required=True)


class SafeParser(argparse.ArgumentParser):
    """Reports a fixed code and an argument name; never repeats a supplied value."""

    def _check_value(self, action, value):
        if action.choices is not None and value not in action.choices:
            raise UsageError("invalid-choice", action.dest)
        return super()._check_value(action, value)

    def error(self, message):
        names = re.findall(r"--[A-Za-z][A-Za-z0-9-]*", message)
        raise UsageError("usage-error", names[0].lstrip("-") if names else "")


def parse_args(argv=None):
    parser = SafeParser(
        prog="record_dispatch.py",
        description="Append one dispatch-scoped observation under the shared lock.",
    )
    subparsers = parser.add_subparsers(dest="kind", required=True)

    dispatch_parser = subparsers.add_parser("dispatch", help="record one delegated worker")
    common_arguments(dispatch_parser)
    dispatch_arguments(dispatch_parser)

    round_parser = subparsers.add_parser("round", help="record one worker submission")
    common_arguments(round_parser)
    round_arguments(round_parser)

    verdict_parser = subparsers.add_parser("verdict", help="record one reviewer decision")
    common_arguments(verdict_parser)
    round_arguments(verdict_parser)
    verdict_parser.add_argument("--verdict", required=True, choices=VERDICTS)
    verdict_parser.add_argument("--reviewer-ref", required=True)

    acceptance_parser = subparsers.add_parser("acceptance", help="record one authorized decision")
    common_arguments(acceptance_parser)
    round_arguments(acceptance_parser)
    acceptance_parser.add_argument("--decision", required=True, choices=DECISIONS)
    acceptance_parser.add_argument("--authority-ref", required=True)

    end_parser = subparsers.add_parser("end", help="record the terminal state")
    common_arguments(end_parser)
    end_parser.add_argument("--dispatch-id", required=True)
    end_parser.add_argument("--state", required=True, choices=END_STATES)

    coverage_parser = subparsers.add_parser("coverage", help="declare observation coverage")
    common_arguments(coverage_parser)
    coverage_parser.add_argument("--from", required=True)
    coverage_parser.add_argument("--through", required=True)
    coverage_parser.add_argument("--complete", action="store_true", help="declare the inventory final")

    return parser.parse_args(argv)


ARGS = None


def main(argv=None) -> int:
    global ARGS
    ARGS = parse_args(argv)
    if ARGS.kind == "coverage":
        entry = build_coverage(ARGS)
        created = transact(ARGS.observations, lambda data: merge_coverage(data, entry))
        subject = f"coverage-{entry['change_id']}"
    else:
        event = build_event(ARGS.kind, ARGS)
        created = transact(ARGS.observations, lambda data: merge_and_check(data, event))
        subject = event["id"]
    print(f"{'wrote' if created else 'noop'} {subject}")
    return EXIT_OK


def merge_and_check(data: dict, event: dict) -> bool:
    created = merge_event(data, event)
    if created:
        check_invariants(data["events"])
    return created


def report(message: str, code: int) -> int:
    sys.stderr.write(f"{message}\n")
    return code


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Rejected as rejected:
        sys.exit(report(rejected.message(), EXIT_REJECTED))
    except UsageError as usage:
        sys.exit(report(usage.message(), EXIT_USAGE))
    except OSError:
        sys.exit(report("error filesystem-error", EXIT_REJECTED))
