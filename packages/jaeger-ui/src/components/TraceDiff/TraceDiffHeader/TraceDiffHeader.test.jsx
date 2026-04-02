// Copyright (c) 2019 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

import TraceDiffHeader from './TraceDiffHeader';
import { fetchedState } from '../../../constants';

jest.mock('./CohortTable', () => {
  return function MockCohortTable({ selectTrace }) {
    return (
      <div data-testid="cohort-table">
        <button type="button" onClick={() => selectTrace('test-id')}>
          Select
        </button>
      </div>
    );
  };
});

jest.mock('./TraceHeader', () => () => <div data-testid="trace-header">TraceHeader</div>);

jest.mock('./TraceIdInput', () => {
  return function MockTraceIdInput({ selectTrace }) {
    return (
      <div data-testid="trace-id-input">
        <button type="button" onClick={() => selectTrace('test-id')}>
          Input
        </button>
      </div>
    );
  };
});

describe('TraceDiffHeader', () => {
  const cohort = [
    {
      data: {
        duration: 0,
        // purposefully missing spans
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

  const diffSetA = jest.fn();
  const diffSetB = jest.fn();
  const props = { a: cohort[1], b: cohort[2], cohort, diffSetA, diffSetB };

  beforeEach(() => {
    diffSetA.mockReset();
    diffSetB.mockReset();
  });

  const getVisibleTables = () =>
    screen
      .queryAllByTestId('cohort-table')
      .filter(el => !el.closest('.TraceDiffHeader--popover')?.classList.contains('ant-popover-hidden'));

  it('renders as expected', () => {
    render(<TraceDiffHeader {...props} />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByTestId('vs-separator')).toBeInTheDocument();
    expect(screen.getByText('VS')).toBeInTheDocument();
    expect(screen.getAllByTestId('trace-header')).toHaveLength(2);
  });

  it('handles trace without spans', () => {
    const { rerender } = render(<TraceDiffHeader {...props} />);
    rerender(<TraceDiffHeader {...props} a={cohort[0]} />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getAllByTestId('trace-header')).toHaveLength(2);
  });

  it('handles absent a', () => {
    render(<TraceDiffHeader {...props} a={null} />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getAllByTestId('trace-header')).toHaveLength(2);
  });

  it('handles absent b', () => {
    render(<TraceDiffHeader {...props} b={null} />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getAllByTestId('trace-header')).toHaveLength(2);
  });

  it('handles absent a & b', () => {
    render(<TraceDiffHeader {...props} a={null} b={null} />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getAllByTestId('trace-header')).toHaveLength(2);
  });

  it('manages visibility correctly', async () => {
    const user = userEvent.setup();
    render(<TraceDiffHeader {...props} />);

    expect(getVisibleTables()).toHaveLength(0);

    const [sectionA, sectionB] = screen
      .getAllByTestId('trace-header')
      .map(h => h.closest('.TraceDiffHeader--traceSection'));

    await user.click(sectionA);
    await waitFor(() => expect(getVisibleTables()).toHaveLength(1));

    await user.click(sectionB);
    await waitFor(() => expect(getVisibleTables()).toHaveLength(1));

    await user.click(sectionB);
    await waitFor(() => expect(getVisibleTables()).toHaveLength(0));

    await user.click(document.body);
    await waitFor(() => expect(getVisibleTables()).toHaveLength(0));
  });

  describe('bound functions to set a & b and passes them to Popover JSX props correctly', () => {
    const shouldCall = { a: diffSetA, b: diffSetB };
    const shouldNotCall = { a: diffSetB, b: diffSetA };

    ['a', 'b'].forEach(aOrB => {
      ['title', 'content'].forEach(popoverSection => {
        it(`sets trace ${aOrB} from popover ${popoverSection}`, async () => {
          const user = userEvent.setup();
          render(<TraceDiffHeader {...props} />);

          const traceSections = screen
            .getAllByTestId('trace-header')
            .map(h => h.closest('.TraceDiffHeader--traceSection'));
          const sectionIndex = aOrB === 'a' ? 0 : 1;
          await user.click(traceSections[sectionIndex]);
          await waitFor(() => expect(getVisibleTables()).toHaveLength(1));

          if (popoverSection === 'title') {
            const btn = screen.getByTestId('trace-id-input').querySelector('button');
            await user.click(btn);
          } else {
            const visibleTable = getVisibleTables()[0];
            const btn = visibleTable.querySelector('button');
            await user.click(btn);
          }

          expect(shouldCall[aOrB]).toHaveBeenCalledWith('test-id');
          expect(shouldNotCall[aOrB]).not.toHaveBeenCalled();

          await waitFor(() => expect(getVisibleTables()).toHaveLength(0));
        });
      });
    });
  });
});
