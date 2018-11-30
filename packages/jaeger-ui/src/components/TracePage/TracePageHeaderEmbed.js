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
import { Input } from 'antd';
import IoChevronLeft from 'react-icons/lib/io/chevron-left';
import { Link } from 'react-router-dom';

import TracePageSearchBar from './TracePageSearchBar';
import LabeledList from '../common/LabeledList';
import NewWindowIcon from '../common/NewWindowIcon';
import { getUrl as getSearchUrl } from '../SearchTracePage/url';
import { FALLBACK_TRACE_NAME } from '../../constants';
import { formatDatetime, formatDuration } from '../../utils/date';

import './TracePageHeader.css';

type TracePageHeaderEmbedProps = {
  traceID: string,
  name: String,
  updateTextFilter: string => void,
  textFilter: string,
  prevResult: () => void,
  nextResult: () => void,
  clearSearch: () => void,
  forwardedRef: { current: Input | null },
  resultCount: number,
  fromSearch: boolean,
  linkToStandalone: string,
  showDetails: boolean,
  // these props are used by the `HEADER_ITEMS`
  // eslint-disable-next-line react/no-unused-prop-types
  timestamp: number,
  // eslint-disable-next-line react/no-unused-prop-types
  duration: number,
  // eslint-disable-next-line react/no-unused-prop-types
  numServices: number,
  // eslint-disable-next-line react/no-unused-prop-types
  maxDepth: number,
  // eslint-disable-next-line react/no-unused-prop-types
  numSpans: number,
};

export const HEADER_ITEMS = [
  {
    key: 'timestamp',
    title: 'Trace Start',
    propName: null,
    renderer: (props: TracePageHeaderEmbedProps) => formatDatetime(props.timestamp),
  },
  {
    key: 'duration',
    title: 'Duration',
    propName: null,
    renderer: (props: TracePageHeaderEmbedProps) => formatDuration(props.duration),
  },
  {
    key: 'service-count',
    title: 'Services',
    propName: 'numServices',
    renderer: null,
  },
  {
    key: 'depth',
    title: 'Depth',
    propName: 'maxDepth',
    renderer: null,
  },
  {
    key: 'span-count',
    title: 'Total Spans',
    propName: 'numSpans',
    renderer: null,
  },
];

export function TracePageHeaderEmbedFn(props: TracePageHeaderEmbedProps) {
  const {
    clearSearch,
    duration,
    forwardedRef,
    fromSearch,
    linkToStandalone,
    maxDepth,
    name,
    nextResult,
    numServices,
    numSpans,
    prevResult,
    resultCount,
    showDetails,
    textFilter,
    timestamp,
    traceID,
    updateTextFilter,
  } = props;

  if (!traceID) {
    return null;
  }

  const overviewItems = [
    {
      key: 'start',
      label: 'Trace Start:',
      value: formatDatetime(timestamp),
    },
    {
      key: 'duration',
      label: 'Duration:',
      value: formatDuration(duration),
    },
    {
      key: 'svc-count',
      label: 'Services:',
      value: numServices,
    },
    {
      key: 'depth',
      label: 'Depth:',
      value: maxDepth,
    },
    {
      key: 'span-count',
      label: 'Total Spans:',
      value: numSpans,
    },
  ];

  return (
    <header>
      <div className="TracePageHeader--titleRowEmbed">
        {fromSearch && (
          <Link className="u-tx-inherit ub-nowrap ub-mx3" to={getSearchUrl()}>
            <IoChevronLeft className="ub-mr2" />
            Go back
          </Link>
        )}
        <h1 className="TracePageHeader--titleEmbed ub-flex-auto ub-mr2 ub-items-center">
          {name || FALLBACK_TRACE_NAME}
        </h1>
        <TracePageSearchBar
          updateTextFilter={updateTextFilter}
          textFilter={textFilter}
          prevResult={prevResult}
          nextResult={nextResult}
          clearSearch={clearSearch}
          resultCount={resultCount}
          ref={forwardedRef}
        />
        <Link
          className="u-tx-inherit ub-nowrap ub-mr2 ub-ml2"
          to={linkToStandalone}
          target="_blank"
          rel="noopener noreferrer"
        >
          <NewWindowIcon />
        </Link>
      </div>
      {showDetails && <LabeledList className="TracePageHeader--overviewItems" items={overviewItems} />}
    </header>
  );
}

// ghetto fabulous cast because the 16.3 API is not in flow yet
// https://github.com/facebook/flow/issues/6103
export default (React: any).forwardRef((props, ref) => (
  <TracePageHeaderEmbedFn {...props} forwardedRef={ref} />
));
