// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { IoAlert } from 'react-icons/io5';

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

export default function PrunedSpanRow({
  parentSpan,
  prunedChildrenCount,
  prunedErrorCount,
  nameColumnWidth,
  timelineBarsVisible,
}: PrunedSpanRowProps) {
  // Indent to depth + 1 of the parent span.
  const indentPx = (parentSpan.depth + 1) * 20 + 16;
  const spanWord = prunedChildrenCount === 1 ? 'span' : 'spans';
  const errorSuffix =
    prunedErrorCount > 0 ? `, ${prunedErrorCount} ${prunedErrorCount === 1 ? 'error' : 'errors'}` : '';
  const label = `${prunedChildrenCount} ${spanWord} pruned${errorSuffix}`;

  return (
    <TimelineRow className="span-row PrunedSpanRow">
      <TimelineRow.Cell className="span-name-column" width={nameColumnWidth}>
        <div className="span-name-wrapper PrunedSpanRow--wrapper" style={{ paddingLeft: indentPx }}>
          <span className="PrunedSpanRow--dot" />
          {prunedErrorCount > 0 && (
            <IoAlert className="SpanBarRow--errorIcon SpanBarRow--errorIcon--hollow" />
          )}
          <span className="PrunedSpanRow--label">{label}</span>
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
