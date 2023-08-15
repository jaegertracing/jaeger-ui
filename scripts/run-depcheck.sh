#!/bin/sh
# This script runs depcheck on two different packages: 'jaeger-ui' and 'plexus'

# Run depcheck for the 'jaeger-ui' package
(
  node scripts/generateDepcheckrcJaegerUI.js &&               # Generate depcheckrc for 'jaeger-ui'
  depcheck packages/jaeger-ui &&                              # Run depcheck on 'jaeger-ui'
  rm -f packages/jaeger-ui/.depcheckrc.json                   # Clean up generated depcheckrc
) || (
  EXIT_CODE=$?                                                # Store the exit code from the previous command
  rm -f packages/jaeger-ui/.depcheckrc.json                   # Clean up generated depcheckrc
  exit $EXIT_CODE                                             # Exit with the stored exit code
)

# Run depcheck for the 'plexus' package
(
  node scripts/generateDepcheckrcPlexus.js &&                 # Generate depcheckrc for 'plexus'
  depcheck packages/plexus &&                                 # Run depcheck on 'plexus'
  rm -f packages/plexus/.depcheckrc.json                      # Clean up generated depcheckrc
) || (
  EXIT_CODE=$?                                                # Store the exit code from the previous command
  rm -f packages/plexus/.depcheckrc.json                      # Clean up generated depcheckrc
  exit $EXIT_CODE                                             # Exit with the stored exit code
)
