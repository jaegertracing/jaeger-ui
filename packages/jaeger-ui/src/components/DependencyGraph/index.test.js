// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { render, screen, act, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as constants from '../../utils/constants';

import { DependencyGraphPageImpl as DependencyGraph, mapDispatchToProps, mapStateToProps } from './index';

let lastDAGOptionsProps = {};
let lastDAGProps = {};

jest.mock('./DAG', () => {
  return function MockDAG(props) {
    lastDAGProps = props;
    return <div data-testid="dag-component" />;
  };
});

jest.mock('./DAGOptions', () => {
  return function MockDAGOptions(props) {
    lastDAGOptionsProps = props;
    return <div data-testid="dag-options" />;
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

const renderComponent = (extraProps = {}) =>
  render(<DependencyGraph {...props} fetchDependencies={() => {}} {...extraProps} />);

describe('<DependencyGraph>', () => {
  beforeEach(() => {
    renderComponent();
  });

  it('does not explode', () => {
    expect(screen.getByTestId('dag-options')).toBeInTheDocument();
  });

  it('shows a loading indicator when loading data', () => {
    const { rerender } = renderComponent();
    expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();

    rerender(<DependencyGraph {...props} fetchDependencies={() => {}} loading />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('shows an error message when passed error information', () => {
    const error = {};
    const { rerender } = renderComponent();
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();

    rerender(<DependencyGraph {...props} fetchDependencies={() => {}} error={error} />);
    expect(screen.getByTestId('error-message')).toBeInTheDocument();
  });

  it('shows a message where there is nothing to visualize', () => {
    renderComponent({ links: null, nodes: null });
    expect(screen.getByText(/no.*?found/i)).toBeInTheDocument();
  });

  describe('DAG options', () => {
    beforeEach(() => {
      jest.resetAllMocks();
      jest.spyOn(constants, 'getAppEnvironment').mockReturnValue('development');
    });

    it('initializes with default values', () => {
      expect(lastDAGOptionsProps.selectedService).toBeUndefined();
      expect(lastDAGOptionsProps.selectedLayout).toBe('dot');
      expect(lastDAGOptionsProps.selectedDepth).toBe(5);
    });

    it('handles service selection', () => {
      const service = 'test-service';
      act(() => {
        lastDAGOptionsProps.onServiceSelect(service);
      });
      expect(lastDAGOptionsProps.selectedService).toBe(service);
    });

    it('handles layout selection', () => {
      const layout = 'sfdp';
      act(() => {
        lastDAGOptionsProps.onLayoutSelect(layout);
      });
      expect(lastDAGOptionsProps.selectedLayout).toBe(layout);
    });

    it('calls updateLayout when dependencies prop changes', () => {
      const manyDependencies = Array(1001)
        .fill()
        .map((_, i) => ({ callCount: 1, child: `child-${i}`, parent: 'parent' }));

      const { rerender } = renderComponent();
      expect(lastDAGOptionsProps.selectedLayout).toBe('dot');

      act(() => {
        rerender(<DependencyGraph {...props} fetchDependencies={() => {}} dependencies={manyDependencies} />);
      });

      expect(lastDAGOptionsProps.selectedLayout).toBe('sfdp');
    });

    it('updates layout based on dependencies size', () => {
      renderComponent({ dependencies });
      expect(lastDAGOptionsProps.selectedLayout).toBe('dot');

      const manyDependencies = Array(1001)
        .fill()
        .map((_, i) => ({
          callCount: 1,
          child: `child-${i}`,
          parent: 'parent',
        }));
      renderComponent({ dependencies: manyDependencies });
      expect(lastDAGOptionsProps.selectedLayout).toBe('sfdp');
    });

    it('updates layout based on dependencies size with state tracking', () => {
      renderComponent({ dependencies });
      expect(lastDAGOptionsProps.selectedLayout).toBe('dot');
      act(() => {
        lastDAGOptionsProps.onLayoutSelect('sfdp');
      });
      expect(lastDAGOptionsProps.selectedLayout).toBe('sfdp');

      const { rerender } = renderComponent({ dependencies });
      act(() => {
        rerender(<DependencyGraph {...props} fetchDependencies={() => {}} dependencies={dependencies} />);
      });
      expect(lastDAGOptionsProps.selectedLayout).toBe('dot');
    });

    it('handles depth change with numeric value', () => {
      const depth = 3;
      act(() => {
        lastDAGOptionsProps.onDepthChange(depth);
      });
      expect(lastDAGOptionsProps.selectedDepth).toBe(depth);
    });

    it('handles depth change with negative value', () => {
      const depth = -1;
      act(() => {
        lastDAGOptionsProps.onDepthChange(depth);
      });
      expect(lastDAGOptionsProps.selectedDepth).toBe(0);
    });

    it('handles depth change with null value', () => {
      act(() => {
        lastDAGOptionsProps.onDepthChange(null);
      });
      expect(lastDAGOptionsProps.selectedDepth).toBeUndefined();
      expect(lastDAGProps.selectedDepth).toBe(0);
    });

    it('handles depth change with undefined value', () => {
      act(() => {
        lastDAGOptionsProps.onDepthChange(undefined);
      });
      expect(lastDAGOptionsProps.selectedDepth).toBeUndefined();
    });

    it('handles reset', () => {
      act(() => {
        lastDAGOptionsProps.onServiceSelect('test-service');
        lastDAGOptionsProps.onDepthChange(3);
      });
      expect(lastDAGOptionsProps.selectedService).toBe('test-service');
      expect(lastDAGOptionsProps.selectedDepth).toBe(3);

      act(() => {
        lastDAGOptionsProps.onReset();
      });
      expect(lastDAGOptionsProps.selectedService).toBeUndefined();
      expect(lastDAGOptionsProps.selectedDepth).toBe(5);
    });

    it('uses sfdp layout for large dependency graphs', () => {
      const manyDependencies = Array(1001)
        .fill()
        .map((_, i) => ({
          callCount: 1,
          child: `child-${i}`,
          parent: 'parent',
        }));

      renderComponent({ dependencies: manyDependencies });
      expect(lastDAGOptionsProps.selectedLayout).toBe('sfdp');
    });

    describe('timer-dependent behaviors', () => {
      beforeEach(() => {
        cleanup();
        jest.useFakeTimers();
        renderComponent();
      });

      afterEach(() => {
        // Clean up and restore real timers
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
      });

      it('debounces depth changes', () => {
        const depth = 3;
        act(() => {
          lastDAGOptionsProps.onDepthChange(depth);
        });
        expect(lastDAGOptionsProps.selectedDepth).toBe(depth);
        expect(lastDAGProps.selectedDepth).toBe(5);

        act(() => {
          jest.advanceTimersByTime(1000);
        });

        expect(lastDAGProps.selectedDepth).toBe(depth);
      });
    });

    it('handles sample dataset type change', async () => {
      const selectedSampleDatasetType = 'Small Graph';
      await act(async () => {
        await lastDAGOptionsProps.onSampleDatasetTypeChange(selectedSampleDatasetType);
      });

      expect(lastDAGOptionsProps.selectedSampleDatasetType).toBe(selectedSampleDatasetType);
      expect(lastDAGOptionsProps.selectedLayout).toBe('dot');

      await act(async () => {
        await lastDAGOptionsProps.onSampleDatasetTypeChange(null);
      });
      expect(lastDAGOptionsProps.selectedSampleDatasetType).toBe(null);

      await act(async () => {
        await lastDAGOptionsProps.onSampleDatasetTypeChange(null);
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

      const { rerender } = renderComponent({ dependencies: sampleDependencies, uiFind: uiFindTerm });
      expect(lastDAGOptionsProps.matchCount).toBe(expectedMatchCount);

      const uiFindTerm2 = 'another';
      const expectedMatchCount2 = 1;
      rerender(
        <DependencyGraph
          {...props}
          fetchDependencies={() => {}}
          dependencies={sampleDependencies}
          uiFind={uiFindTerm2}
        />
      );
      expect(lastDAGOptionsProps.matchCount).toBe(expectedMatchCount2);

      rerender(
        <DependencyGraph
          {...props}
          fetchDependencies={() => {}}
          dependencies={sampleDependencies}
          uiFind={undefined}
        />
      );
      expect(lastDAGOptionsProps.matchCount).toBe(0);
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

    // Select a service and depth then advance the debounce so DAG receives the updated graph data.
    const selectServiceAndDepth = (service, depth) => {
      act(() => {
        lastDAGOptionsProps.onServiceSelect(service);
        lastDAGOptionsProps.onDepthChange(depth);
      });
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    };

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should include direct children when parent is selected', () => {
      const testDependencies = [{ parent: 'A', child: 'B', callCount: 1 }];

      render(<DependencyGraph {...baseProps} dependencies={testDependencies} />);
      selectServiceAndDepth('A', 1);

      expect(lastDAGProps.data.nodes).toEqual(expect.arrayContaining([{ key: 'A' }, { key: 'B' }]));
      expect(lastDAGProps.data.edges).toEqual(expect.arrayContaining([{ from: 'A', to: 'B', label: '1' }]));
    });

    it('should include direct parents when child is selected', () => {
      const testDependencies = [{ parent: 'A', child: 'B', callCount: 1 }];

      render(<DependencyGraph {...baseProps} dependencies={testDependencies} />);
      selectServiceAndDepth('B', 1);

      expect(lastDAGProps.data.nodes).toEqual(expect.arrayContaining([{ key: 'A' }, { key: 'B' }]));
      expect(lastDAGProps.data.edges).toEqual(expect.arrayContaining([{ from: 'A', to: 'B', label: '1' }]));
    });

    it('should not re-add already visited nodes (outgoing)', () => {
      const testDependencies = [
        { parent: 'A', child: 'B', callCount: 1 },
        { parent: 'B', child: 'A', callCount: 1 },
      ];

      render(<DependencyGraph {...baseProps} dependencies={testDependencies} />);
      selectServiceAndDepth('A', 2);

      expect(lastDAGProps.data.nodes).toHaveLength(2);
      expect(lastDAGProps.data.nodes).toEqual(expect.arrayContaining([{ key: 'A' }, { key: 'B' }]));
      expect(lastDAGProps.data.edges).toHaveLength(1);
      expect(lastDAGProps.data.edges).toEqual(expect.arrayContaining([{ from: 'A', to: 'B', label: '1' }]));
    });

    it('should not re-add already visited nodes (incoming)', () => {
      const testDependencies = [
        { parent: 'A', child: 'B', callCount: 1 },
        { parent: 'B', child: 'A', callCount: 1 },
      ];

      render(<DependencyGraph {...baseProps} dependencies={testDependencies} />);
      selectServiceAndDepth('B', 2);

      expect(lastDAGProps.data.nodes).toHaveLength(2);
      expect(lastDAGProps.data.nodes).toEqual(expect.arrayContaining([{ key: 'A' }, { key: 'B' }]));
      expect(lastDAGProps.data.edges).toHaveLength(1);
      expect(lastDAGProps.data.edges).toEqual(expect.arrayContaining([{ from: 'A', to: 'B', label: '1' }]));
    });

    it('should ignore calls not connected to the selected service', () => {
      const testDependencies = [
        { parent: 'A', child: 'B', callCount: 1 },
        { parent: 'C', child: 'D', callCount: 1 },
      ];

      render(<DependencyGraph {...baseProps} dependencies={testDependencies} />);
      selectServiceAndDepth('A', 1);

      expect(lastDAGProps.data.nodes).toHaveLength(2);
      expect(lastDAGProps.data.nodes).toEqual(expect.arrayContaining([{ key: 'A' }, { key: 'B' }]));
      expect(lastDAGProps.data.edges).toHaveLength(1);
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
