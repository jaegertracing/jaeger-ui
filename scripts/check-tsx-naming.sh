#!/bin/bash

# Copyright (c) 2026 The Jaeger Authors.
# SPDX-License-Identifier: Apache-2.0

UPDATE=false
DRY_RUN=false
while getopts "ud" opt; do
  case $opt in
    u) UPDATE=true ;;
    d) DRY_RUN=true ;;
    *) echo "Usage: $0 [-u] [-d]" >&2; exit 1 ;;
  esac
done

MISNAMED_FILES=()
CANDIDATES=()

# Find all .tsx files
ALL_TSX=$(find . -name "*.tsx" -not -path "*/node_modules/*")

for file in $ALL_TSX; do
    # Fast path: if no JSX-like patterns, it's definitely misnamed
    if ! grep -q -E "<[a-zA-Z]|</[a-zA-Z]|<>" "$file"; then
        MISNAMED_FILES+=("$file")
    else
        # Potentially contains JSX, add to candidates for AST check
        CANDIDATES+=("$file")
    fi
done

# Perform batch AST check for candidates
if [ ${#CANDIDATES[@]} -gt 0 ]; then
    # Use Node 24's experimental TS support
    RESULTS=$(node --experimental-strip-types scripts/find-jsx.ts "${CANDIDATES[@]}" 2>/dev/null)
    while IFS=: read -r file has_jsx; do
        if [ "$has_jsx" = "false" ]; then
            MISNAMED_FILES+=("$file")
        fi
    done <<< "$RESULTS"
fi

if [ ${#MISNAMED_FILES[@]} -gt 0 ]; then
    if [ "$DRY_RUN" = true ]; then
        echo "Dry run: The following files would be renamed:"
        for file in "${MISNAMED_FILES[@]}"; do
            new_file="${file%.tsx}.ts"
            echo "  git mv $file $new_file"
        done
        exit 0
    elif [ "$UPDATE" = true ]; then
        echo "Renaming misnamed .tsx files to .ts..."
        for file in "${MISNAMED_FILES[@]}"; do
            new_file="${file%.tsx}.ts"
            echo "  git mv $file $new_file"
            git mv "$file" "$new_file" || exit 1
        done
        echo "Successfully renamed all files."
        exit 0
    else
        echo "Found .tsx files that do not appear to contain JSX. Please rename them to .ts:"
        for file in "${MISNAMED_FILES[@]}"; do
            echo "  $file"
        done
        echo ""
        echo "To automatically rename these files using 'git mv', run:"
        echo "  npm run check-tsx-naming -- -u"
        echo ""
        echo "To see what would be renamed without actually doing it, run:"
        echo "  npm run check-tsx-naming -- -d"
        exit 1
    fi
fi
