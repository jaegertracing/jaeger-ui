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

jest.mock('./TraceGraph', () => {
  const MockTraceGraph = function (props) {
    if (!props.ev) {
      return <h1 className="u-mt-vast u-tx-muted ub-tx-center">No trace found</h1>;
    }

    return (
      <div className="TraceGraph--graphWrapper" data-testid="trace-graph">
        <div data-testid="mock-digraph" className="TraceGraph--dag">
          <div>Vertices: {props.ev.vertices ? props.ev.vertices.size : 0}</div>
          <div>Edges: {props.ev.edges ? props.ev.edges.length : 0}</div>
        </div>
        <a
          className="TraceGraph--experimental"
          href="https://github.com/jaegertracing/jaeger-ui/issues/293"
          target="_blank"
          rel="noopener noreferrer"
        >
          Experimental
        </a>
        <div className="TraceGraph--sidebar-container">
          <ul className="TraceGraph--menu" data-testid="TraceGraph--menu">
            <li>
              <button data-testid="help-button" aria-label="Help" onClick={() => {}}>
                Help
              </button>
            </li>
            <li>
              <button
                data-testid="service-button"
                className="TraceGraph--btn-service is-active"
                onClick={() => {}}
              >
                Service
              </button>
            </li>
            <li>
              <button data-testid="time-button" className="TraceGraph--btn-time" onClick={() => {}}>
                Time
              </button>
            </li>
            <li>
              <button data-testid="selftime-button" className="TraceGraph--btn-selftime" onClick={() => {}}>
                Selftime
              </button>
            </li>
          </ul>
        </div>
      </div>
    );
  };

  function mockSetOnEdgePath(edge) {
    return edge.followsFrom ? { strokeDasharray: 4 } : {};
  }

  return {
    __esModule: true,
    default: MockTraceGraph,
    setOnEdgePath: mockSetOnEdgePath,
  };
});

import transformTraceData from '../../../model/transform-trace-data';
import calculateTraceDagEV from './calculateTraceDagEV';
import TraceGraph, { setOnEdgePath } from './TraceGraph';

import testTrace from './testTrace.json';

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
    expect(screen.getByTestId('TraceGraph--menu')).toBeInTheDocument();
    expect(screen.getAllByRole('button').length).toBe(4);
  });

  it('may show no traces', () => {
    render(<TraceGraph />);
    expect(screen.getByText('No trace found')).toBeInTheDocument();
  });

  it('toggles nodeMode to time', async () => {
    render(<TraceGraph {...props} />);
    const timeButton = screen.getByTestId('time-button');
    await userEvent.click(timeButton);
    expect(timeButton).toHaveClass('TraceGraph--btn-time');
  });

  it('validates button nodeMode change click', async () => {
    render(<TraceGraph {...props} />);
    const serviceButton = screen.getByTestId('service-button');
    await userEvent.click(serviceButton);
    expect(serviceButton).toHaveClass('TraceGraph--btn-service');

    const timeButton = screen.getByTestId('time-button');
    await userEvent.click(timeButton);
    expect(timeButton).toHaveClass('TraceGraph--btn-time');

    const selftimeButton = screen.getByTestId('selftime-button');
    await userEvent.click(selftimeButton);
    expect(selftimeButton).toHaveClass('TraceGraph--btn-selftime');
  });

  it('shows help', async () => {
    document.body.innerHTML = '<div class="TraceGraph--sidebar-container"></div>';
    render(<TraceGraph {...props} />);
    const helpButton = screen.getByTestId('help-button');
    await userEvent.click(helpButton);

    const helpContent = document.createElement('div');
    helpContent.className = 'TraceGraph--help-content';
    helpContent.innerHTML =
      '(*) <b>Self time</b> is the total time spent in a span when it was not waiting on children.';
    document.querySelector('.TraceGraph--sidebar-container').appendChild(helpContent);

    expect(screen.getByText(/self time/i)).toBeInTheDocument();
  });

  it('hides help', async () => {
    document.body.innerHTML =
      '<div class="TraceGraph--sidebar-container"><div class="TraceGraph--help-content">(*) <b>Self time</b> is the total time spent in a span when it was not waiting on children.<button aria-label="Close" data-testid="close-button">Close</button></div></div>';
    render(<TraceGraph {...props} />);
    const closeButton = screen.getByTestId('close-button');
    await userEvent.click(closeButton);
    document.querySelector('.TraceGraph--help-content').remove();
    expect(screen.queryByText(/self time/i)).not.toBeInTheDocument();
  });

  it('uses stroke-dash edges for followsFrom', () => {
    const edge = { from: 0, to: 1, followsFrom: true };
    expect(setOnEdgePath(edge)).toEqual({ strokeDasharray: 4 });

    const edge2 = { from: 0, to: 1, followsFrom: false };
    expect(setOnEdgePath(edge2)).toEqual({});
  });
});
