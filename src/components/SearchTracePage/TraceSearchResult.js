// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import React, { PropTypes } from 'react';
import { sortBy } from 'lodash';
import moment from 'moment';

import { formatDuration } from '../../utils/date';
import TraceServiceTag from './TraceServiceTag';

import './TraceSearchResult.css';

const getBackgroundStyle = durationPercent =>
  `linear-gradient(
  90deg, rgba(17, 147, 154, .3) ${durationPercent}%, whitesmoke ${durationPercent - 100}%)`;

export default function TraceSearchResult({ trace, durationPercent = 100 }) {
  const {
    duration,
    services,
    timestamp,
    numberOfErredSpans,
    numberOfSpans,
    traceName,
  } = trace;
  return (
    <div
      className="trace-search-result"
      style={{ border: '2px solid whitesmoke' }}
    >
      <div
        className="p1 clearfix"
        style={{
          background: getBackgroundStyle(durationPercent),
        }}
      >
        <span className="trace-search-result--traceName left">
          {traceName}
        </span>
        <span className="trace-search-result--duration right">
          {formatDuration(duration * 1000)}
        </span>
      </div>
      <div className="p1">
        <div className="clearfix">
          <div className="col col-2">
            <span className="trace-search-result--spans">
              {numberOfSpans} span{numberOfSpans > 1 && 's'}
            </span>
            {numberOfErredSpans &&
              <span className="trace-search-result--erred-spans">
                {numberOfErredSpans} error{numberOfErredSpans > 1 && 's'}
              </span>}
          </div>
          <div className="col col-6">
            {sortBy(services, s => s.name).map(service => (
              <div key={service.name} className="inline-block mr1 mb1">
                <TraceServiceTag key={service.name} service={service} />
              </div>
            ))}
          </div>
          <div className="col col-4">
            <span className="trace-search-result--timestamp right">
              {moment(timestamp).format('hh:mm:ss a')}
              {' '}
              (
              {moment(timestamp).fromNow()}
              )
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

TraceSearchResult.propTypes = {
  trace: PropTypes.shape({
    duration: PropTypes.number,
    services: PropTypes.array,
    timestamp: PropTypes.number,
    numberOfSpans: PropTypes.number,
  }).isRequired,
  durationPercent: PropTypes.number.isRequired,
};
