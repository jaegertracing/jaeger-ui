#!/bin/bash
set -e

tempdir="$(mktemp -d /tmp/depcheckrc.XXXXXX)"
cleanup_tempdir() {
  rm -rf "${tempdir}"
}
trap 'cleanup_tempdir' EXIT

runDepcheck() {
  local dir="$1"
  local cfg="$2"
  echo "Checking ${dir}"
  node node_modules/depcheck/bin/depcheck.js "${dir}" --config "${cfg}" | sed 's/^\*/⛔/' | sed 's/^/    /g'
  return $((! ${PIPESTATUS[0]}))
}

failed="false"

tempfile_jaeger="${tempdir}/DepcheckrcJaegerUI.json"
node scripts/generateDepcheckrcJaegerUI.js "${tempfile_jaeger}"
if runDepcheck packages/jaeger-ui "${tempfile_jaeger}"; then
  failed="true"
fi

tempfile_plexus="${tempdir}/DepcheckrcPlexus.json"
node scripts/generateDepcheckrcPlexus.js "${tempfile_plexus}"
if runDepcheck packages/plexus "${tempfile_plexus}"; then
  failed="true"
fi

if [[ "$failed" == "true" ]]; then
  exit 1
fi
