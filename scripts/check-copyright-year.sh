#!/bin/bash

# This script checks that new files added in the current change have the current year
# in their copyright header.
#
# Usage: ./scripts/check-copyright-year.sh [baseline_ref]
# If no baseline_ref is provided, defaults to origin/main

set -e

CURRENT_YEAR=$(date +%Y)
BASELINE_REF="${1:-origin/main}"

# File patterns to check (matching check-license.sh patterns)
FILE_PATTERNS=(
    'scripts/*.js' 'scripts/*.jsx' 'scripts/*.ts' 'scripts/*.tsx'
    'packages/*/src/**/*.js' 'packages/*/src/**/*.jsx' 'packages/*/src/**/*.ts' 'packages/*/src/**/*.tsx'
    'packages/*/test/**/*.js' 'packages/*/test/**/*.jsx' 'packages/*/test/**/*.ts' 'packages/*/test/**/*.tsx'
    'packages/plexus/demo/**/*.js' 'packages/plexus/demo/**/*.jsx' 'packages/plexus/demo/**/*.ts' 'packages/plexus/demo/**/*.tsx'
)

# Try to get new files compared to baseline
# In CI, origin/main may not be available, so we handle that case
NEW_FILES=""
if git rev-parse --verify "$BASELINE_REF" >/dev/null 2>&1; then
    # Get newly added files (status 'A') that match our file patterns
    NEW_FILES=$(git diff --name-status "$BASELINE_REF" --diff-filter=A -- "${FILE_PATTERNS[@]}" \
        2>/dev/null | awk '{print $2}' || true)
fi

if [ -z "$NEW_FILES" ]; then
    echo "No new source files detected (or baseline '$BASELINE_REF' not available). Skipping copyright year check."
    exit 0
fi

# Check each new file for the current year in copyright header
FAILED_FILES=()
for file in $NEW_FILES; do
    if [ -f "$file" ]; then
        # Extract copyright line from the first 6 lines
        # New files should have a single copyright line with the current year
        COPYRIGHT_LINE=$(head -n6 "$file" | grep -E "Copyright \(c\) [0-9]{4}" | head -n1 || true)
        if [ -n "$COPYRIGHT_LINE" ]; then
            # Check if the copyright year is the current year
            if ! echo "$COPYRIGHT_LINE" | grep -qE "Copyright \(c\) $CURRENT_YEAR"; then
                FAILED_FILES+=("$file")
            fi
        fi
        # If no copyright line found, check-license.sh will catch it, so we skip here
    fi
done

if [ ${#FAILED_FILES[@]} -gt 0 ]; then
    echo "Copyright year check failed. The following new files do not have the current year ($CURRENT_YEAR) in their copyright header:"
    printf '  %s\n' "${FAILED_FILES[@]}"
    echo ""
    echo "Please update the copyright year to $CURRENT_YEAR in these files."
    exit 1
fi

echo "Copyright year check passed for all new files."
exit 0
