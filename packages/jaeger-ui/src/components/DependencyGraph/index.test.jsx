// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { render, screen, act, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import * as constants from '../../utils/constants';

import DependencyGraphPage, { DependencyGraphPageImpl as DependencyGraph } from './index';
import { useDependenciesQuery } from '../../hooks/useDependenciesQuery';

vi.mock('../../hooks/useDependenciesQuery', async actual => ({
  ...(await actual()),
  useDependenciesQuery: vi.fn(),
}));

let lastDAGOptionsProps = {};
let lastDAGProps = {};

vi.mock('./DAG', () => {
  return mockDefault(function MockDAG(props) {
    lastDAGProps = props;
    return <div data-testid="dag-component" />;
  });
});

vi.mock('./DAGOptions', () => {
  return mockDefault(function MockDAGOptions(props) {
    lastDAGOptionsProps = props;
    return <div data-testid="dag-options" />;
  });
});

vi.mock('../common/LoadingIndicator', () => {
  return mockDefault(function MockLoadingIndicator(props) {
    return <div data-testid="loading-indicator" {...props} />;
  });
});

vi.mock('../common/ErrorMessage', () => {
  return mockDefault(function MockErrorMessage(props) {
    return <div data-testid="error-message" {...props} />;
  });
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
const defaultProps = {
  dependencies,
  error: null,
  loading: false,
  selectedDataSource: 'Backend',
  onDataSourceChange: () => {},
};

const renderComponent = (extraProps = {}) =>
  render(
    <MemoryRouter>
      <DependencyGraph {...defaultProps} {...extraProps} />
    </MemoryRouter>
  );

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

    rerender(
      <MemoryRouter>
        <DependencyGraph {...defaultProps} loading />
      </MemoryRouter>
    );
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('shows an error message when passed error information', () => {
    const error = {};
    const { rerender } = renderComponent();
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <DependencyGraph {...defaultProps} error={error} />
      </MemoryRouter>
    );
    expect(screen.getByTestId('error-message')).toBeInTheDocument();
  });

  it('shows a message where there is nothing to visualize', () => {
    renderComponent({ dependencies: [] });
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
        rerender(
          <MemoryRouter>
            <DependencyGraph {...defaultProps} dependencies={manyDependencies} />
          </MemoryRouter>
        );
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
        rerender(
          <MemoryRouter>
            <DependencyGraph {...defaultProps} dependencies={dependencies} />
          </MemoryRouter>
        );
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

    it('propagates data source change via the onDataSourceChange prop', () => {
      const onDataSourceChange = jest.fn();
      renderComponent({ onDataSourceChange });
      act(() => {
        lastDAGOptionsProps.onDataSourceChange('Small Graph');
      });
      expect(onDataSourceChange).toHaveBeenCalledWith('Small Graph');
    });

    it('passes computed match count to DAGOptions based on uiFind from URL and dependencies', () => {
      const sampleDependencies = [
        { parent: 'serviceA', child: 'serviceB', callCount: 10 },
        { parent: 'serviceB', child: 'anotherService', callCount: 5 },
        { parent: 'serviceA', child: 'anotherService', callCount: 2 },
      ];

      render(
        <MemoryRouter initialEntries={['/?uiFind=service']}>
          <DependencyGraph {...defaultProps} dependencies={sampleDependencies} />
        </MemoryRouter>
      );
      expect(lastDAGOptionsProps.matchCount).toBe(3);

      cleanup();

      render(
        <MemoryRouter initialEntries={['/?uiFind=another']}>
          <DependencyGraph {...defaultProps} dependencies={sampleDependencies} />
        </MemoryRouter>
      );
      expect(lastDAGOptionsProps.matchCount).toBe(1);

      cleanup();

      render(
        <MemoryRouter initialEntries={['/']}>
          <DependencyGraph {...defaultProps} dependencies={sampleDependencies} />
        </MemoryRouter>
      );
      expect(lastDAGOptionsProps.matchCount).toBe(0);
    });
  });

  describe('<DependencyGraph> filtering logic (findConnectedServices)', () => {
    const baseProps = {
      loading: false,
      error: null,
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

      render(
        <MemoryRouter>
          <DependencyGraph {...baseProps} dependencies={testDependencies} />
        </MemoryRouter>
      );
      selectServiceAndDepth('A', 1);

      expect(lastDAGProps.data.nodes).toEqual(expect.arrayContaining([{ key: 'A' }, { key: 'B' }]));
      expect(lastDAGProps.data.edges).toEqual(expect.arrayContaining([{ from: 'A', to: 'B', label: '1' }]));
    });

    it('should include direct parents when child is selected', () => {
      const testDependencies = [{ parent: 'A', child: 'B', callCount: 1 }];

      render(
        <MemoryRouter>
          <DependencyGraph {...baseProps} dependencies={testDependencies} />
        </MemoryRouter>
      );
      selectServiceAndDepth('B', 1);

      expect(lastDAGProps.data.nodes).toEqual(expect.arrayContaining([{ key: 'A' }, { key: 'B' }]));
      expect(lastDAGProps.data.edges).toEqual(expect.arrayContaining([{ from: 'A', to: 'B', label: '1' }]));
    });

    it('should not re-add already visited nodes (outgoing)', () => {
      const testDependencies = [
        { parent: 'A', child: 'B', callCount: 1 },
        { parent: 'B', child: 'A', callCount: 1 },
      ];

      render(
        <MemoryRouter>
          <DependencyGraph {...baseProps} dependencies={testDependencies} />
        </MemoryRouter>
      );
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

      render(
        <MemoryRouter>
          <DependencyGraph {...baseProps} dependencies={testDependencies} />
        </MemoryRouter>
      );
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

      render(
        <MemoryRouter>
          <DependencyGraph {...baseProps} dependencies={testDependencies} />
        </MemoryRouter>
      );
      selectServiceAndDepth('A', 1);

      expect(lastDAGProps.data.nodes).toHaveLength(2);
      expect(lastDAGProps.data.nodes).toEqual(expect.arrayContaining([{ key: 'A' }, { key: 'B' }]));
      expect(lastDAGProps.data.edges).toHaveLength(1);
    });
  });
});

describe('DependencyGraphPage (default export wired to useDependenciesQuery)', () => {
  const renderDefault = () =>
    render(
      <MemoryRouter>
        <DependencyGraphPage />
      </MemoryRouter>
    );

  beforeEach(() => {
    lastDAGOptionsProps = {};
    lastDAGProps = {};
    vi.mocked(useDependenciesQuery).mockReset();
  });

  it('starts with the Backend data source and passes it to the query hook', () => {
    vi.mocked(useDependenciesQuery).mockReturnValue({
      data: [{ parent: 'svc-a', child: 'svc-b', callCount: 4 }],
      isLoading: false,
      error: null,
    });

    renderDefault();

    expect(useDependenciesQuery).toHaveBeenCalledWith('Backend');
    expect(lastDAGOptionsProps.selectedDataSource).toBe('Backend');
    expect(lastDAGOptionsProps.dependencies).toEqual([{ parent: 'svc-a', child: 'svc-b', callCount: 4 }]);
  });

  it('renders LoadingIndicator while the query is loading', () => {
    vi.mocked(useDependenciesQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    renderDefault();

    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('renders ErrorMessage when the query errors', () => {
    vi.mocked(useDependenciesQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
    });

    renderDefault();

    expect(screen.getByTestId('error-message')).toBeInTheDocument();
  });

  it('treats undefined data as empty deps and shows the empty state', () => {
    vi.mocked(useDependenciesQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    renderDefault();

    expect(screen.getByText(/no.*?found/i)).toBeInTheDocument();
  });

  it('changing the data source re-invokes useDependenciesQuery with the new source', () => {
    vi.mocked(useDependenciesQuery).mockReturnValue({
      data: [{ parent: 'a', child: 'b', callCount: 1 }],
      isLoading: false,
      error: null,
    });

    renderDefault();
    expect(useDependenciesQuery).toHaveBeenLastCalledWith('Backend');

    act(() => {
      lastDAGOptionsProps.onDataSourceChange('Small Graph');
    });

    expect(useDependenciesQuery).toHaveBeenLastCalledWith('Small Graph');
    expect(lastDAGOptionsProps.selectedDataSource).toBe('Small Graph');
  });
});
