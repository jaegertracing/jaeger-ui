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
import sinon from 'sinon';
import { shallow, mount } from 'enzyme';

import TracePage from './index';
import TracePageHeader from './TracePageHeader';
import SpanGraph from './SpanGraph';
import traceGenerator from '../../demo/trace-generators';
import transformTraceData from '../../model/transform-trace-data';

describe('<TracePage>', () => {
  const trace = transformTraceData(traceGenerator.trace({}));
  const defaultProps = {
    trace,
    fetchTrace() {},
    id: trace.traceID,
  };

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<TracePage {...defaultProps} />);
  });

  it('renders a <TracePageHeader>', () => {
    expect(wrapper.find(TracePageHeader).get(0)).toBeTruthy();
  });

  it('renders a <SpanGraph>', () => {
    expect(wrapper.find(SpanGraph).length).toBe(1);
  });

  it('renders an empty page when not provided a trace', () => {
    wrapper = shallow(<TracePage {...defaultProps} trace={null} />);
    const isEmpty = wrapper.matchesElement(<section />);
    expect(isEmpty).toBe(true);
  });

  it('renders a loading indicator when loading', () => {
    wrapper = shallow(<TracePage {...defaultProps} trace={null} loading />);
    const loading = wrapper.find('.loader');
    expect(loading.length).toBe(1);
  });

  // can't do mount tests in standard tape run.
  it('fetches the trace if necessary', () => {
    const fetchTrace = sinon.spy();
    wrapper = mount(<TracePage {...defaultProps} trace={null} fetchTrace={fetchTrace} />);
    expect(fetchTrace.called).toBeTruthy();
    expect(fetchTrace.calledWith(trace.traceID)).toBe(true);
  });

  it("doesn't fetch the trace if already present", () => {
    const fetchTrace = sinon.spy();
    wrapper = shallow(<TracePage {...defaultProps} fetchTrace={fetchTrace} />);
    wrapper.instance().componentDidMount();
    expect(fetchTrace.called).toBeFalsy();
  });
});
