#!/bin/sh
# scripts/evals/l3/runtime/vz/init-collector.sh
#
# PID 1 of the fresh collector guest.
#
# The evidence device is mounted read-only at /evidence before the collector
# starts. The collector never sees a path outside that mount and never writes to
# it. A collector failure exits nonzero without a completion frame, so the host
# records unavailable evidence instead of a partial success.

set -eu

EVIDENCE_DEVICE=/dev/vdb
EVIDENCE_MOUNT=/evidence
COLLECTOR=/opt/l3/collector.mjs

mkdir -p "$EVIDENCE_MOUNT"

if [ ! -b "$EVIDENCE_DEVICE" ]; then
    echo "init: evidence device $EVIDENCE_DEVICE is missing" >&2
    exit 1
fi

mount -t ext4 -o ro "$EVIDENCE_DEVICE" "$EVIDENCE_MOUNT"

status=0
/usr/bin/node --max-old-space-size=768 --no-warnings "$COLLECTOR" || status=$?

sync
/sbin/poweroff -f || true
exit "$status"
