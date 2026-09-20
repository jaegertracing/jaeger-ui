#!/usr/bin/env bash
# Copyright (c) 2026 The Jaeger Authors.
# SPDX-License-Identifier: Apache-2.0
#
# Verify that the Vite dev server starts without errors.
# Catches regressions (e.g. dep-optimizer failures) that survive `pnpm run build`.
# Exits non-zero if the server emits a pre-transform or internal server error.
set -euo pipefail

PORT=15173
LOG=$(mktemp)
SERVER_PID=""

cleanup() {
  [[ -n "$SERVER_PID" ]] && kill "$SERVER_PID" 2>/dev/null || true
  rm -f "$LOG"
}
trap cleanup EXIT INT TERM

echo "Starting Vite dev server on port $PORT..."
pnpm --filter @jaegertracing/jaeger-ui start -- --port "$PORT" >"$LOG" 2>&1 &
SERVER_PID=$!

# Wait up to 30s for the "ready in" banner
READY=0
for _ in $(seq 1 30); do
  if grep -q "ready in" "$LOG"; then
    READY=1
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "❌ Dev server process exited unexpectedly"
    cat "$LOG"
    exit 1
  fi
  sleep 1
done

if [[ $READY -eq 0 ]]; then
  echo "❌ Dev server did not print 'ready in' within 30 seconds"
  cat "$LOG"
  exit 1
fi

# Give the server's warmup time to run (warmup.clientFiles triggers
# dep-optimization eagerly, so errors surface within a few seconds of startup).
sleep 8

if grep -qE "Pre-transform error|Internal server error" "$LOG"; then
  echo "❌ Dev server emitted errors after startup:"
  grep -E "Pre-transform error|Internal server error" "$LOG"
  exit 1
fi

echo "✅ Dev server started and warmed up without errors"
