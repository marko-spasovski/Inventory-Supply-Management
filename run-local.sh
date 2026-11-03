#!/usr/bin/env bash
# One terminal owns the local stack. Works from any working directory.
set -euo pipefail
PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3.10+ is required for the local launcher." >&2
  exit 1
fi
exec python3 -B -u "$PROJECT_DIR/scripts/run_local.py" "$@"
