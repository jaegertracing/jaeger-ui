/*
Copyright (c) 2020 The Jaeger Authors
SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import TraceIDSearchInput from './TraceIDSearchInput';
import { CompatRouter } from 'react-router-dom-v5-compat';

const mockNavigate = jest.fn();
jest.mock('react-router-dom-v5-compat', () => {
  return {
    ...jest.requireActual('react-router-dom-v5-compat'),
    useNavigate: () => mockNavigate,
  };
});

describe('<TraceIDSearchInput />', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    render(
      <MemoryRouter>
        <CompatRouter>
          <TraceIDSearchInput />
        </CompatRouter>
      </MemoryRouter>
    );
  });

  it('renders as expected', () => {
    expect(screen.getByTestId('idInput')).toBeInTheDocument();
  });

  it('navigates to trace page when input is provided', () => {
    const traceId = 'MOCK-TRACE-ID';
    const idInput = screen.getByPlaceholderText('Lookup by Trace ID...');
    fireEvent.change(idInput, { target: { value: traceId } });
    fireEvent.submit(screen.getByTestId('TraceIDSearchInput--form'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(`/trace/${traceId}`);
  });

  it('does not navigate when input is empty', () => {
    fireEvent.submit(screen.getByTestId('TraceIDSearchInput--form'));

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
