// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';

import SpanDetail from './SpanDetail';
import DetailState from './SpanDetail/DetailState';
import SpanTreeOffset from './SpanTreeOffset';
import TimelineRow from './TimelineRow';

import { IOtelSpan, IAttribute, IEvent } from '../../../types/otel';
import { Link, Span } from '../../../types/trace';

import './SpanDetailRow.css';

type SpanDetailRowProps = {
  color: string;
  columnDivision: number;
  detailState: DetailState;
  onDetailToggled: (spanID: string) => void;
  linksGetter: (attributes: ReadonlyArray<IAttribute>, index: number) => Link[];
  eventItemToggle: (spanID: string, event: IEvent) => void;
  eventsToggle: (spanID: string) => void;
  resourceToggle: (spanID: string) => void;
  linksToggle: (spanID: string) => void;
  warningsToggle: (spanID: string) => void;
  span: IOtelSpan;
  legacySpan: Span; // Legacy span needed for SpanTreeOffset component
  attributesToggle: (spanID: string) => void;
  traceStartTime: number;
  focusSpan: (uiFind: string) => void;
  currentViewRangeTime: [number, number];
  traceDuration: number;
  useOtelTerms: boolean;
};

const SpanDetailRow = React.memo((props: SpanDetailRowProps) => {
  const _detailToggle = () => {
    props.onDetailToggled(props.span.spanId);
  };

  const {
    color,
    columnDivision,
    detailState,
    eventsToggle,
    resourceToggle,
    linksToggle,
    warningsToggle,
    span,
    legacySpan,
    attributesToggle,
    traceStartTime,
    focusSpan,
    currentViewRangeTime,
    traceDuration,
    linksGetter,
    eventItemToggle,
    useOtelTerms,
  } = props;
  return (
    <TimelineRow className="detail-row">
      <TimelineRow.Cell width={columnDivision}>
        <SpanTreeOffset span={legacySpan} />
        <span>
          <span
            className="detail-row-expanded-accent"
            aria-checked="true"
            onClick={_detailToggle}
            role="switch"
            style={{ borderColor: color }}
          />
        </span>
      </TimelineRow.Cell>
      <TimelineRow.Cell width={1 - columnDivision}>
        <div className="detail-info-wrapper" style={{ borderTopColor: color }}>
          <SpanDetail
            detailState={detailState}
            linksGetter={linksGetter}
            eventItemToggle={eventItemToggle}
            eventsToggle={eventsToggle}
            resourceToggle={resourceToggle}
            linksToggle={linksToggle}
            warningsToggle={warningsToggle}
            span={span}
            attributesToggle={attributesToggle}
            traceStartTime={traceStartTime}
            focusSpan={focusSpan}
            currentViewRangeTime={currentViewRangeTime}
            traceDuration={traceDuration}
            useOtelTerms={useOtelTerms}
          />
        </div>
      </TimelineRow.Cell>
    </TimelineRow>
  );
});

export default SpanDetailRow;
