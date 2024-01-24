#!/bin/sh
set -ex

tempdir=$(mktemp -d /tmp/depcheckrc.XXXXXX)

# Create a temporary depcheckrc file for 'jaeger-ui'
tempfile_jaeger="${tempdir}/DepcheckrcJaegerUI.json"
node scripts/generateDepcheckrcJaegerUI.js "$tempfile_jaeger"
depcheck packages/jaeger-ui --config "$tempfile_jaeger"

# Create a temporary depcheckrc file for 'plexus'
tempfile_jaeger="${tempdir}/DepcheckrcPlexus.json"
node scripts/generateDepcheckrcPlexus.js "$tempfile_plexus"
depcheck packages/plexus --config "$tempfile_plexus"
