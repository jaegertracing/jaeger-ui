#!/bin/bash
# Copyright (c) 2026 The Jaeger Authors.
# SPDX-License-Identifier: Apache-2.0
# Checks for stale pnpm overrides in the root package.json (pnpm.overrides).
#
# An override is stale when:
#   - phantom:    the package is not in the dependency tree at all (no-op override)
#
# Note: Under pnpm we only flag phantom overrides. Unlike npm's `npm ls`, pnpm's
# `pnpm why` does not annotate which instances were overridden, so we cannot
# reliably detect the "redundant but present" case without false positives.
# Nested/object overrides and `>`-scoped overrides are skipped.
set -euo pipefail

# Extract simple (string-valued, non-scoped) overrides from package.json#pnpm.overrides.
overrides=$(jq -r '
  .pnpm.overrides // {} | to_entries[]
  | select(.value | type == "string")
  | select(.key | contains(">") | not)
  | "\(.key) \(.value)"
' package.json)

if [ -z "$overrides" ]; then
  echo "No simple overrides found in package.json."
  exit 0
fi

failed=false
while IFS=' ' read -r pkg version; do
  [ -z "$pkg" ] && continue
  tree=$(pnpm why "$pkg" 2>&1) || true
  if echo "$tree" | grep -qiE "no projects|not found|\(empty\)"; then
    echo "⛔ phantom override: \"$pkg\": \"$version\" — package is not in the dependency tree"
    failed=true
  fi
done <<< "$overrides"

if [ "$failed" = "true" ]; then
  echo ""
  echo "Remove stale overrides from the root package.json."
  exit 1
else
  echo "All overrides are present in the dependency tree."
fi
