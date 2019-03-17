#!/usr/bin/env bash

FLOW_LOC_NUM=$(ag -l @flow src | tr '\n' ' ' | xargs wc -l | tail -1 | awk '{print $1}')
TSC_LOC_NUM=$(find src -name '*tsx' -print | tr '\n' ' ' | xargs wc -l | tail -1 | awk '{print $1}')
PCT_DONE_NUM=$(awk "BEGIN { print ${TSC_LOC_NUM} / (${FLOW_LOC_NUM} + ${TSC_LOC_NUM}) * 100 }")

FLOW_LOC=$(printf "%'d" $FLOW_LOC_NUM)
TSC_LOC=$(printf "%'d" $TSC_LOC_NUM)
PCT_DONE=$(printf '%.2f %%' $PCT_DONE_NUM)

echo "LOC"
echo ""
echo "TypeScript    $TSC_LOC"
echo ""
echo "Flow          $FLOW_LOC"
echo ""
echo "Complete      $PCT_DONE"
