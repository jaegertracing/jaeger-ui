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
# Renovate updates them through separate managers and can land some of them
# before the others, so this check fails until they agree on one major.

set -euo pipefail

nvmrc_major=$(tr -d '[:space:]' < .nvmrc | sed -E 's/^v?([0-9]+).*/\1/')

engines_major=$(jq -r '.engines.node' package.json | sed -E 's/^[^0-9]*([0-9]+).*/\1/')

dockerfile_major=$(grep -E '^FROM node:' .github/workflows/Dockerfile | head -1 | sed -E 's/^FROM node:([0-9]+).*/\1/')

types_dep_major=$(jq -r '.devDependencies["@types/node"] // .dependencies["@types/node"]' packages/jaeger-ui/package.json | sed -E 's/^[^0-9]*([0-9]+).*/\1/')

types_override_major=$(pnpm config get overrides --json | jq -r '.["@types/node"]' | sed -E 's/^[^0-9]*([0-9]+).*/\1/')

printf '%-44s %s\n' \
  '.nvmrc' "$nvmrc_major" \
  'package.json engines.node' "$engines_major" \
  '.github/workflows/Dockerfile FROM node' "$dockerfile_major" \
  'packages/jaeger-ui/package.json @types/node' "$types_dep_major" \
  'pnpm override @types/node' "$types_override_major"

if [ "$nvmrc_major" = "$engines_major" ] &&
   [ "$nvmrc_major" = "$dockerfile_major" ] &&
   [ "$nvmrc_major" = "$types_dep_major" ] &&
   [ "$nvmrc_major" = "$types_override_major" ]; then
  echo "All Node.js version pins agree on major $nvmrc_major."
  exit 0
fi

echo ""
echo "⛔ Node.js version pins disagree. Update them together so every row above shows the same major."
exit 1
