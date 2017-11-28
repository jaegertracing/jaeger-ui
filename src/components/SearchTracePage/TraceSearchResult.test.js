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

import TraceSearchResult from './TraceSearchResult';
import TraceServiceTag from './TraceServiceTag';

const testTraceProps = {
  duration: 100,
  services: [
    {
      name: 'Service A',
      numberOfSpans: 2,
      percentOfTrace: 50,
    },
  ],
  startTime: Date.now(),
  numberOfSpans: 5,
};

it('<TraceSearchResult /> should render base case correctly', () => {
  const wrapper = shallow(<TraceSearchResult trace={testTraceProps} durationPercent={50} />);

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
