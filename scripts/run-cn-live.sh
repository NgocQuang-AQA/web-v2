#!/usr/bin/env bash
set -euo pipefail

WINDOWS_DIR="${GLOBAL_CN_LIVE_DIR:-D:\Project\globalcn-live}"

to_posix() {
  local p="$1"
  if command -v wslpath >/dev/null 2>&1; then
    wslpath -u "$p"
    return
  fi
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -u "$p"
    return
  fi
  case "$p" in
    [A-Za-z]:\\*)
      local drive
      drive="$(printf '%s' "$p" | cut -c1 | tr '[:upper:]' '[:lower:]')"
      local rest
      rest="$(printf '%s' "$p" | cut -c3- | tr '\\' '/')"
      printf '/mnt/%s/%s\n' "$drive" "$rest"
      ;;
    *)
      printf '%s\n' "$p"
      ;;
  esac
}

POSIX_DIR="$(to_posix "$WINDOWS_DIR")"

cd "$POSIX_DIR"

mvn clean verify -P api-parallel-high
