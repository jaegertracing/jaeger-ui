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

import * as React from 'react';
import { Button, Input } from 'antd';
import _maxBy from 'lodash/maxBy';
import _values from 'lodash/values';
import IoAndroidArrowBack from 'react-icons/lib/io/android-arrow-back';
import IoIosFilingOutline from 'react-icons/lib/io/ios-filing-outline';
import MdKeyboardArrowRight from 'react-icons/lib/md/keyboard-arrow-right';
import { Link } from 'react-router-dom';

import AltViewOptions from './AltViewOptions';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import SpanGraph from './SpanGraph';
import TracePageSearchBar from './TracePageSearchBar';
import LabeledList from '../../common/LabeledList';
import NewWindowIcon from '../../common/NewWindowIcon';
import TraceName from '../../common/TraceName';
import { getTraceName } from '../../../model/trace-viewer';
import { formatDatetime, formatDuration } from '../../../utils/date';

import type { ViewRange, ViewRangeTimeUpdate } from '../types';
import type { Trace } from '../../../types/trace';

import './TracePageHeader.css';

type TracePageHeaderEmbedProps = {
  canCollapse: boolean,
  clearSearch: () => void,
  forwardedRef: { current: Input | null },
  hideMap: boolean,
  hideSummary: boolean,
  linkToStandalone: string,
  nextResult: () => void,
  onArchiveClicked: () => void,
  onSlimViewClicked: () => void,
  onTraceGraphViewClicked: () => void,
  prevResult: () => void,
  resultCount: number,
  showArchiveButton: boolean,
  showShortcutsHelp: boolean,
  showStandaloneLink: boolean,
  showViewOptions: boolean,
  slimView: boolean,
  textFilter: string,
  toSearch: string | null,
  trace: Trace,
  traceGraphView: boolean,
  updateNextViewRangeTime: ViewRangeTimeUpdate => void,
  updateTextFilter: string => void,
  updateViewRangeTime: (number, number) => void,
  viewRange: ViewRange,
};

export const HEADER_ITEMS = [
  {
    key: 'timestamp',
    label: 'Trace Start',
    renderer: (trace: Trace) => formatDatetime(trace.startTime),
  },
  {
    key: 'duration',
    label: 'Duration',
    renderer: (trace: Trace) => formatDuration(trace.duration),
  },
  {
    key: 'service-count',
    label: 'Services',
    renderer: (trace: Trace) => new Set(_values(trace.processes).map(p => p.serviceName)).size,
  },
  {
    key: 'depth',
    label: 'Depth',
    renderer: (trace: Trace) => _maxBy(trace.spans, 'depth').depth + 1,
  },
  {
    key: 'span-count',
    label: 'Total Spans',
    renderer: (trace: Trace) => trace.spans.length,
  },
];

export function TracePageHeaderFn(props: TracePageHeaderEmbedProps) {
  const {
    canCollapse,
    clearSearch,
    forwardedRef,
    hideMap,
    hideSummary,
    linkToStandalone,
    nextResult,
    onArchiveClicked,
    onSlimViewClicked,
    onTraceGraphViewClicked,
    prevResult,
    resultCount,
    showArchiveButton,
    showShortcutsHelp,
    showStandaloneLink,
    showViewOptions,
    slimView,
    textFilter,
    toSearch,
    trace,
    traceGraphView,
    updateNextViewRangeTime,
    updateTextFilter,
    updateViewRangeTime,
    viewRange,
  } = props;

  if (!trace) {
    return null;
  }

  const summaryItems =
    !hideSummary &&
    !slimView &&
    HEADER_ITEMS.map(item => {
      const { renderer, ...rest } = item;
      return { ...rest, value: renderer(trace) };
    });

  const title = (
    <h1 className={`TracePageHeader--title ${canCollapse ? 'is-collapsible' : ''}`}>
      <TraceName traceName={getTraceName(trace.spans)} />{' '}
      <small className="u-tx-muted">{trace.traceID.slice(0, 7)}</small>
    </h1>
  );

  return (
    <header className="TracePageHeader">
      <div className="TracePageHeader--titleRow">
        {toSearch && (
          <Link className="TracePageHeader--back" to={toSearch}>
            <IoAndroidArrowBack />
          </Link>
        )}
        {canCollapse ? (
          <a
            className="TracePageHeader--titleLink"
            onClick={onSlimViewClicked}
            role="switch"
            aria-checked={!slimView}
          >
            <MdKeyboardArrowRight
              className={`TracePageHeader--detailToggle ${!slimView ? 'is-expanded' : ''}`}
            />
            {title}
          </a>
        ) : (
          title
        )}
        {showShortcutsHelp && <KeyboardShortcutsHelp className="ub-mr2" />}
        <TracePageSearchBar
          updateTextFilter={updateTextFilter}
          textFilter={textFilter}
          prevResult={prevResult}
          nextResult={nextResult}
          clearSearch={clearSearch}
          resultCount={resultCount}
          ref={forwardedRef}
        />

        {showViewOptions && (
          <AltViewOptions
            onTraceGraphViewClicked={onTraceGraphViewClicked}
            traceGraphView={traceGraphView}
            traceID={trace.traceID}
          />
        )}
        {showArchiveButton && (
          <Button className="ub-mr2 ub-flex ub-items-center" onClick={onArchiveClicked}>
            <IoIosFilingOutline className="TracePageHeader--archiveIcon" />
            Archive Trace
          </Button>
        )}
        {showStandaloneLink && (
          <Link
            className="u-tx-inherit ub-nowrap ub-mx2"
            to={linkToStandalone}
            target="_blank"
            rel="noopener noreferrer"
          >
            <NewWindowIcon />
          </Link>
        )}
      </div>
      {summaryItems && <LabeledList className="TracePageHeader--overviewItems" items={summaryItems} />}
      {!hideMap &&
        !slimView && (
          <SpanGraph
            trace={trace}
            viewRange={viewRange}
            updateNextViewRangeTime={updateNextViewRangeTime}
            updateViewRangeTime={updateViewRangeTime}
          />
        )}
    </header>
  );
}

// ghetto fabulous cast because the 16.3 API is not in flow yet
// https://github.com/facebook/flow/issues/6103
export default (React: any).forwardRef((props, ref) => <TracePageHeaderFn {...props} forwardedRef={ref} />);
