// Copyright (c) 2018 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayoutManager } from '@jaegertracing/plexus';
import transformTraceData from '../../../model/transform-trace-data';
import calculateTraceDagEV from './calculateTraceDagEV';
import TraceGraph, { setOnEdgePath } from './TraceGraph';
import { MODE_SERVICE, MODE_TIME, MODE_SELFTIME } from './OpNode';
import testTrace from './testTrace.json';

// Mock LayoutManager instance to track cleanup calls
const mockStopAndRelease = jest.fn();

jest.mock('@jaegertracing/plexus', () => {
  const DEFAULT_MODE = 'service';

  const MockDigraph = ({ children, layers, ...props }) => {
    const nodeLayer = layers.find(layer => layer.key === 'nodes');
    const mode = nodeLayer?.renderNode?.toString().includes('trace-graph/nodes/render/')
      ? nodeLayer.renderNode.toString().match(/trace-graph\/nodes\/render\/([^)]+)/)[1]
      : DEFAULT_MODE;

    const domProps = Object.entries(props).reduce((acc, [key, value]) => {
      if (typeof value === 'boolean') {
        acc[key] = value.toString();
      } else if (typeof value === 'object' || typeof value === 'function') {
        return acc;
      } else {
        acc[key] = value;
      }
      return acc;
    }, {});

    return (
      <div data-testid="mock-digraph" data-mode={mode} {...domProps}>
        {children}
      </div>
    );
  };

  MockDigraph.propsFactories = {
    classNameIsSmall: () => ({ className: 'is-small' }),
    scaleOpacity: () => ({ opacity: 1 }),
    scaleStrokeOpacity: () => ({ strokeOpacity: 1 }),
  };

  const MockLayoutManager = jest.fn().mockImplementation(() => ({
    stopAndRelease: mockStopAndRelease,
  }));

  const mockCacheAs = (key, fn) => {
    const cachedFn = (...args) => fn(...args);
    Object.defineProperty(cachedFn, 'toString', {
      value: () => key,
      configurable: true,
    });
    return cachedFn;
  };

  return {
    Digraph: MockDigraph,
    LayoutManager: MockLayoutManager,
    cacheAs: mockCacheAs,
  };
});

const transformedTrace = transformTraceData(testTrace);
const ev = calculateTraceDagEV(transformedTrace.asOtelTrace());

describe('<TraceGraph>', () => {
  let props;

  beforeEach(() => {
    props = {
      headerHeight: 60,
      ev,
      uiFind: null,
      uiFindVertexKeys: null,
      useOtelTerms: false,
    };
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not explode', () => {
    render(<TraceGraph {...props} />);
    expect(screen.getByTestId('mock-digraph')).toBeInTheDocument();
    expect(document.querySelectorAll('.TraceGraph--menu').length).toBe(1);
    expect(screen.getAllByRole('button').length).toBe(3);
  });

  it('may show no traces', () => {
    render(<TraceGraph />);
    expect(screen.getByText('No trace found')).toBeInTheDocument();
  });

  it('switches node mode when clicking mode buttons', async () => {
    const user = userEvent.setup();
    render(<TraceGraph {...props} />);

    // Initial mode should be service
    expect(screen.getByTestId('mock-digraph')).toHaveAttribute('data-mode', MODE_SERVICE);

    const timeButton = screen.getByRole('button', { name: 'T' });
    const selftimeButton = screen.getByRole('button', { name: 'ST' });
    const serviceButton = screen.getByRole('button', { name: 'S' });

    // Switch to time mode
    await user.click(timeButton);
    expect(screen.getByTestId('mock-digraph')).toHaveAttribute('data-mode', MODE_TIME);

    // Switch to selftime mode
    await user.click(selftimeButton);
    expect(screen.getByTestId('mock-digraph')).toHaveAttribute('data-mode', MODE_SELFTIME);

    // Switch back to service mode
    await user.click(serviceButton);
    expect(screen.getByTestId('mock-digraph')).toHaveAttribute('data-mode', MODE_SERVICE);
  });

  it('shows help when help icon is clicked', async () => {
    const user = userEvent.setup();
    render(<TraceGraph {...props} />);

    // Help content should not be visible initially
    expect(screen.queryByTestId('help-content')).not.toBeInTheDocument();

    const helpIcon = screen.getByTestId('help-icon');
    await user.click(helpIcon);

    // Help content should now be visible
    expect(screen.getByTestId('help-content')).toBeInTheDocument();

    // Verify help table structure
    const tables = screen.getAllByRole('table');
    const helpTable = tables.find(table => table.classList.contains('OpNode--legendNode'));
    expect(helpTable).toHaveClass('OpNode', 'OpNode--legendNode');

    // Verify table headers
    expect(screen.getByText('Count / Error')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Operation')).toBeInTheDocument();
    const selfTimeCells = screen.getAllByText('Self time');
    expect(selfTimeCells).toHaveLength(2); // One in table header, one in explanation

    // Verify mode descriptions
    const modeTable = tables.find(table => !table.classList.contains('OpNode--legendNode'));
    expect(modeTable).toBeInTheDocument();

    // Verify service mode
    const serviceTexts = screen.getAllByText('Service');
    expect(serviceTexts).toHaveLength(2); // One in table header, one in mode description
    expect(screen.getByText('Colored by service')).toBeInTheDocument();

    // Verify time mode
    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.getByText('Colored by total time')).toBeInTheDocument();

    // Verify selftime mode
    expect(screen.getByText('Selftime')).toBeInTheDocument();
    expect(screen.getByText('Colored by self time (*)')).toBeInTheDocument();

    // Verify edge type explanations
    expect(screen.getByText('ChildOf')).toBeInTheDocument();
    expect(screen.getByText('Non-Blocking')).toBeInTheDocument();

    // Verify self time explanation
    const helpContent = screen.getByTestId('help-content');
    const selfTimeExplanation = helpContent.querySelector('div:last-child');
    expect(selfTimeExplanation).toHaveTextContent(
      '(*) Self time is the total time spent in a span when it was not waiting on children'
    );
    expect(selfTimeExplanation).toHaveTextContent(
      'a 10ms span with two 4ms non-overlapping children would have self-time = 10ms - 2 * 4ms = 2ms'
    );
  });

  it('hides help when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<TraceGraph {...props} />);

    const helpIcon = screen.getByTestId('help-icon');
    await user.click(helpIcon);

    // Help should be visible
    expect(screen.getByTestId('help-content')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: 'Close' });
    await user.click(closeButton);

    // Help should be hidden
    expect(screen.queryByTestId('help-content')).not.toBeInTheDocument();
  });

  it('toggles help visibility when clicking help icon multiple times', async () => {
    const user = userEvent.setup();
    render(<TraceGraph {...props} />);

    const helpIcon = screen.getByTestId('help-icon');

    // First click - show help
    await user.click(helpIcon);
    expect(screen.getByTestId('help-content')).toBeInTheDocument();

    // Close help
    const closeButton = screen.getByRole('button', { name: 'Close' });
    await user.click(closeButton);
    expect(screen.queryByTestId('help-content')).not.toBeInTheDocument();

    // Second click - show help again
    await user.click(helpIcon);
    expect(screen.getByTestId('help-content')).toBeInTheDocument();
  });

  it('uses stroke-dash edges for isNonBlocking', () => {
    const edge = { from: 0, to: 1, isNonBlocking: true };
    expect(setOnEdgePath(edge)).toEqual({ strokeDasharray: 4 });

    const edge2 = { from: 0, to: 1, isNonBlocking: false };
    expect(setOnEdgePath(edge2)).toEqual({});
  });

  it('handles uiFind mode correctly', () => {
    const propsWithUiFind = {
      ...props,
      uiFind: 'test-service',
      uiFindVertexKeys: new Set(['key1', 'key2']),
    };
    render(<TraceGraph {...propsWithUiFind} />);
    const wrapper = screen.getByTestId('mock-digraph').parentElement;
    expect(wrapper).toHaveClass('is-uiFind-mode');
  });

  it('does not apply uiFind class when uiFind is not provided', () => {
    render(<TraceGraph {...props} />);
    const wrapper = screen.getByTestId('mock-digraph').parentElement;
    expect(wrapper).not.toHaveClass('is-uiFind-mode');
  });

  it('initializes with correct default mode', () => {
    render(<TraceGraph {...props} />);
    expect(screen.getByTestId('mock-digraph')).toHaveAttribute('data-mode', MODE_SERVICE);
  });

  it('renders experimental link with correct attributes', () => {
    render(<TraceGraph {...props} />);
    const experimentalLink = screen.getByText('Experimental');
    expect(experimentalLink).toHaveAttribute('href', 'https://github.com/jaegertracing/jaeger-ui/issues/293');
    expect(experimentalLink).toHaveAttribute('target', '_blank');
    expect(experimentalLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('handles layout manager initialization', () => {
    const propsWithConfig = {
      ...props,
      traceGraphConfig: {
        layoutManagerMemory: 1024,
      },
    };
    render(<TraceGraph {...propsWithConfig} />);
    expect(screen.getByTestId('mock-digraph')).toBeInTheDocument();
    expect(LayoutManager).toHaveBeenCalledWith(
      expect.objectContaining({
        totalMemory: 1024,
        useDotEdges: true,
        splines: 'polyline',
      })
    );
  });

  it('handles layout manager initialization without config', () => {
    render(<TraceGraph {...props} />);
    expect(screen.getByTestId('mock-digraph')).toBeInTheDocument();
    expect(LayoutManager).toHaveBeenCalledWith(
      expect.objectContaining({
        totalMemory: undefined,
        useDotEdges: true,
        splines: 'polyline',
      })
    );
  });

  it('cleans up layout manager on unmount', () => {
    const { unmount } = render(<TraceGraph {...props} />);

    // LayoutManager should be initialized
    expect(LayoutManager).toHaveBeenCalled();

    // Unmount component
    unmount();

    // stopAndRelease should be called on cleanup
    expect(mockStopAndRelease).toHaveBeenCalled();
  });

  it('uses default prop value for ev when not provided', () => {
    render(<TraceGraph headerHeight={60} uiFind={null} uiFindVertexKeys={null} useOtelTerms={false} />);
    expect(screen.getByText('No trace found')).toBeInTheDocument();
  });

  it('renders all three mode buttons', () => {
    render(<TraceGraph {...props} />);

    expect(screen.getByRole('button', { name: 'S' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'T' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ST' })).toBeInTheDocument();
  });

  it('applies correct styling based on headerHeight prop', () => {
    const customHeaderHeight = 100;
    const customProps = {
      ...props,
      headerHeight: customHeaderHeight,
    };

    render(<TraceGraph {...customProps} />);
    const wrapper = screen.getByTestId('mock-digraph').parentElement;

    // paddingTop should be headerHeight + 47
    expect(wrapper).toHaveStyle({ paddingTop: `${customHeaderHeight + 47}px` });
  });

  it('maintains mode state across re-renders', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<TraceGraph {...props} />);

    // Switch to time mode
    const timeButton = screen.getByRole('button', { name: 'T' });
    await user.click(timeButton);
    expect(screen.getByTestId('mock-digraph')).toHaveAttribute('data-mode', MODE_TIME);

    // Re-render with updated props (but mode should stay)
    const updatedProps = { ...props, headerHeight: 80 };
    rerender(<TraceGraph {...updatedProps} />);

    // Mode should still be TIME after re-render
    expect(screen.getByTestId('mock-digraph')).toHaveAttribute('data-mode', MODE_TIME);
  });

  it('passes correct layers configuration to Digraph', () => {
    render(<TraceGraph {...props} />);

    // Verify the component renders which means layers are configured correctly
    expect(screen.getByTestId('mock-digraph')).toBeInTheDocument();

    // The mock Digraph component receives and processes the layers prop
    // If layers were incorrect, the mock would fail or not render properly
  });

  it('updates rendered mode when switching between all three modes', async () => {
    const user = userEvent.setup();
    render(<TraceGraph {...props} />);

    const serviceButton = screen.getByRole('button', { name: 'S' });
    const timeButton = screen.getByRole('button', { name: 'T' });
    const selftimeButton = screen.getByRole('button', { name: 'ST' });

    // Start with service (default)
    expect(screen.getByTestId('mock-digraph')).toHaveAttribute('data-mode', MODE_SERVICE);

    // Go through all modes in sequence
    await user.click(timeButton);
    expect(screen.getByTestId('mock-digraph')).toHaveAttribute('data-mode', MODE_TIME);

    await user.click(selftimeButton);
    expect(screen.getByTestId('mock-digraph')).toHaveAttribute('data-mode', MODE_SELFTIME);

    await user.click(serviceButton);
    expect(screen.getByTestId('mock-digraph')).toHaveAttribute('data-mode', MODE_SERVICE);

    // Go backwards through modes
    await user.click(selftimeButton);
    expect(screen.getByTestId('mock-digraph')).toHaveAttribute('data-mode', MODE_SELFTIME);

    await user.click(timeButton);
    expect(screen.getByTestId('mock-digraph')).toHaveAttribute('data-mode', MODE_TIME);
  });

  it('handles useOtelTerms prop correctly', () => {
    const propsWithOtel = {
      ...props,
      useOtelTerms: true,
    };

    render(<TraceGraph {...propsWithOtel} />);
    expect(screen.getByTestId('mock-digraph')).toBeInTheDocument();
  });
});
