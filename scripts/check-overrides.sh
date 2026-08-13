#!/bin/bash
# Copyright (c) 2026 The Jaeger Authors.
# SPDX-License-Identifier: Apache-2.0

# Checks for stale (phantom) overrides in the active pnpm configuration.
#
# An override is phantom when the package is not in the dependency tree at all,
# making the override a no-op.
#
# Overrides are read through `pnpm config` so the check follows the configuration
# source supported by the active pnpm version. The following entries are skipped
# because their effect cannot be verified with a simple presence check:
#   - nested/scoped keys containing ">" (e.g. "@exodus/bytes>@noble/hashes")
#   - reference values starting with "$" (e.g. "$@noble/hashes")
#
# Note: unlike npm, pnpm does not annotate "overridden" packages in its
# dependency listing, so this script cannot detect "redundant" overrides (ones
# whose target would resolve to the same version naturally, without the
# override). Only phantom overrides are detected.

set -euo pipefail

# Extract simple (string-valued, non-reference, non-nested) override package
# names from pnpm's active overrides configuration, one per line.
overrides=$(pnpm config get overrides --json | node -e '
  const fs = require("fs");
  try {
    const data = JSON.parse(fs.readFileSync(0, "utf-8")) || {};
    for (const [key, val] of Object.entries(data)) {
      if (!key.includes(">") && typeof val === "string" && !val.startsWith("$")) {
        console.log(key);
      }
    }
  } catch {}
')

if [ -z "$overrides" ]; then
  echo "No simple overrides found in the active pnpm configuration."
  exit 0
fi

failed=false

while IFS= read -r pkg; do
  [ -z "$pkg" ] && continue
  # `pnpm why` lists the dependency chains that lead to $pkg across all workspace
  # projects. pnpm 10 reports project nodes with "dependencies"/"devDependencies";
  # pnpm 11 reports package nodes with a non-empty "dependents" array.
  # Tolerate a non-zero exit or non-JSON output (treat as "not present") so that
  # under `set -euo pipefail` the loop still reports every phantom override.
  why_json=$(pnpm why "$pkg" -r --json 2>/dev/null) || why_json=""
  present=$(printf '%s' "$why_json" | node -e '
    const fs = require("fs");
    try {
      const data = JSON.parse(fs.readFileSync(0, "utf-8"));
      const isPresent = Array.isArray(data) && data.some(item =>
        item && (
          "dependencies" in item ||
          "devDependencies" in item ||
          (Array.isArray(item.dependents) && item.dependents.length > 0)
        )
      );
      console.log(isPresent ? "true" : "false");
    } catch {
      console.log("false");
    }
  ' 2>/dev/null) || present="false"
  [ -n "$present" ] || present="false"

  if [ "$present" != "true" ]; then
    echo "⛔ phantom override: \"$pkg\" — package is not in the dependency tree"
    failed=true
  fi
done <<< "$overrides"

if [ "$failed" = "true" ]; then
  echo ""
  echo "Remove stale overrides from pnpm-workspace.yaml (overrides)."
  exit 1
else
  echo "All overrides are active."
fi
