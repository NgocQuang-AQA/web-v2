#!/usr/bin/env bash
set -euo pipefail

POSIX_DIR="${GLOBAL_CN_DIR:-/Users/gz-ngocquang/gz-project/global-cn}"

cd "$POSIX_DIR"

mvn clean verify -P api-parallel-high
