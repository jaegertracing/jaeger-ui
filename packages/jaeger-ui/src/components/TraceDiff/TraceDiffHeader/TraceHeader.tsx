// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { IoChevronDown } from 'react-icons/io5';

import TraceTimelineLink from './TraceTimelineLink';
import RelativeDate from '../../common/RelativeDate';
import TraceName from '../../common/TraceName';
import { fetchedState } from '../../../constants';
import { formatDuration } from '../../../utils/date';

import { FetchedState, TNil } from '../../../types';
import { ApiError } from '../../../types/api-error';
import TraceId from '../../common/TraceId';

import { ValidateError } from '../../../types/validate-error';
import './TraceHeader.css';

// exported for tests
export function EmptyAttrs() {
  return (
    <ul className="TraceDiffHeader--traceAttributes" data-testid="TraceDiffHeader--emptyTraceAttributes">
      <li className="TraceDiffHeader--traceAttr" data-testid="TraceDiffHeader--traceAttr--empty">
        &nbsp;
      </li>
    </ul>
  );
}

// exported for tests
export function Attrs({
  startTime,
  duration,
  totalSpans,
}: {
  startTime: number | TNil;
  duration: number | TNil;
  totalSpans: number | TNil;
}) {
  return (
    <ul className="TraceDiffHeader--traceAttributes" data-testid="TraceDiffHeader--traceAttributes">
      <li className="TraceDiffHeader--traceAttr" data-testid="TraceDiffHeader--traceAttr">
        <strong data-testid="TraceDiffHeader--traceAttr--date">
          <RelativeDate value={(startTime || 0) / 1000} includeTime fullMonthName />
        </strong>
      </li>
      <li className="TraceDiffHeader--traceAttr" data-testid="TraceDiffHeader--traceAttr">
        <span className="u-tx-muted">Duration: </span>
        <strong data-testid="TraceDiffHeader--traceAttr--duration">{formatDuration(duration || 0)}</strong>
      </li>
      <li className="TraceDiffHeader--traceAttr" data-testid="TraceDiffHeader--traceAttr">
        <span className="u-tx-muted">Spans: </span>{' '}
        <strong data-testid="TraceDiffHeader--traceAttr--spans">{totalSpans || 0}</strong>
      </li>
    </ul>
  );
}

export default function TraceHeader({
  duration,
  error,
  startTime,
  state,
  traceID,
  totalSpans,
  traceName,
  validationError,
}: {
  duration: number | TNil;
  error?: ApiError;
  startTime: number | TNil;
  state: FetchedState | TNil;
  traceID: string | TNil;
  traceName: string | TNil;
  totalSpans: number | TNil;
  validationError: ValidateError | TNil;
}) {
  const AttrsComponent = state === fetchedState.DONE ? Attrs : EmptyAttrs;
  const displayError = validationError ? `${validationError.title}: ${validationError.content}` : error;

  return (
    <div className="TraceDiffHeader--traceHeader" data-testid="TraceDiffHeader--traceHeader">
      <h1 className="TraceDiffHeader--traceTitle">
        <span>
          {traceID ? (
            <React.Fragment>
              <TraceName key="name" traceName={traceName} error={displayError} state={state} />{' '}
              <TraceId key="id" traceId={traceID} className="ub-pr2" />
              <TraceTimelineLink traceID={traceID} />
            </React.Fragment>
          ) : (
            <span className="u-tx-muted">Select a Trace...</span>
          )}
        </span>
        <IoChevronDown className="TraceDiffHeader--traceTitleChevron" />
      </h1>
      <AttrsComponent startTime={startTime} duration={duration} totalSpans={totalSpans} />
    </div>
  );
}
