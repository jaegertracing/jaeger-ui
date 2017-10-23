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

import TraceResultsScatterPlot from './TraceResultsScatterPlot';

it('<TraceResultsScatterPlot /> should render base case correctly', () => {
  const wrapper = shallow(
    <TraceResultsScatterPlot
      data={[
        { x: Date.now() - 3000, y: 1, traceID: 1 },
        { x: Date.now() - 2000, y: 2, traceID: 2 },
        { x: Date.now() - 1000, y: 2, traceID: 2 },
        { x: Date.now(), y: 3, traceID: 3 },
      ]}
    />
  );
  expect(wrapper).toBeTruthy();
});
