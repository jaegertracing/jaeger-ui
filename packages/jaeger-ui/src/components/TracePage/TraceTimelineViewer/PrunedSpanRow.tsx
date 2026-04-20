// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useMemo } from 'react';
import { IoAlert } from 'react-icons/io5';

import SpanTreeOffset from './SpanTreeOffset';
import TimelineRow from './TimelineRow';
import { IOtelSpan } from '../../../types/otel';

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

  // Create a minimal fake span so SpanTreeOffset renders proper tree lines and a dot
  // at depth = parentSpan.depth + 1, as if this were a leaf child of parentSpan.
  const fakeSpan = useMemo(
    () =>
      ({
        spanID: `${parentSpan.spanID}--pruned`,
        depth: parentSpan.depth + 1,
        hasChildren: false,
        childSpans: [],
        parentSpan,
        resource: parentSpan.resource,
      }) as unknown as IOtelSpan,
    [parentSpan]
  );

  return (
    <TimelineRow className="span-row PrunedSpanRow">
      <TimelineRow.Cell className="span-name-column" width={nameColumnWidth}>
        <div className="span-name-wrapper">
          <SpanTreeOffset span={fakeSpan} color={PRUNED_DOT_COLOR} />
          <span className="span-name PrunedSpanRow--name">
            <small className="endpoint-name">
              {prunedErrorCount > 0 && (
                <IoAlert className="SpanBarRow--errorIcon SpanBarRow--errorIcon--hollow" />
              )}
              {label}
            </small>
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
