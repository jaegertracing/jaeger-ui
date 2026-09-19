#!/usr/bin/env bash
# Copyright (c) 2026 The Jaeger Authors.
# SPDX-License-Identifier: Apache-2.0
#
# Regenerates the v3 trace contract fixture from a pinned Jaeger.
#
# The fixture is a real GET /api/v3/traces/{id} response, so the contract tests
# parse genuine backend output. Every input that can change the shape of that
# output is pinned here rather than left to a default:
#
#   * The image is pinned by digest, not tag. A tag can be re-pushed; a digest
#     cannot.
#   * Storage is declared, not inherited. jaeger-fixture-config.yaml names
#     in-memory storage explicitly, so "which storage produced this fixture" has
#     a checked-in answer instead of depending on the default compiled into the
#     binary. A capture taken this way is identical to one taken with the image
#     default, which is what confirms that default was in-memory all along.
#   * The payload is a checked-in file with explicit trace and span IDs and
#     explicit nanosecond timestamps, so the submitted trace is byte-identical
#     on every run.
#   * raw_traces is passed explicitly. false keeps Jaeger's enrichment, such as
#     clock skew adjustment, which is what the UI receives in production. Do not
#     flip this to true without regenerating: it returns a different document.
#   * The capture is accepted only once every span in the probe has come back,
#     rather than on the first HTTP 200. With this image the trace becomes
#     visible atomically, so this is a guard rather than a fix for an observed
#     failure: it keeps the guarantee if the probe ever grows past a single
#     OTLP batch, or if the storage default behind the digest changes.
#
# The backend is allowed to vary attribute order, since attributes are an
# unordered collection. The tests look attributes up by key and --check sorts
# them before comparing, so a reordering never reads as drift. An unset status
# arrives as {} in this capture; if the backend ever omits it instead, the
# status test fails and --check flags it, which is intended because the parsed
# shape differs.
#
# Usage: scripts/generate-v3-fixture.sh [--check]
#   --check regenerates into a temporary file and diffs it against the committed
#   fixture instead of overwriting it. Exits non-zero on drift.

set -euo pipefail

# jaegertracing/jaeger:2.21.0, multi-arch manifest. IMAGE_TAG names the version
# the digest resolves to and supplies the fixture filename; bump both together.
readonly IMAGE="jaegertracing/jaeger@sha256:3d0ac795ff98aa04d1be04311d2dac6c25b4bfc8322dc02e53bc5b170c5018c3"
readonly IMAGE_TAG="2.21.0"
readonly CONTAINER="jaeger-v3-fixture"
readonly TRACE_ID="0123456789abcdef0123456789abcdef"
readonly RAW_TRACES="false"

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
api_dir="$script_dir/../packages/jaeger-ui/src/api/v3"
probe="$api_dir/v3-trace-probe.json"
fixture="$api_dir/v3-trace-local-$IMAGE_TAG.json"
config="$script_dir/jaeger-fixture-config.yaml"

check_only="false"
if [[ "${1:-}" == "--check" ]]; then
  check_only="true"
elif [[ $# -gt 0 ]]; then
  echo "Usage: $0 [--check]" >&2
  exit 2
fi

for tool in docker curl python3; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Required tool '$tool' is not on PATH." >&2
    exit 1
  fi
done

if [[ ! -f "$probe" ]]; then
  echo "Probe payload not found at $probe." >&2
  exit 1
fi

if [[ ! -f "$config" ]]; then
  echo "Jaeger config not found at $config." >&2
  exit 1
fi

tmpfile=""
cleanup() {
  docker rm --force "$CONTAINER" >/dev/null 2>&1 || true
  if [[ -n "$tmpfile" ]]; then
    rm -f "$tmpfile"
  fi
  return 0
}
trap cleanup EXIT

# Counts the spans in a trace document read from stdin. Accepts both shapes in
# play here: the bare TracesData the probe submits, and the {"result": ...}
# envelope the query API answers with. Prints 0 for anything that does not
# parse, so the readiness loop keeps waiting rather than failing.
count_spans() {
  python3 -c 'import json, sys
try:
    doc = json.load(sys.stdin)
except Exception:
    print(0)
    sys.exit(0)
if not isinstance(doc, dict):
    print(0)
    sys.exit(0)
traces_data = doc.get("result", doc)
total = 0
for rs in traces_data.get("resourceSpans") or []:
    for ss in rs.get("scopeSpans") or []:
        total += len(ss.get("spans") or [])
print(total)'
}

# Taken from the probe rather than hard-coded, so the readiness gate stays in
# sync when the payload gains or loses a span.
expected_spans="$(count_spans <"$probe")"
if [[ "$expected_spans" == "0" ]]; then
  echo "Could not count spans in $probe." >&2
  exit 1
fi

cleanup

# Fail loudly if the digest stops resolving to the version the fixture is named
# after. The image reports this itself; it carries no version label. This also
# pulls the image, so the readiness loop below is not racing a download.
image_version="$(docker run --rm "$IMAGE" version 2>/dev/null |
  python3 -c 'import json, sys
try:
    print(json.load(sys.stdin).get("gitVersion", "").lstrip("v"))
except Exception:
    print("")' || true)"
if [[ -z "$image_version" ]]; then
  echo "Could not read the version from $IMAGE." >&2
  exit 1
fi
if [[ "$image_version" != "$IMAGE_TAG" ]]; then
  echo "Digest resolves to $image_version but IMAGE_TAG says $IMAGE_TAG." >&2
  exit 1
fi

echo "Starting $IMAGE (reports version $image_version)"
docker run --detach --rm --name "$CONTAINER" \
  --publish 16686:16686 \
  --publish 4318:4318 \
  --volume "$config:/jaeger-fixture-config.yaml:ro" \
  "$IMAGE" --config=file:/jaeger-fixture-config.yaml >/dev/null

# /api/v3/services, not the v1 /api/services, which 404s on Jaeger v2. This
# probes the same API the fixture is captured from.
echo -n "Waiting for the query API"
ready="false"
for _ in $(seq 1 60); do
  if curl --fail --silent http://localhost:16686/api/v3/services >/dev/null 2>&1; then
    ready="true"
    break
  fi
  echo -n .
  sleep 1
done
echo
if [[ "$ready" != "true" ]]; then
  # Without this a bad config looks like a 60-second timeout with no explanation.
  {
    echo "Query API never became ready. Container logs:"
    docker logs "$CONTAINER" 2>&1 || echo "  (the container is no longer running)"
  } >&2
  exit 1
fi

curl --fail --silent --show-error \
  --header 'Content-Type: application/json' \
  --data-binary "@$probe" \
  http://localhost:4318/v1/traces >/dev/null
echo "Submitted trace $TRACE_ID with $expected_spans spans"

# Wait for the whole trace rather than for a 200, so a capture can never be
# short a span. Keep the body that satisfied the gate instead of re-fetching, so
# the captured document is the one that was actually checked.
echo -n "Waiting for all $expected_spans spans to be queryable"
body=""
stored="false"
for _ in $(seq 1 30); do
  body="$(curl --fail --silent "http://localhost:16686/api/v3/traces/$TRACE_ID?raw_traces=$RAW_TRACES" 2>/dev/null || true)"
  if [[ -n "$body" ]] && [[ "$(printf '%s' "$body" | count_spans)" == "$expected_spans" ]]; then
    stored="true"
    break
  fi
  echo -n .
  sleep 1
done
echo
if [[ "$stored" != "true" ]]; then
  echo "Trace $TRACE_ID never returned all $expected_spans spans." >&2
  exit 1
fi

# The response is written exactly as it arrived and then handed to the repo
# formatter, which is what makes the committed file reproducible: pretty-printing
# it here first would not survive the round trip. Prettier preserves whether an
# object was already split across lines, so an intermediate pretty-printer leaves
# a different file than the raw wire bytes do, and every regeneration would show
# a cosmetic diff.
#
# It renders into a temporary file first because redirecting straight onto the
# fixture would truncate the committed file before anything had been written.
tmpfile="$(mktemp)"
printf '%s' "$body" >"$tmpfile"

if [[ "$check_only" == "true" ]]; then
  # Compare parsed JSON, not bytes. The committed file is normalised by the repo
  # formatter and may be checked out with CRLF, neither of which is drift. The
  # unordered collections are sorted first, for the reason given at the top of
  # this file: a reordered attribute list is a different document but the same
  # contract, and failing on it would contradict what the tests assert.
  python3 - "$fixture" "$tmpfile" <<'PY'
import json
import sys


def normalise(node):
    """Sort the collections OTLP defines as unordered; leave ordered ones alone.

    Attribute lists and kvlist values are sets of keyed entries, and spans within
    a scope have no defined order. Arrays, events and links are ordered and are
    left exactly as the server sent them.
    """
    if isinstance(node, dict):
        out = {}
        for key, value in node.items():
            value = normalise(value)
            if key == "attributes" and isinstance(value, list):
                value = sorted(value, key=lambda a: a.get("key", ""))
            elif key == "spans" and isinstance(value, list):
                value = sorted(value, key=lambda s: s.get("spanId", ""))
            elif key == "values" and isinstance(value, list):
                # Only reached for kvlistValue.values, whose entries are keyed;
                # arrayValue.values are positional and have no "key".
                if all(isinstance(v, dict) and "key" in v for v in value):
                    value = sorted(value, key=lambda v: v["key"])
            out[key] = value
        return out
    if isinstance(node, list):
        return [normalise(item) for item in node]
    return node


with open(sys.argv[1]) as f:
    committed = normalise(json.load(f))
with open(sys.argv[2]) as f:
    fresh = normalise(json.load(f))

if committed == fresh:
    print("Fixture is up to date.")
    sys.exit(0)

print("Fixture drifted from a fresh capture.", file=sys.stderr)
print(json.dumps(fresh, indent=2, sort_keys=True), file=sys.stderr)
sys.exit(1)
PY
else
  cp "$tmpfile" "$fixture"
  echo "Wrote $fixture"
  # The file is one line of wire JSON at this point, so it has to go through the
  # formatter before it is committable or `pnpm run fmt-lint` fails in CI. Exit
  # non-zero when that cannot happen here: the capture is correct but not yet
  # committable, and a zero exit would let it slip into a commit unformatted.
  # pnpm resolves from the working directory, so run it from the repo root
  # rather than wherever the caller happened to be.
  if command -v pnpm >/dev/null 2>&1 &&
    (cd "$script_dir/.." && pnpm exec vp fmt "$fixture" >/dev/null 2>&1); then
    echo "Formatted with vp fmt."
  else
    {
      echo
      echo "The formatter could not run here, so $fixture is still raw wire JSON."
      echo "Run 'pnpm exec vp fmt' on it before committing, or CI's fmt-lint will fail."
    } >&2
    exit 3
  fi
fi
