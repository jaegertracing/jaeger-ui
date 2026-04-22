// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useMemo } from 'react';
import { IoAlert } from 'react-icons/io5';

import SpanTreeOffset from './SpanTreeOffset';
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

  // computes two things by walking span.parentSpan directly — no fake span, no prototype hacks.
  const treeOffsetState = useMemo(() => {
    const ancestorsArr: IOtelSpan[] = [];
    let current: IOtelSpan | undefined = parentSpan;
    while (current) {
      ancestorsArr.unshift(current);
      current = current.parentSpan;
    }

    const parentColor = colorGenerator.getColorByKey(parentSpan.resource.serviceName);

    const ancestors = ancestorsArr.map((ancestor, index) => {
      const isLastAncestor = index === ancestorsArr.length - 1;
      let shouldTerminate = false;
      if (isLastAncestor) {
        shouldTerminate = true;
      } else {
        const descendantInChain = ancestorsArr[index + 1];
        if (descendantInChain && descendantInChain.parentSpan) {
          const parentChildren = descendantInChain.parentSpan.childSpans;
          shouldTerminate = parentChildren[parentChildren.length - 1]?.spanID === descendantInChain.spanID;
        }
      }
      return {
        spanID: ancestor.spanID,
        color: colorGenerator.getColorByKey(ancestor.resource.serviceName),
        isTerminated: shouldTerminate,
      };
    });

    return { ancestors, isLastChild: true, parentColor };
  }, [parentSpan]);

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
