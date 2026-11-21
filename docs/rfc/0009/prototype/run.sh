#!/usr/bin/env bash
# This script starts the RFC 0009 prototype on http://localhost:5199 using the Vite that is
# installed for packages/jaeger-ui. Run `pnpm install` at the repository root first.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
exec "$here/../../../../packages/jaeger-ui/node_modules/.bin/vite" --config "$here/vite.config.mts" "$@"
