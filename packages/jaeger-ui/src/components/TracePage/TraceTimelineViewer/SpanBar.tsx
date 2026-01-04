// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Popover, Tooltip } from 'antd';
import _groupBy from 'lodash/groupBy';

import AccordionEvents from './SpanDetail/AccordionEvents';

import { ViewedBoundsFunctionType } from './utils';
import { TNil } from '../../../types';
import { CriticalPathSection } from '../../../types/critical_path';
import { IEvent, IOtelSpan } from '../../../types/otel';

import './SpanBar.css';

type TSpanBarProps = {
  color: string;
  hintSide: string;
  // onClick: (evt: React.MouseEvent<any>) => void;
  onClick?: (evt: React.MouseEvent<any>) => void;
  criticalPath: CriticalPathSection[];
  viewEnd: number;
  viewStart: number;
  getViewedBounds: ViewedBoundsFunctionType;
  rpc:
    | {
        viewStart: number;
        viewEnd: number;
        color: string;
      }
    | TNil;
  traceStartTime: number;
  span: IOtelSpan;
  longLabel: string;
  shortLabel: string;
  traceDuration: number;
  useOtelTerms: boolean;
};

function toPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function toPercentInDecimal(value: number) {
  return `${value * 100}%`;
}

function SpanBarCriticalPath(props: { criticalPathViewStart: number; criticalPathViewEnd: number }) {
  const [shouldLoadTooltip, setShouldLoadTooltip] = useState(false);

  const criticalPath = (
    <div
      data-testid="SpanBar--criticalPath"
      className="SpanBar--criticalPath"
      onMouseEnter={() => setShouldLoadTooltip(true)}
      style={{
        background: 'black',
        left: toPercentInDecimal(props.criticalPathViewStart),
        width: toPercentInDecimal(props.criticalPathViewEnd - props.criticalPathViewStart),
      }}
    />
  );

  // Load tooltip only when hovering over critical path segment
  // to reduce initial load time of trace page by ~300ms for 500 spans
  if (shouldLoadTooltip) {
    return (
      <Tooltip
        placement="top"
        // defaultOpen is needed to show the tooltip when shouldLoadTooltip changes to true
        defaultOpen
        title={
          <div>
            A segment on the <em>critical path</em> of the overall trace/request/workflow.
          </div>
        }
      >
        {criticalPath}
      </Tooltip>
    );
  }

  return criticalPath;
}

function SpanBar(props: TSpanBarProps) {
  const {
    criticalPath,
    viewEnd,
    viewStart,
    getViewedBounds,
    color,
    hintSide,
    onClick,
    rpc,
    traceStartTime,
    span,
    shortLabel,
    longLabel,
    traceDuration,
    useOtelTerms,
  } = props;

  // group events based on timestamps
  const eventGroups = _groupBy(span.events, (event: IEvent) => {
    const posPercent = getViewedBounds(event.timestamp, event.timestamp).start;
    // round to the nearest 0.2%
    return toPercent(Math.round(posPercent * 500) / 500);
  });

  const [label, setLabel] = useState(shortLabel);

  const setShortLabel = () => {
    setLabel(shortLabel);
  };

  const setLongLabel = () => {
    setLabel(longLabel);
  };

  return (
    <div
      className="SpanBar--wrapper"
      onClick={onClick}
      onMouseOut={setShortLabel}
      onMouseOver={setLongLabel}
      aria-hidden
    >
      <div
        aria-label={label}
        className="SpanBar--bar"
        style={{
          background: color,
          left: toPercent(viewStart),
          width: toPercent(viewEnd - viewStart),
        }}
      >
        <div className={`SpanBar--label is-${hintSide}`}>{label}</div>
      </div>
      <div>
        {Object.keys(eventGroups).map(positionKey => (
          <Popover
            key={positionKey}
            arrow={{ pointAtCenter: true }}
            classNames={{ root: 'SpanBar--logHint' }}
            placement="topLeft"
            content={
              <AccordionEvents
                interactive={false}
                isOpen
                events={eventGroups[positionKey]}
                timestamp={traceStartTime}
                currentViewRangeTime={[0, 1]}
                traceDuration={traceDuration}
                useOtelTerms={useOtelTerms}
              />
            }
          >
            <div
              data-testid="SpanBar--logMarker"
              className="SpanBar--logMarker"
              style={{ left: positionKey, zIndex: 3 }}
            />
          </Popover>
        ))}
      </div>
      {rpc && (
        <div
          className="SpanBar--rpc"
          style={{
            background: rpc.color,
            left: toPercent(rpc.viewStart),
            width: toPercent(rpc.viewEnd - rpc.viewStart),
          }}
        />
      )}
      {criticalPath &&
        criticalPath.map((each, index) => {
          const critcalPathViewBounds = getViewedBounds(each.sectionStart, each.sectionEnd);
          const criticalPathViewStart = critcalPathViewBounds.start;
          const criticalPathViewEnd = critcalPathViewBounds.end;
          const key = `${each.spanID}-${index}`;

          return (
            <SpanBarCriticalPath
              criticalPathViewStart={criticalPathViewStart}
              criticalPathViewEnd={criticalPathViewEnd}
              key={key}
            />
          );
        })}
    </div>
  );
}

export default SpanBar;
