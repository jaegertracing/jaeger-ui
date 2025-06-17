// Copyright (c) 2019 The Jaeger Authors.
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
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TraceDiffHeader from './TraceDiffHeader';
import { fetchedState } from '../../../constants';

// Mocking TraceHeader to ensure stable test IDs are present
// This helps in simplifying DOM queries.
jest.mock('./TraceHeader', () => {
  return jest.fn(props => (
    <div data-testid="TraceDiffHeader--traceHeader">
      <span data-testid="traceName">{props.traceName || 'Select a Trace…'}</span>
      <span data-testid="TraceDiffHeader--traceAttr--spans">{props.totalSpans}</span>
      <button type="button" data-testid="TraceDiffHeader--traceTitleChevron" />
    </div>
  ));
});

// Mocking CohortTable to allow interaction and verification
jest.mock('./CohortTable', () => {
  return jest.fn(({ cohort, selectTrace, selection }) => (
    <div>
      <h1>Service & Operation</h1>
      <table>
        <tbody>
          {cohort.map(trace => (
            <tr key={trace.id} onClick={() => selectTrace(trace.id)}>
              <td>{trace.data.traceName}</td>
              <td>{selection[trace.id]?.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ));
});

describe('TraceDiffHeader', () => {
  const cohort = [
    {
      data: {
        duration: 0,
        startTime: 0,
        traceName: 'cohort-trace-name-0',
      },
      error: 'error 0',
      id: 'cohort-id-0',
      state: fetchedState.ERROR,
    },
    {
      data: {
        duration: 100,
        spans: [{ spanID: 'trace-1-span-0' }],
        startTime: 100,
        traceName: 'cohort-trace-name-1',
      },
      error: 'error 1',
      id: 'cohort-id-1',
      state: fetchedState.DONE,
    },
    {
      data: {
        duration: 200,
        spans: [{ spanID: 'trace-2-span-1' }, { spanID: 'trace-2-span-2' }],
        startTime: 200,
        traceName: 'cohort-trace-name-2',
      },
      error: 'error 2',
      id: 'cohort-id-2',
      state: fetchedState.DONE,
    },
    {
      data: {
        duration: 300,
        spans: [{ spanID: 'trace-3-span-1' }, { spanID: 'trace-3-span-2' }, { spanID: 'trace-3-span-3' }],
        startTime: 300,
        traceName: 'cohort-trace-name-3',
      },
      error: 'error 3',
      id: 'cohort-id-3',
      state: fetchedState.DONE,
    },
  ];
  let diffSetA;
  let diffSetB;
  let props;

  beforeEach(() => {
    diffSetA = jest.fn();
    diffSetB = jest.fn();
    props = {
      a: cohort[1],
      b: cohort[2],
      cohort,
      diffSetA,
      diffSetB,
    };
  });

  it('renders UI elements and trace names correctly', () => {
    render(<TraceDiffHeader {...props} />);

    expect(screen.getByText('A', { selector: 'h1' })).toBeInTheDocument();
    expect(screen.getByText('B', { selector: 'h1' })).toBeInTheDocument();
    expect(screen.getByText('VS')).toBeInTheDocument();

    const traceHeaders = screen.getAllByTestId('TraceDiffHeader--traceHeader');
    expect(within(traceHeaders[0]).getByText('cohort-trace-name-1')).toBeInTheDocument();
    expect(within(traceHeaders[1]).getByText('cohort-trace-name-2')).toBeInTheDocument();
  });

  it('handles a trace without spans array', () => {
    const traceWithoutSpans = {
      data: {
        duration: 0,
        startTime: 0,
        traceName: 'trace-without-spans',
        // purposefully missing spans array
      },
      error: null,
      id: 'trace-without-spans-id',
      state: fetchedState.DONE,
    };

    render(<TraceDiffHeader {...props} a={traceWithoutSpans} />);
    const traceHeaders = screen.getAllByTestId('TraceDiffHeader--traceHeader');
    const headerA = traceHeaders[0];

    expect(within(headerA).getByText('trace-without-spans')).toBeInTheDocument();
    // The mocked component will render an empty string for totalSpans if it's undefined
    expect(within(headerA).getByTestId('TraceDiffHeader--traceAttr--spans')).toBeEmptyDOMElement();
  });

  it('handles absent a', () => {
    render(<TraceDiffHeader {...props} a={null} />);
    const traceHeaders = screen.getAllByTestId('TraceDiffHeader--traceHeader');
    expect(within(traceHeaders[0]).getByText('Select a Trace…')).toBeInTheDocument();
    expect(within(traceHeaders[1]).getByText('cohort-trace-name-2')).toBeInTheDocument();
  });

  it('handles absent b', () => {
    render(<TraceDiffHeader {...props} b={null} />);
    const traceHeaders = screen.getAllByTestId('TraceDiffHeader--traceHeader');
    expect(within(traceHeaders[0]).getByText('cohort-trace-name-1')).toBeInTheDocument();
    expect(within(traceHeaders[1]).getByText('Select a Trace…')).toBeInTheDocument();
  });

  it('handles absent a & b', () => {
    render(<TraceDiffHeader {...props} a={null} b={null} />);
    const placeholders = screen.getAllByText('Select a Trace…');
    expect(placeholders).toHaveLength(2);
  });

  it('toggles popovers with mutual exclusion', async () => {
    const user = userEvent.setup();
    render(<TraceDiffHeader {...props} />);
    const chevrons = screen.getAllByTestId('TraceDiffHeader--traceTitleChevron');

    // Initially, no popover is visible
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // 1. Open popover A
    await user.click(chevrons[0]);
    await waitFor(() => {
      const popoverA = screen.getByRole('tooltip');
      expect(popoverA).toBeVisible();
      // Verify it's popover A by checking for the 'A' selection label
      const traceARow = within(popoverA).getByText('cohort-trace-name-1').closest('tr');
      expect(within(traceARow).getByText('A')).toBeInTheDocument();
    });

    // 2. Open popover B, which should close popover A
    await user.click(chevrons[1]);
    
    // First wait for popover A to disappear
    await waitFor(() => {
      expect(screen.queryByText('cohort-trace-name-1')).not.toBeInTheDocument();
    });

    // Then wait for popover B to appear and verify its contents
    await waitFor(() => {
      const popoverB = screen.getByRole('tooltip');
      expect(popoverB).toBeVisible();
      const traceBRow = within(popoverB).getByText('cohort-trace-name-2').closest('tr');
      expect(within(traceBRow).getByText('B')).toBeInTheDocument();
    });

    // 3. Close popover B
    await user.click(chevrons[1]);
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  it('calls diffSetA or diffSetB when a new trace is selected via popover', async () => {
    const user = userEvent.setup();
    render(<TraceDiffHeader {...props} />);
    const chevrons = screen.getAllByTestId('TraceDiffHeader--traceTitleChevron');

    // Test selection for A
    await user.click(chevrons[0]);
    const popoverA = await screen.findByRole('tooltip');
    await user.click(within(popoverA).getByText('cohort-trace-name-3'));

    expect(diffSetA).toHaveBeenCalledWith('cohort-id-3');
    expect(diffSetA).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());

    // Test selection for B
    await user.click(chevrons[1]);
    const popoverB = await screen.findByRole('tooltip');
    await user.click(within(popoverB).getByText('cohort-trace-name-0'));

    expect(diffSetB).toHaveBeenCalledWith('cohort-id-0');
    expect(diffSetB).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });
});
