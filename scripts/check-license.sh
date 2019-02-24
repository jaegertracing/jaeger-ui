#!/bin/sh

licRes=$(
for file in $(find scripts packages/*/src packages/plexus/typings packages/plexus/demo -type f -iregex '.*\.[cjt]ss*x*$'); do
	head -n3 "${file}" | grep -Eq "(Copyright|generated|GENERATED)" || echo "  ${file}"
done;)
if [ -n "${licRes}" ]; then
	echo "license header check failed:\n${licRes}"
	exit 255
fi
