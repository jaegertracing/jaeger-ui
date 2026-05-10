// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import DiffSelection from './DiffSelection';
import { fetchedState } from '../../../constants';

describe('DiffSelection', () => {
  const toggleComparison = () => {};
  const traces = [
    {
      id: 'trace-id-0',
      data: {
        duration: 0,
        traceName: 'trace-name-0',
      },
      error: new Error('error-0'),
      state: fetchedState.DONE,
    },
    {
      id: 'trace-id-1',
      // deliberately missing data to test default
      error: new Error('error-1'),
      state: fetchedState.DONE,
    },
    {
      id: 'trace-id-2',
      // deliberately missing data to test default
      error: new Error('error-2'),
      state: fetchedState.ERROR,
    },
  ];

  it('renders a trace as expected', () => {
    render(
      <MemoryRouter>
        <DiffSelection traces={traces.slice(0, 1)} toggleComparison={toggleComparison} />
      </MemoryRouter>
    );

    expect(screen.getByText('1 Selected for comparison')).toBeInTheDocument();
    expect(screen.getByText('Compare Traces')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '1 Selected for comparison' })).toBeInTheDocument();
  });

  it('renders multiple traces as expected', () => {
    render(
      <MemoryRouter>
        <DiffSelection traces={traces} toggleComparison={toggleComparison} />
      </MemoryRouter>
    );

    const resultItems = document.querySelectorAll('.ResultItemTitle');
    expect(resultItems).toHaveLength(traces.length);
    expect(screen.getByText('2 Selected for comparison')).toBeInTheDocument();
    expect(screen.getByText('Compare Traces')).toBeInTheDocument();
  });

  it('renders CTA_MESSAGE when given empty traces array', () => {
    render(
      <MemoryRouter>
        <DiffSelection traces={[]} toggleComparison={toggleComparison} />
      </MemoryRouter>
    );
    expect(screen.getByText('Compare traces by selecting result items')).toBeInTheDocument();
  });

  it('disables Compare Traces button when cohort length is less than 2', () => {
    render(
      <MemoryRouter>
        <DiffSelection traces={[traces[0]]} toggleComparison={toggleComparison} />
      </MemoryRouter>
    );
    const button = screen.getByRole('button', { name: /Compare Traces/i });
    expect(button).toBeDisabled();
  });

  it('enables Compare Traces button when cohort length is 2 or more', () => {
    render(
      <MemoryRouter>
        <DiffSelection traces={traces} toggleComparison={toggleComparison} />
      </MemoryRouter>
    );
    const button = screen.getByRole('button', { name: /Compare Traces/i });
    expect(button).toBeEnabled();
  });
});
