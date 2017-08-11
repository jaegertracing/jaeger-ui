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
import sinon from 'sinon';
import { shallow } from 'enzyme';
import TracePage from '../../../src/components/TracePage';
import TracePageHeader from '../../../src/components/TracePage/TracePageHeader';
import TraceSpanGraph from '../../../src/components/TracePage/TraceSpanGraph';

const traceID = 'trace-id';
const timestamp = new Date().getTime() * 1000;
const defaultProps = {
  fetchTrace() {},
  id: traceID,
  trace: {
    traceID,
    spans: [
      {
        spanID: 'spanID-2',
        traceID,
        timestamp: timestamp + 10000,
        duration: 10000,
        operationName: 'whatever',
        process: {
          serviceName: 'my-other-service',
        },
      },
      {
        spanID: 'spanID-3',
        traceID,
        timestamp: timestamp + 20000,
        duration: 10000,
        operationName: 'bob',
        process: {
          serviceName: 'my-service',
        },
      },
      {
        spanID: 'spanID-1',
        traceID,
        timestamp,
        duration: 50000,
        operationName: 'whatever',
        process: {
          serviceName: 'my-service',
        },
      },
    ],
  },
};

it('<TracePage /> should render a <TracePageHeader /> with the trace', () => {
  const wrapper = shallow(<TracePage {...defaultProps} />);
  expect(wrapper.find(TracePageHeader).get(0)).toBeTruthy();
});

it('<TracePage /> should render a <TraceSpanGraph /> with the trace', () => {
  const wrapper = shallow(<TracePage {...defaultProps} />);

  expect(wrapper.contains(<TraceSpanGraph trace={defaultProps.trace} />)).toBeTruthy();
});

it('<TracePage /> should render an empty page if no trace', () => {
  const wrapper = shallow(<TracePage {...defaultProps} trace={null} />);

  expect(wrapper.matchesElement(<section />)).toBeTruthy();
});

// can't do mount tests in standard tape run.
it('TracePage should fetch the trace if necessary', () => {
  const fetchTrace = sinon.spy();
  const wrapper = shallow(<TracePage {...defaultProps} trace={null} fetchTrace={fetchTrace} />);

  wrapper.instance().componentDidMount();

  expect(fetchTrace.called).toBeTruthy();
  expect(fetchTrace.calledWith(traceID)).toBeTruthy();
});

it('TracePage should not fetch the trace if already present', () => {
  const fetchTrace = sinon.spy();
  const wrapper = shallow(<TracePage {...defaultProps} fetchTrace={fetchTrace} />);

  wrapper.instance().componentDidMount();

  expect(!fetchTrace.called).toBeTruthy();
});
