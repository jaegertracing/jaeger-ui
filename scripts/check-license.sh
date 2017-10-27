#!/bin/sh

licRes=$(
for file in $(find src -type f -iregex '.*\.[cj]ss*$' ! -path '*/thrift_gen/*'); do
	head -n3 "${file}" | grep -Eq "(Copyright|generated|GENERATED)" || echo "  ${file}"
done;)
if [ -n "${licRes}" ]; then
	echo "license header check failed:\n${licRes}"
	exit 255
fi
