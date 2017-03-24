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

import TraceSearchResult from './TraceSearchResult';
import TraceServiceTag from './TraceServiceTag';

const testTraceProps = {
  duration: 100,
  services: [
    {
      name: 'Service A',
      numberOfApperancesInTrace: 2,
      percentOfTrace: 50,
    },
  ],
  startTime: Date.now(),
  numberOfSpans: 5,
};

it('<TraceSearchResult /> should render base case correctly', () => {
  const wrapper = shallow(
    <TraceSearchResult trace={testTraceProps} durationPercent={50} />
  );

  const numberOfSpanText = wrapper
    .find('.trace-search-result--spans')
    .first()
    .text();
  const numberOfServicesTags = wrapper.find(TraceServiceTag).length;
  expect(numberOfSpanText).toBe('5 spans');
  expect(numberOfServicesTags).toBe(1);
});

it('<TraceSearchResult /> should not render any ServiceTags when there are no services', () => {
  const wrapper = shallow(
    <TraceSearchResult
      trace={{
        ...testTraceProps,
        services: [],
      }}
      durationPercent={50}
    />
  );
  const numberOfServicesTags = wrapper.find(TraceServiceTag).length;
  expect(numberOfServicesTags).toBe(0);
});
