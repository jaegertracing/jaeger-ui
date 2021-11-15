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
import { mount } from 'enzyme';
import IoIosCheckmark from 'react-icons/lib/io/ios-checkmark-outline';
import IoIosCloseCircle from 'react-icons/lib/io/ios-circle-outline';
import MonitorATMEmptyState from '.';

const props = {
  configureStatus: false,
  sendDataStatus: false,
};
describe('<MonitorATMEmptyState>not configured', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(<MonitorATMEmptyState {...props} />);
  });

  it('does not explode', () => {
    expect(wrapper.length).toBe(1);
  });

  it('shows a loading indicator when loading data', () => {
    expect(wrapper.find(IoIosCloseCircle).length).toBe(2);
  });

  it('ATM snapshot test', () => {
    expect(wrapper).toMatchSnapshot();
  });
});

describe('<MonitorATMEmptyState> partially configured', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(
      <MonitorATMEmptyState
        {...{
          configureStatus: true,
          sendDataStatus: false,
        }}
      />
    );
  });

  it('does not explode', () => {
    expect(wrapper.length).toBe(1);
  });

  it('should render checkbox', () => {
    expect(wrapper.find(IoIosCheckmark).length).toBe(1);
  });

  it('ATM snapshot test', () => {
    expect(wrapper).toMatchSnapshot();
  });
});
