// Copyright (c) 2019 The Jaeger Authors.
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
import { Popover } from 'antd';

import TraceDiffHeader from './TraceDiffHeader';
import { fetchedState } from '../../../constants';

describe('TraceDiffHeader', () => {
  const cohort = [
    {
      data: {
        duration: 0,
        // purposefully missing spans
        startTime: 0,
        traceName: 'cohort-trace-name-0',
      },
      error: 'error 0',
      id: 'cohort-id-0',
      state: fetchedState.ERROR,
    },
    {
      data: {
        duration: 100,
        spans: [
          {
            spanID: 'trace-1-span-0',
          },
        ],
        startTime: 100,
        traceName: 'cohort-trace-name-1',
      },
      error: 'error 1',
      id: 'cohort-id-1',
      state: fetchedState.DONE,
    },
    {
      data: {
        duration: 200,
        spans: [
          {
            spanID: 'trace-2-span-1',
          },
          {
            spanID: 'trace-2-span-2',
          },
        ],
        startTime: 200,
        traceName: 'cohort-trace-name-2',
      },
      error: 'error 2',
      id: 'cohort-id-2',
      state: fetchedState.DONE,
    },
    {
      data: {
        duration: 300,
        spans: [
          {
            spanID: 'trace-3-span-1',
          },
          {
            spanID: 'trace-3-span-2',
          },
          {
            spanID: 'trace-3-span-3',
          },
        ],
        startTime: 300,
        traceName: 'cohort-trace-name-3',
      },
      error: 'error 3',
      id: 'cohort-id-3',
      state: fetchedState.DONE,
    },
  ];
  const diffSetA = jest.fn();
  const diffSetB = jest.fn();
  const props = {
    a: cohort[1],
    b: cohort[2],
    cohort,
    diffSetA,
    diffSetB,
  };

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<TraceDiffHeader {...props} />);
  });

  it('renders as expected', () => {
    expect(wrapper).toMatchSnapshot();
  });

  it('handles trace without spans', () => {
    wrapper.setProps({ a: cohort[0] });
  });

  it('handles absent a', () => {
    wrapper.setProps({ a: null });
    expect(wrapper).toMatchSnapshot();
  });

  it('handles absent b', () => {
    wrapper.setProps({ b: null });
    expect(wrapper).toMatchSnapshot();
  });

  it('handles absent a & b', () => {
    wrapper.setProps({ a: null, b: null });
    expect(wrapper).toMatchSnapshot();
  });

  it('manages visibility correctly', () => {
    expect(wrapper.state().tableVisible).toBe(null);
    const popovers = wrapper.find(Popover);
    expect(popovers.length).toBe(2);
    popovers.forEach(popover => expect(popover.prop('visible')).toBe(false));

    wrapper
      .find(Popover)
      .at(0)
      .prop('onVisibleChange')(true);
    expect(
      wrapper
        .find(Popover)
        .at(0)
        .prop('visible')
    ).toBe(true);
    expect(
      wrapper
        .find(Popover)
        .at(1)
        .prop('visible')
    ).toBe(false);

    wrapper
      .find(Popover)
      .at(1)
      .prop('onVisibleChange')(true);
    expect(
      wrapper
        .find(Popover)
        .at(0)
        .prop('visible')
    ).toBe(false);
    expect(
      wrapper
        .find(Popover)
        .at(1)
        .prop('visible')
    ).toBe(true);

    // repeat onVisibleChange call to test that visibility remains correct
    wrapper
      .find(Popover)
      .at(1)
      .prop('onVisibleChange')(true);
    expect(
      wrapper
        .find(Popover)
        .at(0)
        .prop('visible')
    ).toBe(false);
    expect(
      wrapper
        .find(Popover)
        .at(1)
        .prop('visible')
    ).toBe(true);

    wrapper
      .find(Popover)
      .at(1)
      .prop('onVisibleChange')(false);
    wrapper.find(Popover).forEach(popover => expect(popover.prop('visible')).toBe(false));
  });

  it('creates bound functions to set a & b and passes them to Popover JSX props correctly', () => {
    const cohortTableASelectionID = 'cohortTableASelectionID';
    const traceIdInputASelectionID = 'traceIdInputASelectionID';
    expect(props.diffSetA).not.toHaveBeenCalled();
    const cohortTableBSelectionID = 'cohortTableBSelectionID';
    const traceIdInputBSelectionID = 'traceIdInputBSelectionID';
    expect(props.diffSetB).not.toHaveBeenCalled();

    wrapper.setState({ tableVisible: 'a' });
    wrapper
      .find(Popover)
      .at(0)
      .prop('content')
      .props.selectTrace(cohortTableASelectionID);
    expect(props.diffSetA).toHaveBeenLastCalledWith(cohortTableASelectionID);
    expect(wrapper.state().tableVisible).toBe(null);

    wrapper.setState({ tableVisible: 'a' });
    wrapper
      .find(Popover)
      .at(0)
      .prop('title')
      .props.selectTrace(traceIdInputASelectionID);
    expect(props.diffSetA).toHaveBeenLastCalledWith(traceIdInputASelectionID);
    expect(wrapper.state().tableVisible).toBe(null);

    wrapper.setState({ tableVisible: 'b' });
    wrapper
      .find(Popover)
      .at(1)
      .prop('content')
      .props.selectTrace(cohortTableBSelectionID);
    expect(props.diffSetB).toHaveBeenLastCalledWith(cohortTableBSelectionID);
    expect(wrapper.state().tableVisible).toBe(null);

    wrapper.setState({ tableVisible: 'b' });
    wrapper
      .find(Popover)
      .at(1)
      .prop('title')
      .props.selectTrace(traceIdInputBSelectionID);
    expect(props.diffSetB).toHaveBeenLastCalledWith(traceIdInputBSelectionID);
    expect(wrapper.state().tableVisible).toBe(null);
  });
});
