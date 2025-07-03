// Copyright (c) 2018 The Jaeger Authors.
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

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayoutManager } from '@jaegertracing/plexus';
import transformTraceData from '../../../model/transform-trace-data';
import calculateTraceDagEV from './calculateTraceDagEV';
import TraceGraph, { setOnEdgePath } from './TraceGraph';
import { MODE_SERVICE, MODE_TIME, MODE_SELFTIME } from './OpNode';
import testTrace from './testTrace.json';

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
    stopAndRelease: jest.fn(),
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
const ev = calculateTraceDagEV(transformedTrace);

describe('<TraceGraph>', () => {
  let props;

  beforeEach(() => {
    props = {
      headerHeight: 60,
      ev,
    };
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

  it('switches node mode when clicking mode buttons - with state verification', async () => {
    const setStateSpy = jest.spyOn(TraceGraph.prototype, 'setState');
    render(<TraceGraph {...props} />);

    // Initial mode should be service
    expect(screen.getByTestId('mock-digraph')).toHaveAttribute('data-mode', MODE_SERVICE);
    const timeButton = screen.getByRole('button', { name: 'T' });
    const selftimeButton = screen.getByRole('button', { name: 'ST' });
    const serviceButton = screen.getByRole('button', { name: 'S' });

    // Switch to time
    await userEvent.click(timeButton);
    expect(setStateSpy).toHaveBeenCalledWith({ mode: MODE_TIME }); // Verify state change
    expect(screen.getByTestId('mock-digraph')).toHaveAttribute('data-mode', MODE_TIME);

    // Switch to selftime
    await userEvent.click(selftimeButton);
    expect(setStateSpy).toHaveBeenCalledWith({ mode: MODE_SELFTIME });
    expect(screen.getByTestId('mock-digraph')).toHaveAttribute('data-mode', MODE_SELFTIME);

    // Switch back to service
    await userEvent.click(serviceButton);
    expect(setStateSpy).toHaveBeenCalledWith({ mode: MODE_SERVICE });
    expect(screen.getByTestId('mock-digraph')).toHaveAttribute('data-mode', MODE_SERVICE);

    setStateSpy.mockRestore();
  });

  it('shows help', async () => {
    render(<TraceGraph {...props} />);
    const helpIcon = screen.getByTestId('help-icon');
    await userEvent.click(helpIcon);

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
    expect(screen.getByText('FollowsFrom')).toBeInTheDocument();

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

  it('hides help', async () => {
    render(<TraceGraph {...props} />);
    const helpIcon = screen.getByTestId('help-icon');
    await userEvent.click(helpIcon);
    const closeButton = screen.getByRole('button', { name: 'Close' });
    await userEvent.click(closeButton);
    expect(screen.queryByTestId('help-content')).not.toBeInTheDocument();
  });

  it('uses stroke-dash edges for followsFrom', () => {
    const edge = { from: 0, to: 1, followsFrom: true };
    expect(setOnEdgePath(edge)).toEqual({ strokeDasharray: 4 });

    const edge2 = { from: 0, to: 1, followsFrom: false };
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
      })
    );
  });
});
