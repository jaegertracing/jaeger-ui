// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useMemo } from 'react';
import { IoAlert } from 'react-icons/io5';

import SpanTreeOffset from './SpanTreeOffset';
import { computeAncestorEntries } from './span-tree-utils';
import { AncestorEntry } from './SpanTreeOffset';
import TimelineRow from './TimelineRow';
import { IOtelSpan } from '../../../types/otel';
import colorGenerator from '../../../utils/color-generator';

import './PrunedSpanRow.css';

type PrunedSpanRowProps = {
  parentSpan: IOtelSpan;
  prunedChildrenCount: number;
  prunedErrorCount: number;
  nameColumnWidth: number;
  timelineBarsVisible: boolean;
};

// Gray color for the pruned placeholder dot (not tied to any service).
const PRUNED_DOT_COLOR = '#bbb';

export default function PrunedSpanRow({
  parentSpan,
  prunedChildrenCount,
  prunedErrorCount,
  nameColumnWidth,
  timelineBarsVisible,
}: PrunedSpanRowProps) {
  const spanWord = prunedChildrenCount === 1 ? 'span' : 'spans';
  const errorSuffix =
    prunedErrorCount > 0 ? `, ${prunedErrorCount} ${prunedErrorCount === 1 ? 'error' : 'errors'}` : '';
  const label = `${prunedChildrenCount} ${spanWord} pruned${errorSuffix}`;

  // Compute ancestor entries for the pruned row. The pruned placeholder sits at
  // parentSpan.depth + 1, so we need all of parentSpan's ancestors plus parentSpan
  // itself as the immediate parent. The pruned placeholder is always the "last child"
  // so that the vertical tree line terminates correctly.
  const ancestorEntries = useMemo((): AncestorEntry[] => {
    // Get parent's own ancestor entries (these represent depth 0 → parentSpan's parent)
    const parentEntries = computeAncestorEntries(parentSpan);
    // Append parentSpan itself as the immediate parent of the pruned placeholder
    const parentColor = colorGenerator.getColorByKey(parentSpan.resource.serviceName);
    return [...parentEntries, { ancestorId: parentSpan.spanID, color: parentColor }];
  }, [parentSpan]);

  const spanID = `${parentSpan.spanID}--pruned`;

  return (
    <TimelineRow className="span-row PrunedSpanRow">
      <TimelineRow.Cell className="span-name-column" width={nameColumnWidth}>
        <div className="span-name-wrapper">
          <SpanTreeOffset
            spanID={spanID}
            hasChildren={false}
            childCount={0}
            ancestorEntries={ancestorEntries}
            isLastChild={true}
            color={PRUNED_DOT_COLOR}
          />
          <span className="span-name PrunedSpanRow--name">
            <span className="span-svc-name">
              {prunedErrorCount > 0 && (
                <IoAlert className="SpanBarRow--errorIcon SpanBarRow--errorIcon--hollow" />
              )}
            </span>
            <small className="endpoint-name">{label}</small>
          </span>
        </div>
      </TimelineRow.Cell>
      {timelineBarsVisible && (
        <TimelineRow.Cell className="span-view" width={1 - nameColumnWidth}>
          <div />
        </TimelineRow.Cell>
      )}
    </TimelineRow>
  );
}
