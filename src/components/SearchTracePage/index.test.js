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
import { shallow } from 'enzyme';

import SearchTracePage from './index';
/* eslint-disable */
import TraceResultsScatterPlot from './TraceResultsScatterPlot';
/* eslint-enable */

const SCATTER_PLOT = 'SCATTER_PLOT';
const defaultProps = {
  sortTracesBy: 'LONGEST_FIRST',
  traceResultsChartType: SCATTER_PLOT,
  traceResults: [{ traceID: 'a', spans: [], processes: {} }, { traceID: 'b', spans: [], processes: {} }],
  numberOfTraceResults: 0,
  maxTraceDuration: 100,
};

it('should show default message when there are no results', () => {
  const wrapper = shallow(<SearchTracePage {...defaultProps} traceResults={[]} />);
  expect(wrapper.find('.trace-search--no-results').length).toBe(1);
});

it('renders the a SCATTER_PLOT chart', () => {
  const wrapper = shallow(<SearchTracePage {...defaultProps} traceResultsChartType={SCATTER_PLOT} />);
  expect(wrapper.find(TraceResultsScatterPlot).length).toBe(1);
});

it('shows loader when loading', () => {
  const wrapper = shallow(<SearchTracePage {...defaultProps} loading />);
  expect(wrapper.find('.loader').length).toBe(1);
});
