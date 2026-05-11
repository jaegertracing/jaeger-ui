// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { IoAlert } from 'react-icons/io5';

import SpanTreeOffset from './SpanTreeOffset';
import TimelineRow from './TimelineRow';
import { IOtelSpan } from '../../../types/otel';
import { SpanTreeOffsetState } from './utils';
import colorGenerator from '../../../utils/color-generator';

import './PrunedSpanRow.css';

type PrunedSpanRowProps = {
  parentSpan: IOtelSpan;
  prunedChildrenCount: number;
  prunedErrorCount: number;
  nameColumnWidth: number;
  timelineBarsVisible: boolean;
  treeOffsetMap: Map<string, SpanTreeOffsetState>;
};

// Gray color for the pruned placeholder dot (not tied to any service).
const PRUNED_DOT_COLOR = '#bbb';

export default function PrunedSpanRow({
  parentSpan,
  prunedChildrenCount,
  prunedErrorCount,
  nameColumnWidth,
  timelineBarsVisible,
  treeOffsetMap,
}: PrunedSpanRowProps) {
  const spanWord = prunedChildrenCount === 1 ? 'span' : 'spans';
  const errorSuffix =
    prunedErrorCount > 0 ? `, ${prunedErrorCount} ${prunedErrorCount === 1 ? 'error' : 'errors'}` : '';
  const label = `${prunedChildrenCount} ${spanWord} pruned${errorSuffix}`;

  // The pruned placeholder renders at the same depth as a real child of parentSpan.
  // Look up parentSpan's own state from the map (O(1)) and derive the child's view:
  // ancestors = parentSpan's ancestors + parentSpan itself; isLastChild = true since
  // the placeholder is always rendered last after all visible siblings.
  const parentState = treeOffsetMap.get(parentSpan.spanID) ?? {
    ancestors: [],
    isLastChild: false,
  };

  // Derive the color from parentSpan's own service name — NOT from
  // parentState.parentColor, which is the *grandparent's* color.
  const parentSpanColor = colorGenerator.getColorByKey(parentSpan.resource.serviceName);

  const selfAncestorEntry = {
    spanID: parentSpan.spanID,
    color: parentSpanColor, // the stripe for parentSpan itself
    isTerminated: true, // placeholder is always last — bar terminates here
  };
  const treeOffsetState: SpanTreeOffsetState = {
    ancestors: [...parentState.ancestors, selfAncestorEntry],
    isLastChild: true,
  };

  return (
    <TimelineRow className="span-row PrunedSpanRow">
      <TimelineRow.Cell className="span-name-column" width={nameColumnWidth}>
        <div className="span-name-wrapper">
          <SpanTreeOffset
            spanID={`${parentSpan.spanID}--pruned`}
            hasChildren={false}
            childCount={0}
            color={PRUNED_DOT_COLOR}
            {...treeOffsetState}
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
