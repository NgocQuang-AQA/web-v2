#!/usr/bin/env bash
set -euo pipefail

POSIX_DIR="${GLOBAL_CN_LIVE_DIR:-/Users/gz-ngocquang/gz-project/globalcn-live}"

cd "$POSIX_DIR"

mvn clean verify -P api-parallel-high
