// Copyright (c) 2021 The Jaeger Authors.
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
import OperationsGraph from './opsGraph';
import { serviceOpsMetrics } from '../../../../reducers/metrics.mock';

const props = {
  color: '#FFFFFF',
  dataPoints: [],
  error: null,
};

describe('<OperationsGraph>', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<OperationsGraph {...props} />);
  });

  it('does not explode', () => {
    expect(wrapper.length).toBe(1);
  });

  it('"Mo data" is displayed', () => {
    expect(wrapper).toMatchSnapshot();
  });

  it('"Couldn’t fetch data" displayed', () => {
    wrapper.setProps({ ...props, error: new Error('API Error') });
    expect(wrapper).toMatchSnapshot();
  });

  it('Graph rendered successfully', () => {
    wrapper.setProps({ ...props, dataPoints: serviceOpsMetrics[0].dataPoints.service_operation_call_rate });
    expect(wrapper).toMatchSnapshot();
  });
});
