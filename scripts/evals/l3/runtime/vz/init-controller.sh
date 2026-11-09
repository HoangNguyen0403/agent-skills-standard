#!/bin/sh
# scripts/evals/l3/runtime/vz/init-controller.sh
#
# PID 1 of the attempt guest.
#
# The controller guest owns the state device: init formats it (the host stages a
# blank sparse file, never a filesystem) and mounts it at /state *before* the
# Node controller starts, so /state can never silently resolve to the root image.
# The input bundle is a raw device and is never mounted.
#
# A controller failure is not allowed to leave a VM running: the wrapper writes a
# fallback receipt when the controller could not and powers the guest off.

set -eu

STATE_DEVICE=/dev/vdb
STATE_MOUNT=/state
CONTROLLER=/opt/l3/controller.mjs

mkdir -p "$STATE_MOUNT"

if [ ! -b "$STATE_DEVICE" ]; then
    echo "init: state device $STATE_DEVICE is missing" >&2
    exit 1
fi

# The device is a blank sparse image from the host: there is no filesystem to
# preserve, and formatting is the only way the evidence artifacts can persist.
if ! blkid "$STATE_DEVICE" >/dev/null 2>&1; then
    mkfs.ext4 -q -F "$STATE_DEVICE"
fi

mount -t ext4 "$STATE_DEVICE" "$STATE_MOUNT"
mkdir -p "$STATE_MOUNT/volumes" "$STATE_MOUNT/input" "$STATE_MOUNT/build" "$STATE_MOUNT/stubs" "$STATE_MOUNT/candidate"

status=0
/usr/bin/node --max-old-space-size=768 --no-warnings --enable-source-maps "$CONTROLLER" || status=$?

if [ "$status" -ne 0 ]; then
    if [ ! -s "$STATE_MOUNT/receipt.json" ]; then
        printf '{"schema_version":1,"reason":"init_failure","exit_code":%s}\n' "$status" \
            > "$STATE_MOUNT/receipt.json"
    fi
    sync
    /sbin/poweroff -f || true
    exit "$status"
fi

sync
/sbin/poweroff -f || true
