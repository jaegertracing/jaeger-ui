// @flow

// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from 'react';
import { Popover } from 'antd';
import { onlyUpdateForKeys, compose, withState, withProps } from 'recompose';
import type { Log, Trace } from '../../../types/trace';
import AccordianLogs from './SpanDetail/AccordianLogs';

import './SpanBar.css';

type SpanBarProps = {
  color: string,
  hintSide: string,
  label: string,
  onClick: (SyntheticMouseEvent<any>) => void,
  viewEnd: number,
  viewStart: number,
  rpc: {
    viewStart: number,
    viewEnd: number,
    color: string,
  },
  setLongLabel: () => void,
  setShortLabel: () => void,
  trace: Trace,
  logs: { view: { start: number, end: number }, logs: Log[] }[],
};

function toPercent(value: number) {
  return `${value * 100}%`;
}

function SpanBar(props: SpanBarProps) {
  const {
    viewEnd,
    viewStart,
    color,
    label,
    hintSide,
    onClick,
    setLongLabel,
    setShortLabel,
    rpc,
    trace,
    logs,
  } = props;

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
        {logs.map(l => (
          <Popover
            key={l.view.start}
            arrowPointAtCenter
            overlayClassName="SpanBar--logHint"
            placement="topLeft"
            content={
              <AccordianLogs
                logs={l.logs}
                linksGetter={null}
                isOpen
                openedItems={new Set([])}
                onToggle={() => {}}
                onItemToggle={() => {}}
                timestamp={trace.startTime}
              />
            }
          >
            <div className="SpanBar--logMarker" style={{ left: toPercent(l.view.start) }} />
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
    </div>
  );
}

export default compose(
  withState('label', 'setLabel', props => props.shortLabel),
  withProps(({ setLabel, shortLabel, longLabel }) => ({
    setLongLabel: () => setLabel(longLabel),
    setShortLabel: () => setLabel(shortLabel),
  })),
  onlyUpdateForKeys(['label', 'rpc', 'viewStart', 'viewEnd'])
)(SpanBar);
