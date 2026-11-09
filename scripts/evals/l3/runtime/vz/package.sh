#!/bin/sh
# scripts/evals/l3/runtime/vz/package.sh
#
# Thin wrapper for the packaging implementation in package.mjs. The Node
# implementation keeps the emitted module graph at its relative-import
# locations, writes thin launchers, emits the D3 driver tree plus its digest
# manifest, and compiles the VZ runner with the locally installed toolchain.
#
# No VM boot, signing, install, network or package acquisition is performed.

set -eu

DIR="$(cd "$(dirname "$0")" && pwd)"
DIST="${1:-$DIR/../dist}"

exec node "$DIR/package.mjs" "$DIST"
