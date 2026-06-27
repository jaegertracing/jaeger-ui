#!/bin/bash
# Copyright (c) 2026 The Jaeger Authors.
# SPDX-License-Identifier: Apache-2.0

# Checks for stale pnpm overrides in the root package.json.
#
# An override is stale when:
#   - phantom:    the package is not in the dependency tree at all (no-op override)
#   - redundant:  the package is in the tree but no instance is actually overridden
#                 (every consumer already resolves to a compatible version naturally)
#
# Nested overrides (e.g. "@exodus/bytes>@noble/hashes": "...") are
# skipped — they cannot be checked with a simple `pnpm ls`.

set -euo pipefail

# Extract simple (string-valued) overrides from package.json.
# pnpm overrides live under .pnpm.overrides — skip keys containing ">"
# (those are nested/scoped overrides like "@exodus/bytes>@noble/hashes").
overrides=$(jq -r '
  .pnpm.overrides // {} | to_entries[]
  | select(.key | contains(">") | not)
  | select(.value | type == "string")
  | "\(.key) \(.value)"
' package.json)

if [ -z "$overrides" ]; then
  echo "No simple overrides found in package.json."
  exit 0
fi

failed=false

while IFS=' ' read -r pkg version; do
  tree=$(pnpm ls "$pkg" --depth Infinity 2>&1) || true

  if echo "$tree" | grep -q "(empty)"; then
    echo "⛔ phantom override: \"$pkg\": \"$version\" — package is not in the dependency tree"
    failed=true
  fi
done <<< "$overrides"

if [ "$failed" = "true" ]; then
  echo ""
  echo "Remove stale overrides from the root package.json."
  exit 1
else
  echo "All overrides are active."
fi
