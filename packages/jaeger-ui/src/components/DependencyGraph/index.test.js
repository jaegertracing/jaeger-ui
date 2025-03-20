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

import { DependencyGraphPageImpl as DependencyGraph, mapDispatchToProps, mapStateToProps } from './index';
import LoadingIndicator from '../common/LoadingIndicator';

const childId = 'boomya';
const parentId = 'elder-one';
const callCount = 1;
const dependencies = [
  {
    callCount,
    child: childId,
    parent: parentId,
  },
];
const state = {
  dependencies: {
    dependencies,
    error: null,
    loading: false,
  },
};

const props = mapStateToProps(state);

describe('<DependencyGraph>', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<DependencyGraph {...props} fetchDependencies={() => {}} />);
  });

  it('does not explode', () => {
    expect(wrapper.length).toBe(1);
  });

  it('shows a loading indicator when loading data', () => {
    expect(wrapper.find(LoadingIndicator).length).toBe(0);
    wrapper.setProps({ loading: true });
    expect(wrapper.find(LoadingIndicator).length).toBe(1);
  });

  it('shows an error message when passed error information', () => {
    const error = {};
    expect(wrapper.find({ error: expect.anything() }).length).toBe(0);
    wrapper.setProps({ error });
    expect(wrapper.find({ error }).length).toBe(1);
  });

  it('shows a message where there is nothing to visualize', () => {
    wrapper.setProps({ links: null, nodes: null });
    const matchTest = expect.stringMatching(/no.*?found/i);
    expect(wrapper.text()).toEqual(matchTest);
  });

  describe('DAG options', () => {
    it('initializes with default values', () => {
      expect(wrapper.state('selectedService')).toBe(null);
      expect(wrapper.state('selectedLayout')).toBe('dot');
      expect(wrapper.state('selectedDepth')).toBe(5);
      expect(wrapper.state('debouncedDepth')).toBe(5);
    });

    it('handles service selection', () => {
      const service = 'test-service';
      wrapper.instance().handleServiceSelect(service);
      expect(wrapper.state('selectedService')).toBe(service);
    });

    it('handles layout selection', () => {
      const layout = 'sfdp';
      wrapper.instance().handleLayoutSelect(layout);
      expect(wrapper.state('selectedLayout')).toBe(layout);
    });

    it('handles depth change', () => {
      const depth = 3;
      wrapper.instance().handleDepthChange(depth);
      expect(wrapper.state('selectedDepth')).toBe(depth);
    });

    it('ignores invalid depth values', () => {
      const initialDepth = wrapper.state('selectedDepth');
      wrapper.instance().handleDepthChange('invalid');
      expect(wrapper.state('selectedDepth')).toBe(initialDepth);
      wrapper.instance().handleDepthChange(-1);
      expect(wrapper.state('selectedDepth')).toBe(initialDepth);
    });

    it('handles reset', () => {
      wrapper.setState({
        selectedService: 'test-service',
        selectedDepth: 3,
        debouncedDepth: 3,
      });
      wrapper.instance().handleReset();
      expect(wrapper.state('selectedService')).toBe(null);
      expect(wrapper.state('selectedDepth')).toBe(5);
      expect(wrapper.state('debouncedDepth')).toBe(5);
    });

    it('uses sfdp layout for large dependency graphs', () => {
      const manyDependencies = Array(1001)
        .fill()
        .map((_, i) => ({
          callCount: 1,
          child: `child-${i}`,
          parent: 'parent',
        }));
      const newWrapper = shallow(
        <DependencyGraph {...props} dependencies={manyDependencies} fetchDependencies={() => {}} />
      );
      expect(newWrapper.state('selectedLayout')).toBe('sfdp');
    });

    it('ignores undefined or null depth values', () => {
      const initialDepth = wrapper.state('selectedDepth');
      wrapper.instance().handleDepthChange(undefined);
      expect(wrapper.state('selectedDepth')).toBe(initialDepth);
      wrapper.instance().handleDepthChange(null);
      expect(wrapper.state('selectedDepth')).toBe(initialDepth);
    });

    it('debounces depth changes', done => {
      const depth = 3;
      wrapper.instance().handleDepthChange(depth);
      expect(wrapper.state('selectedDepth')).toBe(depth);
      expect(wrapper.state('debouncedDepth')).toBe(5);

      setTimeout(() => {
        expect(wrapper.state('debouncedDepth')).toBe(depth);
        done();
      }, 1100);
    });
  });
});

describe('mapStateToProps()', () => {
  it('refines state to generate the props', () => {
    expect(mapStateToProps(state)).toEqual({
      ...state.dependencies,
      nodes: [
        expect.objectContaining({ callCount, orphan: false, id: parentId, radius: 3 }),
        expect.objectContaining({ callCount, orphan: false, id: childId, radius: 3 }),
      ],
      links: [{ callCount, source: parentId, target: childId, value: 1, target_node_size: 3 }],
    });
  });
});

describe('mapDispatchToProps()', () => {
  it('providers the `fetchDependencies` prop', () => {
    expect(mapDispatchToProps({})).toEqual({ fetchDependencies: expect.any(Function) });
  });
});
