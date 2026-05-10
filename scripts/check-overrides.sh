#!/bin/bash
# Copyright (c) 2026 The Jaeger Authors.
# SPDX-License-Identifier: Apache-2.0

# Checks for stale npm overrides in the root package.json.
#
# An override is stale when:
#   - phantom:    the package is not in the dependency tree at all (no-op override)
#   - redundant:  the package is in the tree but no instance is actually overridden
#                 (every consumer already resolves to a compatible version naturally)
#
# Nested/object overrides (e.g. "@exodus/bytes": {"@noble/hashes": "..."}) are
# skipped — they cannot be checked with a simple `npm ls`.

set -euo pipefail

# Extract simple (string-valued) overrides from package.json.
# jq outputs "name version" pairs, one per line.
overrides=$(jq -r '
  .overrides // {} | to_entries[]
  | select(.value | type == "string")
  | "\(.key) \(.value)"
' package.json)

if [ -z "$overrides" ]; then
  echo "No simple overrides found in package.json."
  exit 0
fi

failed=false

while IFS=' ' read -r pkg version; do
  tree=$(npm ls "$pkg" --all 2>&1) || true

  if echo "$tree" | grep -q "(empty)"; then
    echo "⛔ phantom override: \"$pkg\": \"$version\" — package is not in the dependency tree"
    failed=true
  elif ! echo "$tree" | grep -q "overridden"; then
    echo "⛔ redundant override: \"$pkg\": \"$version\" — all instances resolve naturally, override not needed"
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
