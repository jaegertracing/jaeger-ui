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
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as constants from '../../utils/constants';

import { DependencyGraphPageImpl as DependencyGraph, mapDispatchToProps, mapStateToProps } from './index';

jest.mock('./DAG', () => {
  return function MockDAG(props) {
    return <div data-testid="dag-component" data-props={JSON.stringify(props)} />;
  };
});

jest.mock('./DAGOptions', () => {
  return function MockDAGOptions(props) {
    return <div data-testid="dag-options" data-props={JSON.stringify(props)} />;
  };
});

jest.mock('../common/LoadingIndicator', () => {
  return function MockLoadingIndicator(props) {
    return <div data-testid="loading-indicator" {...props} />;
  };
});

jest.mock('../common/ErrorMessage', () => {
  return function MockErrorMessage(props) {
    return <div data-testid="error-message" {...props} />;
  };
});

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
  let componentInstance;

  const renderWithRef = (additionalProps = {}) => {
    const TestWrapper = React.forwardRef((props, ref) => (
      <DependencyGraph ref={ref} {...props} fetchDependencies={() => {}} {...additionalProps} />
    ));
    const ref = React.createRef();
    const result = render(<TestWrapper ref={ref} {...props} />);
    componentInstance = ref.current;
    return result;
  };

  beforeEach(() => {
    renderWithRef();
  });

  it('does not explode', () => {
    expect(componentInstance).toBeTruthy();
  });

  it('shows a loading indicator when loading data', () => {
    const { rerender } = render(<DependencyGraph {...props} fetchDependencies={() => {}} />);
    expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();

    rerender(<DependencyGraph {...props} fetchDependencies={() => {}} loading />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('shows an error message when passed error information', () => {
    const error = {};
    const { rerender } = render(<DependencyGraph {...props} fetchDependencies={() => {}} />);
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();

    rerender(<DependencyGraph {...props} fetchDependencies={() => {}} error={error} />);
    expect(screen.getByTestId('error-message')).toBeInTheDocument();
  });

  it('shows a message where there is nothing to visualize', () => {
    render(<DependencyGraph {...props} fetchDependencies={() => {}} links={null} nodes={null} />);
    expect(screen.getByText(/no.*?found/i)).toBeInTheDocument();
  });

  describe('DAG options', () => {
    beforeEach(() => {
      jest.resetAllMocks();
      jest.spyOn(constants, 'getAppEnvironment').mockReturnValue('development');
    });

    it('initializes with default values', () => {
      expect(componentInstance.state.selectedService).toBe(null);
      expect(componentInstance.state.selectedLayout).toBe('dot');
      expect(componentInstance.state.selectedDepth).toBe(5);
      expect(componentInstance.state.debouncedDepth).toBe(5);
    });

    it('handles service selection', () => {
      const service = 'test-service';
      act(() => {
        componentInstance.handleServiceSelect(service);
      });
      expect(componentInstance.state.selectedService).toBe(service);
    });

    it('handles layout selection', () => {
      const layout = 'sfdp';
      const mockSetState = jest.spyOn(componentInstance, 'setState');

      act(() => {
        componentInstance.handleLayoutSelect(layout);
      });
      expect(mockSetState).toHaveBeenCalledWith({ selectedLayout: layout });
      expect(componentInstance.state.selectedLayout).toBe(layout);
    });

    it('calls updateLayout when dependencies prop changes', () => {
      const mockUpdateLayout = jest.spyOn(componentInstance, 'updateLayout');

      const newDependencies = [...dependencies, { callCount: 2, child: 'new-child', parent: 'new-parent' }];

      const prevProps = { dependencies: props.dependencies };
      componentInstance.props = { ...componentInstance.props, dependencies: newDependencies };
      componentInstance.componentDidUpdate(prevProps);

      expect(mockUpdateLayout).toHaveBeenCalledTimes(1);
    });

    it('updates layout based on dependencies size', () => {
      const TestWrapper = React.forwardRef((props, ref) => (
        <DependencyGraph ref={ref} {...props} fetchDependencies={() => {}} />
      ));
      const smallRef = React.createRef();
      render(<TestWrapper ref={smallRef} {...props} dependencies={dependencies} />);
      act(() => {
        smallRef.current.updateLayout();
      });
      expect(smallRef.current.state.selectedLayout).toBe('dot');

      const manyDependencies = Array(1001)
        .fill()
        .map((_, i) => ({
          callCount: 1,
          child: `child-${i}`,
          parent: 'parent',
        }));
      const largeRef = React.createRef();
      render(<TestWrapper ref={largeRef} {...props} dependencies={manyDependencies} />);
      act(() => {
        largeRef.current.updateLayout();
      });
      expect(largeRef.current.state.selectedLayout).toBe('sfdp');
    });

    it('updates layout based on dependencies size with state tracking', () => {
      const TestWrapper = React.forwardRef((props, ref) => (
        <DependencyGraph ref={ref} {...props} fetchDependencies={() => {}} />
      ));
      const smallRef = React.createRef();
      render(<TestWrapper ref={smallRef} {...props} dependencies={dependencies} />);
      const mockSetState = jest.spyOn(smallRef.current, 'setState');

      act(() => {
        smallRef.current.updateLayout();
      });
      expect(mockSetState).not.toHaveBeenCalled();

      act(() => {
        smallRef.current.setState({ selectedLayout: 'sfdp' });
      });

      act(() => {
        smallRef.current.updateLayout();
      });
      expect(mockSetState).toHaveBeenCalledWith({
        selectedLayout: 'dot',
        selectedService: null,
        selectedDepth: 5,
        debouncedDepth: 5,
      });
    });

    it('handles depth change with numeric value', () => {
      const depth = 3;
      act(() => {
        componentInstance.handleDepthChange(depth);
      });
      expect(componentInstance.state.selectedDepth).toBe(depth);
    });

    it('handles depth change with negative value', () => {
      const depth = -1;
      act(() => {
        componentInstance.handleDepthChange(depth);
      });
      expect(componentInstance.state.selectedDepth).toBe(0);
    });

    it('handles depth change with null value', () => {
      const mockSetState = jest.spyOn(componentInstance, 'setState');

      act(() => {
        componentInstance.handleDepthChange(null);
      });
      expect(mockSetState).toHaveBeenCalledWith({ selectedDepth: null, debouncedDepth: null });
      expect(componentInstance.state.selectedDepth).toBe(null);
      expect(componentInstance.state.debouncedDepth).toBe(null);
    });

    it('handles depth change with undefined value', () => {
      const mockSetState = jest.spyOn(componentInstance, 'setState');

      act(() => {
        componentInstance.handleDepthChange(undefined);
      });
      expect(mockSetState).toHaveBeenCalledWith({ selectedDepth: undefined, debouncedDepth: undefined });
      expect(componentInstance.state.selectedDepth).toBe(undefined);
      expect(componentInstance.state.debouncedDepth).toBe(undefined);
    });

    it('handles reset', () => {
      act(() => {
        componentInstance.setState({
          selectedService: 'test-service',
          selectedDepth: 3,
          debouncedDepth: 3,
        });
      });
      act(() => {
        componentInstance.handleReset();
      });
      expect(componentInstance.state.selectedService).toBe(null);
      expect(componentInstance.state.selectedDepth).toBe(5);
      expect(componentInstance.state.debouncedDepth).toBe(5);
    });

    it('uses sfdp layout for large dependency graphs', () => {
      const manyDependencies = Array(1001)
        .fill()
        .map((_, i) => ({
          callCount: 1,
          child: `child-${i}`,
          parent: 'parent',
        }));

      const TestWrapper = React.forwardRef((props, ref) => (
        <DependencyGraph ref={ref} {...props} fetchDependencies={() => {}} />
      ));
      const ref = React.createRef();
      render(<TestWrapper ref={ref} {...props} dependencies={manyDependencies} />);
      expect(ref.current.state.selectedLayout).toBe('sfdp');
    });

    it('debounces depth changes', async () => {
      const depth = 3;
      act(() => {
        componentInstance.handleDepthChange(depth);
      });
      expect(componentInstance.state.selectedDepth).toBe(depth);
      expect(componentInstance.state.debouncedDepth).toBe(5);

      await waitFor(
        () => {
          expect(componentInstance.state.debouncedDepth).toBe(depth);
        },
        { timeout: 1500 }
      );
    });

    it('handles sample dataset type change', async () => {
      const selectedSampleDatasetType = 'Small Graph';
      await act(async () => {
        await componentInstance.handleSampleDatasetTypeChange(selectedSampleDatasetType);
      });

      expect(componentInstance.state.selectedSampleDatasetType).toBe(selectedSampleDatasetType);
      expect(componentInstance.state.selectedLayout).toBe('dot');

      await act(async () => {
        await componentInstance.handleSampleDatasetTypeChange(null);
      });
      expect(componentInstance.state.selectedSampleDatasetType).toBe(null);

      await act(async () => {
        await componentInstance.handleSampleDatasetTypeChange(null);
      });
    });

    it('passes computed match count to DAGOptions based on uiFind and dependencies', () => {
      const sampleDependencies = [
        { parent: 'serviceA', child: 'serviceB', callCount: 10 },
        { parent: 'serviceB', child: 'anotherService', callCount: 5 },
        { parent: 'serviceA', child: 'anotherService', callCount: 2 },
      ];

      const uiFindTerm = 'service';
      const expectedMatchCount = 3;

      const TestWrapper = React.forwardRef((props, ref) => (
        <DependencyGraph ref={ref} {...props} fetchDependencies={() => {}} />
      ));
      const ref = React.createRef();
      const { rerender } = render(
        <TestWrapper ref={ref} {...props} dependencies={sampleDependencies} uiFind={uiFindTerm} />
      );
      act(() => {
        ref.current.setState({ selectedService: null });
      });

      const graphData = ref.current.getMemoizedGraphData(
        sampleDependencies,
        null,
        ref.current.state.debouncedDepth
      );
      const matchCount = ref.current.getMemoizedMatchCount(graphData.nodes, uiFindTerm);
      expect(matchCount).toBe(expectedMatchCount);

      const uiFindTerm2 = 'another';
      const expectedMatchCount2 = 1;
      rerender(<TestWrapper ref={ref} {...props} dependencies={sampleDependencies} uiFind={uiFindTerm2} />);
      const graphData2 = ref.current.getMemoizedGraphData(
        sampleDependencies,
        null,
        ref.current.state.debouncedDepth
      );
      const matchCount2 = ref.current.getMemoizedMatchCount(graphData2.nodes, uiFindTerm2);
      expect(matchCount2).toBe(expectedMatchCount2);

      rerender(<TestWrapper ref={ref} {...props} dependencies={sampleDependencies} uiFind={undefined} />);
      const graphData3 = ref.current.getMemoizedGraphData(
        sampleDependencies,
        null,
        ref.current.state.debouncedDepth
      );
      const matchCount3 = ref.current.getMemoizedMatchCount(graphData3.nodes, undefined);
      expect(matchCount3).toBe(0);
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

    const getGraphDataFromComponent = instance => {
      return instance.getMemoizedGraphData(
        instance.props.dependencies,
        instance.state.selectedService,
        instance.state.debouncedDepth
      );
    };

    it('should include direct children when parent is selected', () => {
      const testDependencies = [{ parent: 'A', child: 'B', callCount: 1 }];

      const TestWrapper = React.forwardRef((props, ref) => (
        <DependencyGraph ref={ref} {...baseProps} dependencies={testDependencies} />
      ));
      const ref = React.createRef();
      render(<TestWrapper ref={ref} />);
      act(() => {
        ref.current.setState({ selectedService: 'A', selectedDepth: 1, debouncedDepth: 1 });
      });

      const graphData = getGraphDataFromComponent(ref.current);
      expect(graphData.nodes).toEqual(expect.arrayContaining([{ key: 'A' }, { key: 'B' }]));
      expect(graphData.edges).toEqual(expect.arrayContaining([{ from: 'A', to: 'B', label: '1' }]));
    });

    it('should include direct parents when child is selected', () => {
      const testDependencies = [{ parent: 'A', child: 'B', callCount: 1 }];

      const TestWrapper = React.forwardRef((props, ref) => (
        <DependencyGraph ref={ref} {...baseProps} dependencies={testDependencies} />
      ));
      const ref = React.createRef();
      render(<TestWrapper ref={ref} />);
      act(() => {
        ref.current.setState({ selectedService: 'B', selectedDepth: 1, debouncedDepth: 1 });
      });

      const graphData = getGraphDataFromComponent(ref.current);
      expect(graphData.nodes).toEqual(expect.arrayContaining([{ key: 'A' }, { key: 'B' }]));
      expect(graphData.edges).toEqual(expect.arrayContaining([{ from: 'A', to: 'B', label: '1' }]));
    });

    it('should not re-add already visited nodes (outgoing)', () => {
      const testDependencies = [
        { parent: 'A', child: 'B', callCount: 1 },
        { parent: 'B', child: 'A', callCount: 1 },
      ];

      const TestWrapper = React.forwardRef((props, ref) => (
        <DependencyGraph ref={ref} {...baseProps} dependencies={testDependencies} />
      ));
      const ref = React.createRef();
      render(<TestWrapper ref={ref} />);
      act(() => {
        ref.current.setState({ selectedService: 'A', selectedDepth: 2, debouncedDepth: 2 });
      });

      const graphData = getGraphDataFromComponent(ref.current);
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

      const TestWrapper = React.forwardRef((props, ref) => (
        <DependencyGraph ref={ref} {...baseProps} dependencies={testDependencies} />
      ));
      const ref = React.createRef();
      render(<TestWrapper ref={ref} />);
      act(() => {
        ref.current.setState({ selectedService: 'B', selectedDepth: 2, debouncedDepth: 2 });
      });

      const graphData = getGraphDataFromComponent(ref.current);
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

      const TestWrapper = React.forwardRef((props, ref) => (
        <DependencyGraph ref={ref} {...baseProps} dependencies={testDependencies} />
      ));
      const ref = React.createRef();
      render(<TestWrapper ref={ref} />);
      act(() => {
        ref.current.setState({ selectedService: 'A', selectedDepth: 1, debouncedDepth: 1 });
      });

      const graphData = getGraphDataFromComponent(ref.current);
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
