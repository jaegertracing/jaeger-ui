#!/bin/sh
set -ex

# Create a temporary depcheckrc file for 'jaeger-ui'
tempfile_jaeger=$(mktemp /tmp/depcheckrc.XXXXXX.json)
node scripts/generateDepcheckrcJaegerUI.js "$tempfile_jaeger"
depcheck packages/jaeger-ui --config "$tempfile_jaeger"

# Create a temporary depcheckrc file for 'plexus'
tempfile_plexus=$(mktemp /tmp/depcheckrc.XXXXXX.json)
node scripts/generateDepcheckrcPlexus.js "$tempfile_plexus"
depcheck packages/plexus --config "$tempfile_plexus"
