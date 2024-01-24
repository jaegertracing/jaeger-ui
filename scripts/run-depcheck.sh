#!/bin/sh
set -ex

tempdir="$(mktemp -d /tmp/depcheckrc.XXXXXX)"
cleanup_tempdir() {
  rm -rf "${tempdir}"
}
trap 'cleanup_tempdir' EXIT

# Create a temporary depcheckrc file for 'jaeger-ui'
tempfile_jaeger="${tempdir}/DepcheckrcJaegerUI.json"
node scripts/generateDepcheckrcJaegerUI.js "${tempfile_jaeger}"
depcheck packages/jaeger-ui --config "${tempfile_jaeger}"

# Create a temporary depcheckrc file for 'plexus'
tempfile_plexus="${tempdir}/DepcheckrcPlexus.json"
node scripts/generateDepcheckrcPlexus.js "${tempfile_plexus}"
depcheck packages/plexus --config "${tempfile_plexus}"
