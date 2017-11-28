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

import PropTypes from 'prop-types';
import React from 'react';
import { sortBy } from 'lodash';
import moment from 'moment';

import { formatDuration } from '../../utils/date';
import TraceServiceTag from './TraceServiceTag';

import './TraceSearchResult.css';

const getBackgroundStyle = durationPercent =>
  `linear-gradient(
  90deg, rgba(17, 147, 154, .3) ${durationPercent}%, whitesmoke ${durationPercent - 100}%)`;

export default function TraceSearchResult({ trace, durationPercent = 100 }) {
  const { duration, services, timestamp, numberOfErredSpans, numberOfSpans, traceName } = trace;
  return (
    <div className="trace-search-result" style={{ border: '2px solid whitesmoke' }}>
      <div
        className="p1 clearfix"
        style={{
          background: getBackgroundStyle(durationPercent),
        }}
      >
        <span className="trace-search-result--traceName left">{traceName}</span>
        <span className="trace-search-result--duration right">{formatDuration(duration * 1000)}</span>
      </div>
      <div className="p1">
        <div className="clearfix">
          <div className="col col-2">
            <span className="trace-search-result--spans">
              {numberOfSpans} span{numberOfSpans > 1 && 's'}
            </span>
            {Boolean(numberOfErredSpans) && (
              <span className="trace-search-result--erred-spans">
                {numberOfErredSpans} error{numberOfErredSpans > 1 && 's'}
              </span>
            )}
          </div>
          <div className="col col-6">
            {sortBy(services, s => s.name).map(service => (
              <div key={service.name} className="inline-block mr1 mb1">
                <TraceServiceTag service={service} />
              </div>
            ))}
          </div>
          <div className="col col-4">
            <span className="trace-search-result--timestamp right">
              {moment(timestamp).format('hh:mm:ss a')} (
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
