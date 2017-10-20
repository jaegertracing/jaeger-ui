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

/* eslint-disable import/first */
jest.mock('../utils');

import React from 'react';
import { shallow } from 'enzyme';

import AccordianKeyValues from './AccordianKeyValues';
import AccordianLogs from './AccordianLogs';
import DetailState from './DetailState';
import SpanDetail from './index';
import { formatDuration } from '../utils';
import traceGenerator from '../../../../demo/trace-generators';
import transformTraceData from '../../../../model/transform-trace-data';

describe('<SpanDetail>', () => {
  let wrapper;

  // use `transformTraceData` on a fake trace to get a fully processed span
  const span = transformTraceData(traceGenerator.trace({ numberOfSpans: 1 })).spans[0];
  const detailState = new DetailState().toggleLogs().toggleProcess().toggleTags();
  const traceStartTime = 5;
  const props = {
    detailState,
    span,
    traceStartTime,
    logItemToggle: jest.fn(),
    logsToggle: jest.fn(),
    processToggle: jest.fn(),
    tagsToggle: jest.fn(),
  };
  span.logs = [
    {
      timestamp: 10,
      fields: [{ key: 'message', value: 'oh the log message' }, { key: 'something', value: 'else' }],
    },
    {
      timestamp: 20,
      fields: [{ key: 'message', value: 'oh the next log message' }, { key: 'more', value: 'stuff' }],
    },
  ];

  beforeEach(() => {
    formatDuration.mockReset();
    props.tagsToggle.mockReset();
    props.processToggle.mockReset();
    props.logsToggle.mockReset();
    props.logItemToggle.mockReset();
    wrapper = shallow(<SpanDetail {...props} />);
  });

  it('renders without exploding', () => {
    expect(wrapper).toBeDefined();
  });

  it('shows the operation name', () => {
    expect(wrapper.find('h3').text()).toBe(span.operationName);
  });

  it('lists the service name, duration and start time', () => {
    const words = ['Service', 'Duration', 'Start Time'];
    const strongs = wrapper.find('strong');
    expect(strongs.length).toBe(3);
    strongs.forEach((strong, i) => {
      expect(strong.text()).toEqual(expect.stringContaining(words[i]));
    });
    expect(formatDuration.mock.calls).toEqual([[span.duration], [span.relativeStartTime]]);
  });

  it('renders the span tags', () => {
    const target = (
      <AccordianKeyValues data={span.tags} highContrast label="Tags" isOpen={detailState.isTagsOpen} />
    );
    expect(wrapper.containsMatchingElement(target)).toBe(true);
    wrapper.find({ data: span.tags }).simulate('toggle');
    expect(props.tagsToggle).toHaveBeenLastCalledWith(span.spanID);
  });

  it('renders the process tags', () => {
    const target = (
      <AccordianKeyValues
        data={span.process.tags}
        highContrast
        label="Process"
        isOpen={detailState.isProcessOpen}
      />
    );
    expect(wrapper.containsMatchingElement(target)).toBe(true);
    wrapper.find({ data: span.process.tags }).simulate('toggle');
    expect(props.processToggle).toHaveBeenLastCalledWith(span.spanID);
  });

  it('renders the logs', () => {
    const somethingUniq = {};
    const target = (
      <AccordianLogs
        logs={span.logs}
        isOpen={detailState.logs.isOpen}
        openedItems={detailState.logs.openedItems}
        timestamp={traceStartTime}
      />
    );
    expect(wrapper.containsMatchingElement(target)).toBe(true);
    const accordianLogs = wrapper.find(AccordianLogs);
    accordianLogs.simulate('toggle');
    accordianLogs.simulate('itemToggle', somethingUniq);
    expect(props.logsToggle).toHaveBeenLastCalledWith(span.spanID);
    expect(props.logItemToggle).toHaveBeenLastCalledWith(span.spanID, somethingUniq);
  });
});
