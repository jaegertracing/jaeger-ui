// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { render, screen, act, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import * as constants from '../../utils/constants';

import DependencyGraphPage from './index';
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
const defaultDeps = [{ callCount, child: childId, parent: parentId }];

// Default to a single-edge non-empty response so the page renders DAGOptions/DAG.
// Tests can override the mock per test with `mockHook({ ... })`. Uses `in` to
// distinguish "explicitly undefined" (a valid React Query pre-fetch state)
// from "omitted, use the default".
function mockHook(overrides = {}) {
  const next = { data: defaultDeps, isLoading: false, error: null };
  if ('data' in overrides) next.data = overrides.data;
  if ('isLoading' in overrides) next.isLoading = overrides.isLoading;
  if ('error' in overrides) next.error = overrides.error;
  vi.mocked(useDependenciesQuery).mockReturnValue(next);
}

const renderPage = (initialEntries = ['/']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <DependencyGraphPage />
    </MemoryRouter>
  );

describe('<DependencyGraphPage>', () => {
  beforeEach(() => {
    lastDAGOptionsProps = {};
    lastDAGProps = {};
    vi.mocked(useDependenciesQuery).mockReset();
    mockHook();
  });

  it('does not explode', () => {
    renderPage();
    expect(screen.getByTestId('dag-options')).toBeInTheDocument();
  });

  it('shows a loading indicator while the query is loading', () => {
    mockHook({ data: undefined, isLoading: true });
    renderPage();
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('shows an error message when the query errors', () => {
    mockHook({ data: undefined, error: new Error('boom') });
    renderPage();
    expect(screen.getByTestId('error-message')).toBeInTheDocument();
  });

  it('shows a message where there is nothing to visualize', () => {
    mockHook({ data: [] });
    renderPage();
    expect(screen.getByText(/no.*?found/i)).toBeInTheDocument();
  });

  it('treats undefined data as empty deps', () => {
    mockHook({ data: undefined });
    renderPage();
    expect(screen.getByText(/no.*?found/i)).toBeInTheDocument();
  });

  it('starts with the Backend data source and passes it to the query hook', () => {
    renderPage();
    expect(useDependenciesQuery).toHaveBeenCalledWith('Backend');
    expect(lastDAGOptionsProps.selectedDataSource).toBe('Backend');
  });

  it('changing the data source re-invokes useDependenciesQuery with the new source', () => {
    renderPage();
    expect(useDependenciesQuery).toHaveBeenLastCalledWith('Backend');

    act(() => {
      lastDAGOptionsProps.onDataSourceChange('Small Graph');
    });

    expect(useDependenciesQuery).toHaveBeenLastCalledWith('Small Graph');
    expect(lastDAGOptionsProps.selectedDataSource).toBe('Small Graph');
  });

  describe('DAG options', () => {
    beforeEach(() => {
      jest.spyOn(constants, 'getAppEnvironment').mockReturnValue('development');
    });

    it('initializes with default values', () => {
      renderPage();
      expect(lastDAGOptionsProps.selectedService).toBeUndefined();
      expect(lastDAGOptionsProps.selectedLayout).toBe('dot');
      expect(lastDAGOptionsProps.selectedDepth).toBe(5);
    });

    it('handles service selection', () => {
      renderPage();
      const service = 'test-service';
      act(() => {
        lastDAGOptionsProps.onServiceSelect(service);
      });
      expect(lastDAGOptionsProps.selectedService).toBe(service);
    });

    it('handles layout selection', () => {
      renderPage();
      const layout = 'sfdp';
      act(() => {
        lastDAGOptionsProps.onLayoutSelect(layout);
      });
      expect(lastDAGOptionsProps.selectedLayout).toBe(layout);
    });

    it('updates layout when the dependencies data swaps to a large dataset', () => {
      const manyDependencies = Array(1001)
        .fill()
        .map((_, i) => ({ callCount: 1, child: `child-${i}`, parent: 'parent' }));

      const { rerender } = renderPage();
      expect(lastDAGOptionsProps.selectedLayout).toBe('dot');

      mockHook({ data: manyDependencies });
      act(() => {
        rerender(
          <MemoryRouter>
            <DependencyGraphPage />
          </MemoryRouter>
        );
      });

      expect(lastDAGOptionsProps.selectedLayout).toBe('sfdp');
    });

    it('uses sfdp layout for large dependency graphs on initial render', () => {
      const manyDependencies = Array(1001)
        .fill()
        .map((_, i) => ({ callCount: 1, child: `child-${i}`, parent: 'parent' }));
      mockHook({ data: manyDependencies });
      renderPage();
      expect(lastDAGOptionsProps.selectedLayout).toBe('sfdp');
    });

    it('handles depth change with numeric value', () => {
      renderPage();
      const depth = 3;
      act(() => {
        lastDAGOptionsProps.onDepthChange(depth);
      });
      expect(lastDAGOptionsProps.selectedDepth).toBe(depth);
    });

    it('handles depth change with negative value', () => {
      renderPage();
      act(() => {
        lastDAGOptionsProps.onDepthChange(-1);
      });
      expect(lastDAGOptionsProps.selectedDepth).toBe(0);
    });

    it('handles depth change with null value', () => {
      renderPage();
      act(() => {
        lastDAGOptionsProps.onDepthChange(null);
      });
      expect(lastDAGOptionsProps.selectedDepth).toBeUndefined();
      expect(lastDAGProps.selectedDepth).toBe(0);
    });

    it('handles depth change with undefined value', () => {
      renderPage();
      act(() => {
        lastDAGOptionsProps.onDepthChange(undefined);
      });
      expect(lastDAGOptionsProps.selectedDepth).toBeUndefined();
    });

    it('handles reset', () => {
      renderPage();
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

    describe('timer-dependent behaviors', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
      });

      it('debounces depth changes', () => {
        renderPage();
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

    it('passes computed match count to DAGOptions based on uiFind from URL and dependencies', () => {
      const sampleDependencies = [
        { parent: 'serviceA', child: 'serviceB', callCount: 10 },
        { parent: 'serviceB', child: 'anotherService', callCount: 5 },
        { parent: 'serviceA', child: 'anotherService', callCount: 2 },
      ];
      mockHook({ data: sampleDependencies });

      renderPage(['/?uiFind=service']);
      expect(lastDAGOptionsProps.matchCount).toBe(3);

      cleanup();

      mockHook({ data: sampleDependencies });
      renderPage(['/?uiFind=another']);
      expect(lastDAGOptionsProps.matchCount).toBe(1);

      cleanup();

      mockHook({ data: sampleDependencies });
      renderPage(['/']);
      expect(lastDAGOptionsProps.matchCount).toBe(0);
    });
  });

  describe('filtering logic (findConnectedServices)', () => {
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
      mockHook({ data: [{ parent: 'A', child: 'B', callCount: 1 }] });
      renderPage();
      selectServiceAndDepth('A', 1);

      expect(lastDAGProps.data.nodes).toEqual(expect.arrayContaining([{ key: 'A' }, { key: 'B' }]));
      expect(lastDAGProps.data.edges).toEqual(expect.arrayContaining([{ from: 'A', to: 'B', label: '1' }]));
    });

    it('should include direct parents when child is selected', () => {
      mockHook({ data: [{ parent: 'A', child: 'B', callCount: 1 }] });
      renderPage();
      selectServiceAndDepth('B', 1);

      expect(lastDAGProps.data.nodes).toEqual(expect.arrayContaining([{ key: 'A' }, { key: 'B' }]));
      expect(lastDAGProps.data.edges).toEqual(expect.arrayContaining([{ from: 'A', to: 'B', label: '1' }]));
    });

    it('should not re-add already visited nodes (outgoing)', () => {
      mockHook({
        data: [
          { parent: 'A', child: 'B', callCount: 1 },
          { parent: 'B', child: 'A', callCount: 1 },
        ],
      });
      renderPage();
      selectServiceAndDepth('A', 2);

      expect(lastDAGProps.data.nodes).toHaveLength(2);
      expect(lastDAGProps.data.nodes).toEqual(expect.arrayContaining([{ key: 'A' }, { key: 'B' }]));
      expect(lastDAGProps.data.edges).toHaveLength(1);
      expect(lastDAGProps.data.edges).toEqual(expect.arrayContaining([{ from: 'A', to: 'B', label: '1' }]));
    });

    it('should not re-add already visited nodes (incoming)', () => {
      mockHook({
        data: [
          { parent: 'A', child: 'B', callCount: 1 },
          { parent: 'B', child: 'A', callCount: 1 },
        ],
      });
      renderPage();
      selectServiceAndDepth('B', 2);

      expect(lastDAGProps.data.nodes).toHaveLength(2);
      expect(lastDAGProps.data.nodes).toEqual(expect.arrayContaining([{ key: 'A' }, { key: 'B' }]));
      expect(lastDAGProps.data.edges).toHaveLength(1);
      expect(lastDAGProps.data.edges).toEqual(expect.arrayContaining([{ from: 'A', to: 'B', label: '1' }]));
    });

    it('should ignore calls not connected to the selected service', () => {
      mockHook({
        data: [
          { parent: 'A', child: 'B', callCount: 1 },
          { parent: 'C', child: 'D', callCount: 1 },
        ],
      });
      renderPage();
      selectServiceAndDepth('A', 1);

      expect(lastDAGProps.data.nodes).toHaveLength(2);
      expect(lastDAGProps.data.nodes).toEqual(expect.arrayContaining([{ key: 'A' }, { key: 'B' }]));
      expect(lastDAGProps.data.edges).toHaveLength(1);
    });
  });
});
