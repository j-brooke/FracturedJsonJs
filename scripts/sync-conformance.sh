#!/usr/bin/env sh
set -e

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
JS_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
CS_GOLDEN=${1:-"$JS_ROOT/../FracturedJson/Tests/Golden"}
DEST="$JS_ROOT/test/Golden"

if [ ! -f "$CS_GOLDEN/manifest.json" ]; then
    echo "C# Golden directory not found (missing manifest.json): $CS_GOLDEN" >&2
    echo "Usage: $0 [path-to-FracturedJson/Tests/Golden]" >&2
    exit 1
fi

mkdir -p "$DEST"
rsync -a --delete --exclude '.DS_Store' "$CS_GOLDEN/" "$DEST/"
echo "Copied $CS_GOLDEN -> $DEST"
