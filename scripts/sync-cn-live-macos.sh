#!/usr/bin/env bash
set -euo pipefail

POSIX_DIR="${GLOBAL_CN_DIR:-/Users/gz-ngocquang/gz-project/globalcn-live}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$POSIX_DIR"

if [ -x "./update-test-data" ]; then
  ./update-test-data
elif [ -f "$SCRIPT_DIR/update-test-data" ]; then
  chmod +x "$SCRIPT_DIR/update-test-data" || true
  "$SCRIPT_DIR/update-test-data"
else
  echo "script_not_found"
  exit 1
fi

