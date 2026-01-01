// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';

import SpanDetail from './SpanDetail';
import DetailState from './SpanDetail/DetailState';
import SpanTreeOffset from './SpanTreeOffset';
import TimelineRow from './TimelineRow';
import OtelSpanFacade from '../../../model/OtelSpanFacade';

import { Span, Link, KeyValuePair, Log } from '../../../types/trace';
import { IAttribute, IEvent, IOtelSpan } from '../../../types/otel';

import './SpanDetailRow.css';

type SpanDetailRowProps = {
  color: string;
  columnDivision: number;
  detailState: DetailState;
  onDetailToggled: (spanID: string) => void;
  linksGetter: (span: Span, links: ReadonlyArray<KeyValuePair>, index: number) => Link[];
  logItemToggle: (spanID: string, log: Log) => void;
  logsToggle: (spanID: string) => void;
  processToggle: (spanID: string) => void;
  referencesToggle: (spanID: string) => void;
  warningsToggle: (spanID: string) => void;
  span: Span;
  tagsToggle: (spanID: string) => void;
  traceStartTime: number;
  focusSpan: (uiFind: string) => void;
  currentViewRangeTime: [number, number];
  traceDuration: number;
};

const SpanDetailRow = React.memo((props: SpanDetailRowProps) => {
  const _detailToggle = () => {
    props.onDetailToggled(props.span.spanID);
  };

  // Convert legacy Span to IOtelSpan for SpanDetail
  const otelSpan: IOtelSpan = React.useMemo(() => new OtelSpanFacade(props.span), [props.span]);

  // Adapter for linksGetter - accepts OTEL types, calls legacy function
  const _linksGetter = (items: ReadonlyArray<IAttribute>, itemIndex: number) => {
    const { linksGetter, span } = props;
    const legacyItems: KeyValuePair[] = items.map(attr => ({
      key: attr.key,
      value: attr.value as any,
    }));
    return linksGetter(span, legacyItems, itemIndex);
  };

  // Adapter for logItemToggle - accepts OTEL types, calls legacy function
  const _logItemToggle = (spanID: string, event: IEvent) => {
    const { logItemToggle } = props;
    const legacyLog: Log = {
      timestamp: event.timeUnixMicro,
      fields: event.attributes.map(attr => ({
        key: attr.key,
        value: attr.value as any,
      })),
    };
    logItemToggle(spanID, legacyLog);
  };

  const {
    color,
    columnDivision,
    detailState,
    logsToggle,
    processToggle,
    referencesToggle,
    warningsToggle,
    span,
    tagsToggle,
    traceStartTime,
    focusSpan,
    currentViewRangeTime,
    traceDuration,
  } = props;
  return (
    <TimelineRow className="detail-row">
      <TimelineRow.Cell width={columnDivision}>
        <SpanTreeOffset span={span} showChildrenIcon={false} />
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
            linksGetter={_linksGetter}
            logItemToggle={_logItemToggle}
            logsToggle={logsToggle}
            processToggle={processToggle}
            referencesToggle={referencesToggle}
            warningsToggle={warningsToggle}
            span={otelSpan}
            tagsToggle={tagsToggle}
            traceStartTime={traceStartTime}
            focusSpan={focusSpan}
            currentViewRangeTime={currentViewRangeTime}
            traceDuration={traceDuration}
          />
        </div>
      </TimelineRow.Cell>
    </TimelineRow>
  );
});

export default SpanDetailRow;
