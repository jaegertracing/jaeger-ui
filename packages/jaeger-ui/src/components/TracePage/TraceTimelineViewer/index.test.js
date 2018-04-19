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

import TraceTimelineViewer from './index';
import traceGenerator from '../../../demo/trace-generators';
import transformTraceData from '../../../model/transform-trace-data';

describe('<TraceTimelineViewer>', () => {
  const trace = transformTraceData(traceGenerator.trace({}));
  const props = {
    trace,
    textFilter: null,
    viewRange: {
      time: {
        current: [0, 1],
      },
    },
  };
  const options = {
    context: {
      store: {
        getState() {
          return { traceTimeline: { spanNameColumnWidth: 0.25 } };
        },
        subscribe() {},
      },
    },
  };

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<TraceTimelineViewer {...props} />, options);
  });

  it('it does not explode', () => {
    expect(wrapper).toBeDefined();
  });
});
