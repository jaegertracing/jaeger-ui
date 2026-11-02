#!/bin/bash
# Copyright (c) 2026 The Jaeger Authors.
# SPDX-License-Identifier: Apache-2.0

# Checks that every place that pins the Node.js major agrees.
#
# The major is pinned in four places, each read by a different tool:
#   - .nvmrc                          nvm, for local development
#   - engines.node in package.json    actions/setup-node in CI, as the minimum
#   - FROM node:<tag> in the CI Dockerfile
#   - @types/node in packages/jaeger-ui/package.json and in the pnpm override
#
# Dependency bots update them through separate managers and can land some of
# them before the others, so this check fails until they agree on one major.

set -euo pipefail

failed=false

# Prints the leading major from a version string, or reports the source that
# did not yield one. A value such as `lts/*` or `null` is a failure in its own
# right, not a major that happens to differ.
major_of() {
  local label=$1 raw=$2 major
  major=$(printf '%s' "$raw" | sed -nE 's/^[^0-9]*([0-9]+).*/\1/p')
  if [ -z "$major" ]; then
    echo "⛔ could not read a Node.js major from $label: '$raw'"
    failed=true
    return
  fi
  printf '%-44s %s\n' "$label" "$major"
  majors+=("$major")
}

majors=()

major_of '.nvmrc' "$(tr -d '[:space:]' < .nvmrc)"

major_of 'package.json engines.node' "$(jq -r '.engines.node // ""' package.json)"

# Every stage of the Dockerfile that starts from a node image must use the same tag.
docker_tags=$(grep -E '^FROM ' .github/workflows/Dockerfile | grep -oE 'node:[^ @]+' | sort -u || true)
if [ "$(printf '%s\n' "$docker_tags" | grep -c .)" -ne 1 ]; then
  echo "⛔ expected exactly one node image tag in .github/workflows/Dockerfile, found: ${docker_tags:-none}"
  failed=true
else
  major_of '.github/workflows/Dockerfile FROM node' "${docker_tags#node:}"
fi

major_of 'packages/jaeger-ui/package.json @types/node' \
  "$(jq -r '.devDependencies["@types/node"] // .dependencies["@types/node"] // ""' packages/jaeger-ui/package.json)"

major_of 'pnpm override @types/node' \
  "$(pnpm config get overrides --json 2>/dev/null | jq -r '.["@types/node"] // ""')"

if [ "$failed" = "true" ]; then
  exit 1
fi

if [ "$(printf '%s\n' "${majors[@]}" | sort -u | wc -l)" -ne 1 ]; then
  echo ""
  echo "⛔ Node.js version pins disagree. Update them together so every row above shows the same major."
  exit 1
fi

echo "All Node.js version pins agree on major ${majors[0]}."
