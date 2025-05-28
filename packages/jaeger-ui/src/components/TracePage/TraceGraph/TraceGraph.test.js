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
    expect(screen.getAllByRole('button').length).toBe(3);
  });

  it('may show no traces', () => {
    render(<TraceGraph />);
    expect(screen.getByText('No trace found')).toBeInTheDocument();
  });

  it('toggles nodeMode to time', async () => {
    render(<TraceGraph {...props} />);
    const timeButton = screen.getByRole('button', { name: /time/i });
    await userEvent.click(timeButton);
    expect(timeButton).toHaveClass('TraceGraph--btn-time');
  });

  it('validates button nodeMode change click', async () => {
    render(<TraceGraph {...props} />);
    const serviceButton = screen.getByRole('button', { name: /service/i });
    await userEvent.click(serviceButton);
    expect(serviceButton).toHaveClass('TraceGraph--btn-service');

    const timeButton = screen.getByRole('button', { name: /time/i });
    await userEvent.click(timeButton);
    expect(timeButton).toHaveClass('TraceGraph--btn-time');

    const selftimeButton = screen.getByRole('button', { name: /selftime/i });
    await userEvent.click(selftimeButton);
    expect(selftimeButton).toHaveClass('TraceGraph--btn-selftime');
  });

  it('shows help', async () => {
    render(<TraceGraph {...props} />);
    const helpButton = screen.getByRole('button', { name: /help/i });
    await userEvent.click(helpButton);
    expect(screen.getByText(/self time/i)).toBeInTheDocument();
  });

  it('hides help', async () => {
    render(<TraceGraph {...props} />);
    const helpButton = screen.getByRole('button', { name: /help/i });
    await userEvent.click(helpButton);
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
});
