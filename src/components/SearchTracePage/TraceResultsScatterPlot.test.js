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

/* eslint-disable */
import TraceResultsScatterPlot from './TraceResultsScatterPlot';
/* eslint-enable */

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
