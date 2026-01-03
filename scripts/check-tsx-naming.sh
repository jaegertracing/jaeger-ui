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

# Find all .tsx files
MISNAMED_FILES=$(find . -name "*.tsx" -not -path "*/node_modules/*" | while read -r file; do
    # Check if the file contains JSX-like syntax
    # We look for: < followed by a letter, or </> (fragment), or </ followed by a letter
    if ! grep -q -E "<[a-zA-Z]|</[a-zA-Z]|<>" "$file"; then
        echo "$file"
    fi
done)

if [ -n "$MISNAMED_FILES" ]; then
    if [ "$DRY_RUN" = true ]; then
        echo "Dry run: The following files would be renamed:"
        for file in $MISNAMED_FILES; do
            new_file="${file%.tsx}.ts"
            echo "  git mv $file $new_file"
        done
        exit 0
    elif [ "$UPDATE" = true ]; then
        echo "Renaming misnamed .tsx files to .ts..."
        for file in $MISNAMED_FILES; do
            new_file="${file%.tsx}.ts"
            echo "  git mv $file $new_file"
            git mv "$file" "$new_file" || exit 1
        done
        echo "Successfully renamed all files."
        exit 0
    else
        echo "Found .tsx files that do not appear to contain JSX. Please rename them to .ts:"
        for file in $MISNAMED_FILES; do
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
