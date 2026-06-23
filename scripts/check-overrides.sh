#!/bin/bash
# Copyright (c) 2026 The Jaeger Authors.
# SPDX-License-Identifier: Apache-2.0

# Checks for stale (phantom) pnpm overrides in the root package.json.
#
# An override is phantom when the package is not in the dependency tree at all,
# making the override a no-op.
#
# Overrides are read from the "pnpm.overrides" field. The following entries are
# skipped because their effect cannot be verified with a simple presence check:
#   - nested/scoped keys containing ">" (e.g. "@exodus/bytes>@noble/hashes")
#   - reference values starting with "$" (e.g. "$@noble/hashes")
#
# Note: unlike npm, pnpm does not annotate "overridden" packages in its
# dependency listing, so this script cannot detect "redundant" overrides (ones
# whose target would resolve to the same version naturally, without the
# override). Only phantom overrides are detected.

set -euo pipefail

# Extract simple (string-valued, non-reference, non-nested) override package
# names from package.json's pnpm.overrides, one per line.
overrides=$(jq -r '
  .pnpm.overrides // {} | to_entries[]
  | select((.key | contains(">")) | not)
  | select((.value | type == "string") and (.value | startswith("$") | not))
  | .key
' package.json)

if [ -z "$overrides" ]; then
  echo "No simple overrides found in package.json."
  exit 0
fi

failed=false

while IFS= read -r pkg; do
  [ -z "$pkg" ] && continue
  # `pnpm why` lists the dependency chains that lead to $pkg across all workspace
  # projects. A project node carries a "dependencies"/"devDependencies" key only
  # when at least one such chain exists, i.e. the package is present in the tree.
  present=$(pnpm why "$pkg" -r --json 2>/dev/null \
    | jq -r 'any(.[]; has("dependencies") or has("devDependencies"))')

  if [ "$present" != "true" ]; then
    echo "⛔ phantom override: \"$pkg\" — package is not in the dependency tree"
    failed=true
  fi
done <<< "$overrides"

if [ "$failed" = "true" ]; then
  echo ""
  echo "Remove stale overrides from the root package.json (pnpm.overrides)."
  exit 1
else
  echo "All overrides are active."
fi
