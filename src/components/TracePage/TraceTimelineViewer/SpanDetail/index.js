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

import React from 'react';
import PropTypes from 'prop-types';

import AccordianKeyValues from './AccordianKeyValues';
import AccordianLogs from './AccordianLogs';
import { formatDuration } from '../utils';

import './index.css';

export default function SpanDetail(props) {
  const { span, trace } = props;
  return (
    <div>
      <div>
        <h3 className="mb1">
          {span.operationName}
        </h3>
        <div>
          <div className="inline-block mr1">
            <strong>Service: </strong>
            <span>
              {span.process.serviceName}
            </span>
          </div>
          <div className="inline-block mr1">
            <strong>Duration: </strong>
            <span>
              {formatDuration(span.duration)}
            </span>
          </div>
          <div className="inline-block mr1">
            <strong>Start Time: </strong>
            <span>
              {formatDuration(span.relativeStartTime)}
            </span>
          </div>
        </div>
        <hr />
      </div>
      <div>
        <div>
          <AccordianKeyValues data={span.tags} highContrast label="Tags" />
          {span.process &&
            span.process.tags &&
            <AccordianKeyValues data={span.process.tags} highContrast label="Process" />}
        </div>
        {span.logs && span.logs.length > 0 && <AccordianLogs logs={span.logs} timestamp={trace.startTime} />}

        <small className="SpanDetail--debugInfo">
          <span className="SpanDetail--debugLabel" data-label="SpanID:" />{' '}
          <span className="SpanDetail--debugValue">{span.spanID}</span>
        </small>
      </div>
    </div>
  );
}
SpanDetail.propTypes = {
  span: PropTypes.object,
  timestampOrigin: PropTypes.object,
};
