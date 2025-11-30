#!/bin/bash

# This script checks that new files added in the current change have the current year
# in their copyright header and do not include the full Apache license text.
#
# Usage: ./scripts/check-copyright-year.sh [baseline_ref]
# If no baseline_ref is provided:
#   - In GitHub CI (pull_request), uses GITHUB_BASE_REF (e.g., 'main')
#   - Otherwise, defaults to origin/main

set -e

CURRENT_YEAR=$(date +%Y)

# Determine baseline reference
if [ -n "$1" ]; then
    BASELINE_REF="$1"
elif [ -n "$GITHUB_BASE_REF" ]; then
    # In GitHub Actions pull_request event, GITHUB_BASE_REF contains the base branch name
    BASELINE_REF="origin/$GITHUB_BASE_REF"
else
    BASELINE_REF="origin/main"
fi

# File patterns to check
FILE_PATTERNS=(
    'scripts/**'
    'packages/*/src/**'
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

# Check each new file for the current year in copyright header and no full Apache license
FAILED_YEAR_FILES=()
FAILED_LICENSE_FILES=()
for file in $NEW_FILES; do
    if [ -f "$file" ]; then
        # Extract copyright line from the first 6 lines
        # New files should have a single copyright line with the current year
        COPYRIGHT_LINE=$(head -n6 "$file" | grep -E "Copyright \(c\) [0-9]{4}" | head -n1 || true)
        if [ -n "$COPYRIGHT_LINE" ]; then
            # Check if the copyright year is the current year
            if ! echo "$COPYRIGHT_LINE" | grep -qE "Copyright \(c\) $CURRENT_YEAR"; then
                FAILED_YEAR_FILES+=("$file")
            fi
        fi
        # If no copyright line found, check-license.sh will catch it, so we skip here

        # Check if file contains full Apache license text in the header (should use SPDX instead)
        # Only check the first 20 lines where license headers would appear
        if head -n20 "$file" | grep -q "Licensed under the Apache License" 2>/dev/null; then
            FAILED_LICENSE_FILES+=("$file")
        fi
    fi
done

HAS_ERRORS=0

if [ ${#FAILED_YEAR_FILES[@]} -gt 0 ]; then
    echo "Copyright year check failed. The following new files do not have the current year ($CURRENT_YEAR) in their copyright header:"
    printf '  🛑 %s\n' "${FAILED_YEAR_FILES[@]}"
    echo ""
    echo "Please update the copyright year to $CURRENT_YEAR in these files."
    HAS_ERRORS=1
fi

if [ ${#FAILED_LICENSE_FILES[@]} -gt 0 ]; then
    echo ""
    echo "Full Apache license text found. The following new files should use SPDX reference instead:"
    printf '  🛑 %s\n' "${FAILED_LICENSE_FILES[@]}"
    echo ""
    echo "Please replace the full license text with just:"
    echo "  // SPDX-License-Identifier: Apache-2.0"
    echo ""
    echo "See https://github.com/jaegertracing/jaeger-ui/blob/main/CONTRIBUTING.md#license"
    HAS_ERRORS=1
fi

if [ $HAS_ERRORS -eq 1 ]; then
    exit 1
fi

echo "Copyright year check passed for all new files."
exit 0
