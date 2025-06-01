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
import transformTraceData from '../../../model/transform-trace-data';
import calculateTraceDagEV from './calculateTraceDagEV';
import TraceGraph, { setOnEdgePath } from './TraceGraph';
import testTrace from './testTrace.json';

jest.mock('@jaegertracing/plexus', () => {
  const Digraph = ({ children, ...props }) => (
    <div data-testid="mock-digraph" {...props}>
      {children}
    </div>
  );

  Digraph.propsFactories = {
    classNameIsSmall: () => ({ className: 'is-small' }),
    scaleOpacity: () => ({ opacity: 1 }),
    scaleStrokeOpacity: () => ({ strokeOpacity: 1 }),
  };

  return {
    Digraph,
    LayoutManager: jest.fn().mockImplementation(() => ({
      stopAndRelease: jest.fn(),
    })),
    cacheAs: (key, fn) => fn,
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
  });

  it('may show no traces', () => {
    render(<TraceGraph />);
    expect(screen.getByText('No trace found')).toBeInTheDocument();
  });

  it('toggles nodeMode to time', async () => {
    render(<TraceGraph {...props} />);
    const timeButton = screen.getByRole('button', { name: 'T' });
    await userEvent.click(timeButton);
    expect(timeButton).toHaveClass('TraceGraph--btn-time');
  });

  it('validates button nodeMode change click', async () => {
    render(<TraceGraph {...props} />);
    const serviceButton = screen.getByRole('button', { name: 'S' });
    await userEvent.click(serviceButton);
    expect(serviceButton).toHaveClass('TraceGraph--btn-service');

    const timeButton = screen.getByRole('button', { name: 'T' });
    await userEvent.click(timeButton);
    expect(timeButton).toHaveClass('TraceGraph--btn-time');

    const selftimeButton = screen.getByRole('button', { name: 'ST' });
    await userEvent.click(selftimeButton);
    expect(selftimeButton).toHaveClass('TraceGraph--btn-selftime');
  });

  it('shows help', async () => {
    render(<TraceGraph {...props} />);
    const helpIcon = screen.getByTestId('help-icon');
    await userEvent.click(helpIcon);
    expect(screen.getByText(/self-time = 10ms - 2 \* 4ms = 2ms/i)).toBeInTheDocument();
  });

  it('hides help', async () => {
    render(<TraceGraph {...props} />);
    const helpIcon = screen.getByTestId('help-icon');
    await userEvent.click(helpIcon);
    const closeButton = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeButton);
    expect(screen.queryByText(/self time/i)).not.toBeInTheDocument();
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
    const serviceButton = screen.getByRole('button', { name: 'S' });
    expect(serviceButton).toHaveClass('TraceGraph--btn-service');
  });

  it('updates mode state when clicking different mode buttons', async () => {
    render(<TraceGraph {...props} />);

    const timeButton = screen.getByRole('button', { name: 'T' });
    await userEvent.click(timeButton);
    expect(timeButton).toHaveClass('TraceGraph--btn-time');

    const selftimeButton = screen.getByRole('button', { name: 'ST' });
    await userEvent.click(selftimeButton);
    expect(selftimeButton).toHaveClass('TraceGraph--btn-selftime');
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
  });
});
