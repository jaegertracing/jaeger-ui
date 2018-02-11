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
import { Tag } from 'antd';
import { shallow } from 'enzyme';

import ResultItem from './ResultItem';
import * as markers from './ResultItem.markers';

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

it('<ResultItem /> should render base case correctly', () => {
  const wrapper = shallow(<ResultItem trace={testTraceProps} durationPercent={50} />);

  const numberOfSpanText = wrapper
    .find(`[data-test="${markers.NUM_SPANS}"]`)
    .first()
    .render()
    .text();
  const numberOfServicesTags = wrapper.find(`[data-test="${markers.SERVICE_TAGS}"]`).find(Tag).length;
  expect(numberOfSpanText).toBe('5 Spans');
  expect(numberOfServicesTags).toBe(1);
});

it('<ResultItem /> should not render any ServiceTags when there are no services', () => {
  const wrapper = shallow(
    <ResultItem
      trace={{
        ...testTraceProps,
        services: [],
      }}
      durationPercent={50}
    />
  );
  const numberOfServicesTags = wrapper.find(`[data-test="${markers.SERVICE_TAGS}"]`).find(Tag).length;
  expect(numberOfServicesTags).toBe(0);
});
