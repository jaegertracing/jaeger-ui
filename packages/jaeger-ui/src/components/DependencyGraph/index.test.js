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
import * as constants from '../../utils/constants';

import { DependencyGraphPageImpl as DependencyGraph, mapDispatchToProps, mapStateToProps } from './index';
import LoadingIndicator from '../common/LoadingIndicator';
import DAGOptions from './DAGOptions';
import DAG from './DAG';

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
  router: {
    location: {
      search: '',
    },
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
    beforeEach(() => {
      jest.resetAllMocks();
      jest.spyOn(constants, 'getAppEnvironment').mockReturnValue('development');
    });

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
      const instance = wrapper.instance();
      jest.spyOn(instance, 'setState');

      instance.handleLayoutSelect(layout);
      expect(instance.setState).toHaveBeenCalledWith({ selectedLayout: layout });
      expect(wrapper.state('selectedLayout')).toBe(layout);
    });

    it('calls updateLayout when dependencies prop changes', () => {
      const instance = wrapper.instance();
      jest.spyOn(instance, 'updateLayout');

      const newDependencies = [
        ...dependencies,
        {
          callCount: 2,
          child: 'new-child',
          parent: 'new-parent',
        },
      ];

      wrapper.setProps({ dependencies: newDependencies });
      expect(instance.updateLayout).toHaveBeenCalledTimes(1);
    });

    it('updates layout based on dependencies size', () => {
      const smallWrapper = shallow(
        <DependencyGraph {...props} dependencies={dependencies} fetchDependencies={() => {}} />
      );
      smallWrapper.instance().updateLayout();
      expect(smallWrapper.state('selectedLayout')).toBe('dot');

      const manyDependencies = Array(1001)
        .fill()
        .map((_, i) => ({
          callCount: 1,
          child: `child-${i}`,
          parent: 'parent',
        }));
      const largeWrapper = shallow(
        <DependencyGraph {...props} dependencies={manyDependencies} fetchDependencies={() => {}} />
      );
      largeWrapper.instance().updateLayout();
      expect(largeWrapper.state('selectedLayout')).toBe('sfdp');
    });

    it('updates layout based on dependencies size', () => {
      const smallWrapper = shallow(
        <DependencyGraph {...props} dependencies={dependencies} fetchDependencies={() => {}} />
      );
      const instance = smallWrapper.instance();
      jest.spyOn(instance, 'setState');

      instance.updateLayout();
      expect(instance.setState).not.toHaveBeenCalled();

      smallWrapper.setState({ selectedLayout: 'sfdp' });

      instance.updateLayout();
      expect(instance.setState).toHaveBeenCalledWith({
        selectedLayout: 'dot',
        selectedService: null,
        selectedDepth: 5,
        debouncedDepth: 5,
      });
    });

    it('handles depth change with numeric value', () => {
      const depth = 3;
      wrapper.instance().handleDepthChange(depth);
      expect(wrapper.state('selectedDepth')).toBe(depth);
    });

    it('handles depth change with negative value', () => {
      const depth = -1;
      wrapper.instance().handleDepthChange(depth);
      expect(wrapper.state('selectedDepth')).toBe(0);
    });

    it('handles depth change with null value', () => {
      const instance = wrapper.instance();
      jest.spyOn(instance, 'setState');

      instance.handleDepthChange(null);
      expect(instance.setState).toHaveBeenCalledWith({ selectedDepth: null, debouncedDepth: null });
      expect(wrapper.state('selectedDepth')).toBe(null);
      expect(wrapper.state('debouncedDepth')).toBe(null);
    });

    it('handles depth change with undefined value', () => {
      const instance = wrapper.instance();
      jest.spyOn(instance, 'setState');

      instance.handleDepthChange(undefined);
      expect(instance.setState).toHaveBeenCalledWith({ selectedDepth: undefined, debouncedDepth: undefined });
      expect(wrapper.state('selectedDepth')).toBe(undefined);
      expect(wrapper.state('debouncedDepth')).toBe(undefined);
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

    it('handles sample dataset type change', async () => {
      const selectedSampleDatasetType = 'Small Graph';
      await wrapper.instance().handleSampleDatasetTypeChange(selectedSampleDatasetType);

      expect(wrapper.state('selectedSampleDatasetType')).toBe(selectedSampleDatasetType);
      expect(wrapper.state('selectedLayout')).toBe('dot');

      await wrapper.instance().handleSampleDatasetTypeChange(null);
      expect(wrapper.state('selectedSampleDatasetType')).toBe(null);

      await wrapper.instance().handleSampleDatasetTypeChange(null);
    });

    it('passes computed match count to DAGOptions based on uiFind and dependencies', () => {
      const sampleDependencies = [
        { parent: 'serviceA', child: 'serviceB', callCount: 10 },
        { parent: 'serviceB', child: 'anotherService', callCount: 5 },
        { parent: 'serviceA', child: 'anotherService', callCount: 2 },
      ];

      const uiFindTerm = 'service';
      const expectedMatchCount = 3;

      wrapper.setProps({ dependencies: sampleDependencies, uiFind: uiFindTerm });
      wrapper.setState({ selectedService: null });

      wrapper.update();

      const dagOptions = wrapper.find(DAGOptions);
      expect(dagOptions.prop('matchCount')).toBe(expectedMatchCount);

      const uiFindTerm2 = 'another';
      const expectedMatchCount2 = 1;
      wrapper.setProps({ uiFind: uiFindTerm2 });
      wrapper.update();
      const dagOptions2 = wrapper.find(DAGOptions);
      expect(dagOptions2.prop('matchCount')).toBe(expectedMatchCount2);

      wrapper.setProps({ uiFind: undefined });
      wrapper.update();
      const dagOptions3 = wrapper.find(DAGOptions);
      expect(dagOptions3.prop('matchCount')).toBe(0);
    });
  });

  describe('<DependencyGraph> filtering logic (findConnectedServices)', () => {
    const baseProps = {
      fetchDependencies: jest.fn(),
      nodes: [{ key: 'dummyNode' }],
      links: [{ from: 'dummyNode', to: 'dummyNode', label: '1' }],
      loading: false,
      error: null,
      uiFind: undefined,
      dependencies: [],
    };

    const getGraphDataFromDAG = currentWrapper => {
      currentWrapper.update();
      const dagComponent = currentWrapper.find(DAG);
      if (dagComponent.exists()) {
        return dagComponent.prop('data');
      }
      return { nodes: [], edges: [] };
    };

    it('should include direct children when parent is selected', () => {
      const testDependencies = [{ parent: 'A', child: 'B', callCount: 1 }];

      wrapper = shallow(<DependencyGraph {...baseProps} dependencies={testDependencies} />);
      wrapper.setState({ selectedService: 'A', selectedDepth: 1, debouncedDepth: 1 });

      const graphData = getGraphDataFromDAG(wrapper);
      expect(graphData.nodes).toEqual(expect.arrayContaining([{ key: 'A' }, { key: 'B' }]));
      expect(graphData.edges).toEqual(expect.arrayContaining([{ from: 'A', to: 'B', label: '1' }]));
    });

    it('should include direct parents when child is selected', () => {
      const testDependencies = [{ parent: 'A', child: 'B', callCount: 1 }];

      wrapper = shallow(<DependencyGraph {...baseProps} dependencies={testDependencies} />);
      wrapper.setState({ selectedService: 'B', selectedDepth: 1, debouncedDepth: 1 });

      const graphData = getGraphDataFromDAG(wrapper);
      expect(graphData.nodes).toEqual(expect.arrayContaining([{ key: 'A' }, { key: 'B' }]));
      expect(graphData.edges).toEqual(expect.arrayContaining([{ from: 'A', to: 'B', label: '1' }]));
    });

    it('should not re-add already visited nodes (outgoing)', () => {
      const testDependencies = [
        { parent: 'A', child: 'B', callCount: 1 },
        { parent: 'B', child: 'A', callCount: 1 },
      ];

      wrapper = shallow(<DependencyGraph {...baseProps} dependencies={testDependencies} />);
      wrapper.setState({ selectedService: 'A', selectedDepth: 2, debouncedDepth: 2 });

      const graphData = getGraphDataFromDAG(wrapper);
      expect(graphData.nodes).toHaveLength(2);
      expect(graphData.nodes).toEqual(expect.arrayContaining([{ key: 'A' }, { key: 'B' }]));
      expect(graphData.edges).toHaveLength(1);
      expect(graphData.edges).toEqual(expect.arrayContaining([{ from: 'A', to: 'B', label: '1' }]));
    });

    it('should not re-add already visited nodes (incoming)', () => {
      const testDependencies = [
        { parent: 'A', child: 'B', callCount: 1 },
        { parent: 'B', child: 'A', callCount: 1 },
      ];

      wrapper = shallow(<DependencyGraph {...baseProps} dependencies={testDependencies} />);
      wrapper.setState({ selectedService: 'B', selectedDepth: 2, debouncedDepth: 2 });

      const graphData = getGraphDataFromDAG(wrapper);
      expect(graphData.nodes).toHaveLength(2);
      expect(graphData.nodes).toEqual(expect.arrayContaining([{ key: 'A' }, { key: 'B' }]));
      expect(graphData.edges).toHaveLength(1);
      expect(graphData.edges).toEqual(expect.arrayContaining([{ from: 'A', to: 'B', label: '1' }]));
    });

    it('should ignore calls not connected to the selected service', () => {
      const testDependencies = [
        { parent: 'A', child: 'B', callCount: 1 },
        { parent: 'C', child: 'D', callCount: 1 },
      ];

      wrapper = shallow(<DependencyGraph {...baseProps} dependencies={testDependencies} />);
      wrapper.setState({ selectedService: 'A', selectedDepth: 1, debouncedDepth: 1 });

      const graphData = getGraphDataFromDAG(wrapper);
      expect(graphData.nodes).toHaveLength(2);
      expect(graphData.nodes).toEqual(expect.arrayContaining([{ key: 'A' }, { key: 'B' }]));
      expect(graphData.edges).toHaveLength(1);
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
