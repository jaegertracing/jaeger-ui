// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';

import TimelineRow from './TimelineRow';
import { IOtelSpan } from '../../../types/otel';

import './PrunedSpanRow.css';

type PrunedSpanRowProps = {
  parentSpan: IOtelSpan;
  prunedChildrenCount: number;
  nameColumnWidth: number;
  timelineBarsVisible: boolean;
};

export default function PrunedSpanRow({
  parentSpan,
  prunedChildrenCount,
  nameColumnWidth,
  timelineBarsVisible,
}: PrunedSpanRowProps) {
  // Indent to depth + 1 of the parent span.
  const indentPx = (parentSpan.depth + 1) * 20 + 16;
  const label = prunedChildrenCount === 1 ? '1 span pruned' : `${prunedChildrenCount} spans pruned`;

  return (
    <TimelineRow className="span-row PrunedSpanRow">
      <TimelineRow.Cell className="span-name-column" width={nameColumnWidth}>
        <div className="span-name-wrapper PrunedSpanRow--wrapper" style={{ paddingLeft: indentPx }}>
          <span className="PrunedSpanRow--dot" />
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
