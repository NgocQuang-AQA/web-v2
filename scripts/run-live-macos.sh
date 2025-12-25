#!/usr/bin/env bash
set -euo pipefail

POSIX_DIR="${GLOBAL_LIVE_DIR:-/Users/gz-ngocquang/gz-project/global-live}"

cd "$POSIX_DIR"

mvn clean verify -P api-parallel-high
