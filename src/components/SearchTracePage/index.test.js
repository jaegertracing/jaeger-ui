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
