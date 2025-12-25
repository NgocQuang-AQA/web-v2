#!/usr/bin/env bash
set -euo pipefail

POSIX_DIR="${GLOBAL_QA_DIR:-/Users/gz-ngocquang/gz-project/global-qa}"

cd "$POSIX_DIR"

mvn clean verify -P api-parallel-high -Dit.test=FeeListApiTest
