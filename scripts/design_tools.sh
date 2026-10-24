#!/bin/sh
# Keep the engine cache inside the ignored project directory, not the user's home.
set -eu
HORO_DESIGN_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
export IMPECCABLE_HOME="$HORO_DESIGN_ROOT/.impeccable"
exec "$HORO_DESIGN_ROOT/.agents/skills/impeccable/scripts/impeccable" "$@"
