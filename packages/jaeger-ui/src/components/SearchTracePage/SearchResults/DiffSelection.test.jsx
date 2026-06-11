// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import DiffSelection from './DiffSelection';

describe('DiffSelection', () => {
  const toggleComparison = () => {};
  const traces = [
    {
      traceID: 'trace-id-0',
      duration: 100,
      traceName: 'trace-name-0',
      services: [],
      startTime: 0,
      spanCount: 1,
      errorSpanCount: 0,
    },
    {
      traceID: 'trace-id-1',
      duration: 200,
      traceName: 'trace-name-1',
      services: [],
      startTime: 0,
      spanCount: 2,
      errorSpanCount: 0,
    },
    {
      traceID: 'trace-id-2',
      duration: 300,
      traceName: 'trace-name-2',
      services: [],
      startTime: 0,
      spanCount: 3,
      errorSpanCount: 0,
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
    expect(screen.getByText('3 Selected for comparison')).toBeInTheDocument();
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
