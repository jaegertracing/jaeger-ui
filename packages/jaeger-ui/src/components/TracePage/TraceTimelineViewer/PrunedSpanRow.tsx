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

  // Create a fake span so SpanTreeOffset renders proper tree lines and a dot
  // at depth = parentSpan.depth + 1. Use a synthetic parent that appends the
  // fake span as the last child so SpanTreeOffset correctly terminates the
  // vertical tree line (it checks parentSpan.childSpans[last].spanID === spanID).
  const fakeSpan = useMemo(() => {
    const spanID = `${parentSpan.spanID}--pruned`;
    const fake = {
      spanID,
      depth: parentSpan.depth + 1,
      hasChildren: false,
      childSpans: [],
      parentSpan: null as unknown as IOtelSpan,
      resource: parentSpan.resource,
    } as unknown as IOtelSpan;
    // Prototype-based copy: syntheticParent delegates all properties (including
    // parentSpan for ancestor walks) to the real parentSpan, with only childSpans
    // overridden. This lets SpanTreeOffset see the placeholder as the last child.
    const syntheticParent = Object.create(parentSpan) as IOtelSpan;
    (syntheticParent as unknown as { childSpans: IOtelSpan[] }).childSpans = [...parentSpan.childSpans, fake];
    (fake as { parentSpan: IOtelSpan }).parentSpan = syntheticParent;
    return fake;
  }, [parentSpan]);

  return (
    <TimelineRow className="span-row PrunedSpanRow">
      <TimelineRow.Cell className="span-name-column" width={nameColumnWidth}>
        <div className="span-name-wrapper">
          <SpanTreeOffset span={fakeSpan} color={PRUNED_DOT_COLOR} />
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
