// Copyright (c) 2022 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import TraceFlamegraph from './index';
import testTrace from './testTrace.json';
import transformTraceData from '../../../model/transform-trace-data';

// Store callback references so tests can invoke them directly
const callbacks = {
  onClick: null,
  colorMapper: null,
  getName: null,
  labelHandler: null,
  searchMatch: null,
};

const mockChart = {
  width: vi.fn().mockReturnThis(),
  cellHeight: vi.fn().mockReturnThis(),
  inverted: vi.fn().mockReturnThis(),
  sort: vi.fn().mockReturnThis(),
  selfValue: vi.fn().mockReturnThis(),
  transitionDuration: vi.fn().mockReturnThis(),
  onClick: vi.fn(fn => {
    callbacks.onClick = fn;
    return mockChart;
  }),
  setColorMapper: vi.fn(fn => {
    callbacks.colorMapper = fn;
    return mockChart;
  }),
  setLabelHandler: vi.fn(fn => {
    callbacks.labelHandler = fn;
    return mockChart;
  }),
  getName: vi.fn(fn => {
    callbacks.getName = fn;
    return mockChart;
  }),
  setSearchMatch: vi.fn(fn => {
    callbacks.searchMatch = fn;
    return mockChart;
  }),
  search: vi.fn(),
  clear: vi.fn(),
  resetZoom: vi.fn(),
  destroy: vi.fn(),
};

vi.mock('d3-flame-graph', () => ({
  default: () => mockChart,
}));

vi.mock('d3-selection', () => ({
  select: vi.fn(container => {
    // Create a fake SVG element in the container so event listeners can attach
    if (container && container.querySelector && !container.querySelector('svg')) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      container.appendChild(svg);
    }
    return {
      datum: vi.fn().mockReturnThis(),
      call: vi.fn().mockReturnThis(),
    };
  }),
}));

const otelTrace = transformTraceData(testTrace.data).asOtelTrace();

describe('<TraceFlamegraph />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callbacks.onClick = null;
    callbacks.colorMapper = null;
    callbacks.getName = null;
    callbacks.labelHandler = null;
    callbacks.searchMatch = null;
  });

  it('renders the flamegraph wrapper', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    expect(screen.getByTestId('flamegraph-wrapper')).toBeInTheDocument();
  });

  it('renders empty state when trace is null', () => {
    render(<TraceFlamegraph trace={null} />);
    expect(screen.getByTestId('flamegraph-empty')).toBeInTheDocument();
  });

  it('renders empty state when trace is not an OtelTraceFacade', () => {
    render(<TraceFlamegraph trace={{}} />);
    expect(screen.getByTestId('flamegraph-empty')).toBeInTheDocument();
  });

  it('renders the toolbar with view mode toggle', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
    expect(screen.getByText('Table')).toBeInTheDocument();
    expect(screen.getByText('Both')).toBeInTheDocument();
    expect(screen.getByText('Flamegraph')).toBeInTheDocument();
  });

  it('renders both table and chart in "both" mode (default)', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByTestId('flamegraph-chart')).toBeInTheDocument();
  });

  it('renders table with correct data', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    expect(screen.getAllByText('load-generator').length).toBeGreaterThan(0);
    expect(screen.getByText('OrderVehicle')).toBeInTheDocument();
    expect(screen.getAllByText('ride-sharing-app').length).toBeGreaterThan(0);
    expect(screen.getByText('FindNearestVehicle')).toBeInTheDocument();
  });

  it('search input filters table rows', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    const searchInput = screen.getByTestId('flamegraph-search');
    fireEvent.change(searchInput, { target: { value: 'OrderVehicle' } });
    expect(screen.getByText('OrderVehicle')).toBeInTheDocument();
    expect(screen.queryByText('FindNearestVehicle')).not.toBeInTheDocument();
  });

  it('reset button is disabled when state is clean', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    expect(screen.getByTestId('flamegraph-reset')).toBeDisabled();
  });

  it('reset button becomes enabled after searching', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    const searchInput = screen.getByTestId('flamegraph-search');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    expect(screen.getByTestId('flamegraph-reset')).not.toBeDisabled();
  });

  it('clicking reset clears search query', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    const searchInput = screen.getByTestId('flamegraph-search');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.click(screen.getByTestId('flamegraph-reset'));
    expect(searchInput).toHaveValue('');
  });

  it('calls chart.search when search query changes', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    const searchInput = screen.getByTestId('flamegraph-search');
    fireEvent.change(searchInput, { target: { value: 'load' } });
    expect(mockChart.search).toHaveBeenCalledWith('load');
  });

  it('calls chart.clear when search is emptied', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    const searchInput = screen.getByTestId('flamegraph-search');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    mockChart.clear.mockClear();
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(mockChart.clear).toHaveBeenCalled();
  });

  it('clicking a table row triggers chart.search with row name', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    const row = screen.getByText('OrderVehicle').closest('tr');
    fireEvent.click(row);
    expect(mockChart.search).toHaveBeenCalledWith('load-generator: OrderVehicle');
  });

  it('clicking same table row again deselects and clears search', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    const row = screen.getByText('OrderVehicle').closest('tr');
    fireEvent.click(row);
    mockChart.clear.mockClear();
    fireEvent.click(row);
    expect(mockChart.clear).toHaveBeenCalled();
  });

  it('switching to table-only mode hides chart', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    fireEvent.click(screen.getByText('Table'));
    expect(screen.queryByTestId('flamegraph-chart')).not.toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('switching to flamegraph-only mode hides table', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    fireEvent.click(screen.getByText('Flamegraph'));
    expect(screen.getByTestId('flamegraph-chart')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('reset calls chart.resetZoom and chart.clear', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    const searchInput = screen.getByTestId('flamegraph-search');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    mockChart.resetZoom.mockClear();
    mockChart.clear.mockClear();
    fireEvent.click(screen.getByTestId('flamegraph-reset'));
    expect(mockChart.resetZoom).toHaveBeenCalled();
    expect(mockChart.clear).toHaveBeenCalled();
  });

  it('shows chart caption with help tooltip', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    expect(screen.getByText(/total resource cost/)).toBeInTheDocument();
    expect(screen.getByLabelText('Flamegraph explanation')).toBeInTheDocument();
  });

  it('collapse button is disabled when not zoomed', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    expect(screen.getByTestId('flamegraph-collapse')).toBeDisabled();
  });

  it('search clears selected item', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    // Select a row first
    const row = screen.getByText('OrderVehicle').closest('tr');
    fireEvent.click(row);
    // Now search — should clear selected item
    const searchInput = screen.getByTestId('flamegraph-search');
    mockChart.search.mockClear();
    fireEvent.change(searchInput, { target: { value: 'Bike' } });
    // The search call should use the search query, not the selected item
    expect(mockChart.search).toHaveBeenCalledWith('Bike');
  });

  it('destroys chart on unmount', () => {
    const { unmount } = render(<TraceFlamegraph trace={otelTrace} />);
    unmount();
    expect(mockChart.destroy).toHaveBeenCalled();
  });

  describe('chart callbacks', () => {
    beforeEach(() => {
      render(<TraceFlamegraph trace={otelTrace} />);
    });

    it('getName returns formatted label with percentage and duration', () => {
      const result = callbacks.getName({ data: { name: 'svc: op', value: 500000, duration: 500000 } });
      expect(result).toContain('svc: op');
      expect(result).toMatch(/\d+\.\d+%/);
      expect(result).toContain('500ms');
    });

    it('getName uses duration over value when both present', () => {
      const result = callbacks.getName({ data: { name: 'svc: op', value: 1000000, duration: 500000 } });
      expect(result).toContain('500ms');
    });

    it('getName returns empty for null data', () => {
      expect(callbacks.getName(null)).toBe('');
      expect(callbacks.getName({ data: null })).toBe('');
    });

    it('labelHandler returns formatted label', () => {
      const result = callbacks.labelHandler({ data: { name: 'svc: op', value: 500000, duration: 500000 } });
      expect(result).toContain('svc: op');
    });

    it('labelHandler returns empty for null data', () => {
      expect(callbacks.labelHandler(null)).toBe('');
    });

    it('colorMapper returns highlight color when d.highlight is true', () => {
      expect(
        callbacks.colorMapper({ highlight: true, data: { name: 'svc: op', serviceName: 'svc' } }, '#000')
      ).toBe('#E600E6');
    });

    it('colorMapper returns service color normally', () => {
      const color = callbacks.colorMapper(
        { data: { name: 'load-generator: op', serviceName: 'load-generator' } },
        '#000'
      );
      expect(color).toBeTruthy();
      expect(color).not.toBe('#ccc');
    });

    it('colorMapper returns #ccc for invalid data', () => {
      expect(callbacks.colorMapper({}, '#000')).toBe('#ccc');
      expect(callbacks.colorMapper({ data: {} }, '#000')).toBe('#ccc');
      expect(callbacks.colorMapper({ data: { serviceName: '' } }, '#000')).toBe('#ccc');
    });

    it('searchMatch performs case-insensitive substring matching', () => {
      expect(callbacks.searchMatch({ data: { name: 'Load-Generator: Op' } }, 'load')).toBe(true);
      expect(callbacks.searchMatch({ data: { name: 'Load-Generator: Op' } }, 'LOAD')).toBe(true);
      expect(callbacks.searchMatch({ data: { name: 'Load-Generator: Op' } }, 'xyz')).toBe(false);
    });

    it('searchMatch returns false for empty term or missing data', () => {
      expect(callbacks.searchMatch({ data: { name: 'test' } }, '')).toBe(false);
      expect(callbacks.searchMatch({ data: {} }, 'test')).toBe(false);
      expect(callbacks.searchMatch(null, 'test')).toBe(false);
    });

    it('onClick with non-root sets chartZoomed', () => {
      act(() => {
        callbacks.onClick({ parent: {}, data: { name: 'svc: op' } });
      });
      // Collapse button should be enabled now
      expect(screen.getByTestId('flamegraph-collapse')).not.toBeDisabled();
    });

    it('onClick with root (no parent) clears chartZoomed', () => {
      act(() => {
        callbacks.onClick({ parent: {}, data: { name: 'svc: op' } });
      });
      act(() => {
        callbacks.onClick({ parent: null, data: { name: 'total' } });
      });
      expect(screen.getByTestId('flamegraph-collapse')).toBeDisabled();
    });
  });

  describe('handleCollapseAbove', () => {
    it('collapse button triggers re-render with collapsed root', () => {
      render(<TraceFlamegraph trace={otelTrace} />);
      // Zoom into a node first
      act(() => {
        callbacks.onClick({
          parent: {},
          data: { name: 'load-generator: OrderVehicle', value: 100, duration: 100, children: [] },
        });
      });
      // Click collapse
      fireEvent.click(screen.getByTestId('flamegraph-collapse'));
      // After collapse, the collapse button should be disabled (no longer zoomed)
      expect(screen.getByTestId('flamegraph-collapse')).toBeDisabled();
    });
  });

  describe('SVG event handlers', () => {
    it('contextmenu on a g.frame shows the context menu', async () => {
      const { container } = render(<TraceFlamegraph trace={otelTrace} />);
      const svg = screen.getByTestId('flamegraph-chart').querySelector('svg');
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.classList.add('frame');
      g.setAttribute('name', 'svc: op (50.00%, 500ms)');
      svg.appendChild(g);

      await act(() => {
        g.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 150, clientY: 250 }));
      });
      expect(container.querySelector('.Flamegraph-context-menu')).toBeInTheDocument();
      expect(screen.getByText('Copy function name')).toBeInTheDocument();
      expect(screen.getByText('Highlight similar nodes')).toBeInTheDocument();
    });

    it('contextmenu without g.frame does not show menu', async () => {
      render(<TraceFlamegraph trace={otelTrace} />);
      const svg = screen.getByTestId('flamegraph-chart').querySelector('svg');

      await act(() => {
        svg.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 10 }));
      });
      expect(screen.queryByText('Copy function name')).not.toBeInTheDocument();
    });

    it('Copy function name strips percentage/duration suffix', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });

      render(<TraceFlamegraph trace={otelTrace} />);
      const svg = screen.getByTestId('flamegraph-chart').querySelector('svg');
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.classList.add('frame');
      g.setAttribute('name', 'svc-a: myOp (25.00%, 250ms)');
      svg.appendChild(g);

      await act(() => {
        g.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }));
      });
      fireEvent.click(screen.getByText('Copy function name'));
      expect(writeText).toHaveBeenCalledWith('svc-a: myOp');
    });

    it('Highlight similar nodes sets selectedItem and triggers search', async () => {
      render(<TraceFlamegraph trace={otelTrace} />);
      const svg = screen.getByTestId('flamegraph-chart').querySelector('svg');
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.classList.add('frame');
      g.setAttribute('name', 'svc-a: myOp (25.00%, 250ms)');
      svg.appendChild(g);

      await act(() => {
        g.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }));
      });
      mockChart.search.mockClear();
      fireEvent.click(screen.getByText('Highlight similar nodes'));
      expect(mockChart.search).toHaveBeenCalledWith('svc-a: myOp');
    });

    it('mousemove over g.frame shows tooltip', async () => {
      render(<TraceFlamegraph trace={otelTrace} />);
      const svg = screen.getByTestId('flamegraph-chart').querySelector('svg');
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.classList.add('frame');
      g.__data__ = { data: { name: 'svc: op', value: 500000, duration: 500000, count: 3 } };
      svg.appendChild(g);

      await act(() => {
        g.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 200, clientY: 300 }));
      });
      expect(screen.getByText('svc: op')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('mousemove without g.frame hides tooltip', async () => {
      render(<TraceFlamegraph trace={otelTrace} />);
      const svg = screen.getByTestId('flamegraph-chart').querySelector('svg');
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.classList.add('frame');
      g.__data__ = { data: { name: 'svc: op', value: 100, duration: 100, count: 1 } };
      svg.appendChild(g);

      await act(() => {
        g.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 200, clientY: 300 }));
      });
      expect(screen.getByText('svc: op')).toBeInTheDocument();

      await act(() => {
        svg.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 10, clientY: 10 }));
      });
      expect(screen.queryByText('svc: op')).not.toBeInTheDocument();
    });

    it('mouseleave hides tooltip', async () => {
      render(<TraceFlamegraph trace={otelTrace} />);
      const svg = screen.getByTestId('flamegraph-chart').querySelector('svg');
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.classList.add('frame');
      g.__data__ = { data: { name: 'svc: op', value: 100, duration: 100, count: 1 } };
      svg.appendChild(g);

      await act(() => {
        g.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 200, clientY: 300 }));
      });
      await act(() => {
        svg.dispatchEvent(new Event('mouseleave', { bubbles: false }));
      });
      expect(screen.queryByText('svc: op')).not.toBeInTheDocument();
    });

    it('context menu closes on close handler', async () => {
      render(<TraceFlamegraph trace={otelTrace} />);
      const svg = screen.getByTestId('flamegraph-chart').querySelector('svg');
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.classList.add('frame');
      g.setAttribute('name', 'svc: op');
      svg.appendChild(g);

      await act(() => {
        g.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }));
      });
      expect(screen.getByText('Copy function name')).toBeInTheDocument();
      fireEvent.mouseDown(document);
      expect(screen.queryByText('Copy function name')).not.toBeInTheDocument();
    });
  });

  describe('colorMapper with search active', () => {
    it('returns rgba with 0.3 opacity when search is active', () => {
      render(<TraceFlamegraph trace={otelTrace} />);
      // Trigger a search to set searchActiveRef = true
      const searchInput = screen.getByTestId('flamegraph-search');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      // Now the colorMapper should return faded colors for non-highlighted nodes
      const color = callbacks.colorMapper(
        { data: { name: 'load-generator: op', serviceName: 'load-generator' } },
        '#000'
      );
      expect(color).toMatch(/^rgba\(\d+, \d+, \d+, 0\.3\)$/);
    });

    it('returns highlight color even when search is active', () => {
      render(<TraceFlamegraph trace={otelTrace} />);
      const searchInput = screen.getByTestId('flamegraph-search');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      const color = callbacks.colorMapper(
        { highlight: true, data: { name: 'svc: op', serviceName: 'svc' } },
        '#000'
      );
      expect(color).toBe('#E600E6');
    });
  });
});
