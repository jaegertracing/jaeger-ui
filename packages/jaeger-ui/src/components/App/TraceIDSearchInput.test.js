/*
Copyright (c) 2020 The Jaeger Authors
SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import TraceIDSearchInput from './TraceIDSearchInput';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('<TraceIDSearchInput />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    render(
      <BrowserRouter>
        <TraceIDSearchInput />
      </BrowserRouter>
    );
  });

  it('renders as expected', () => {
    expect(screen.getByTestId('idInput')).toBeInTheDocument();
  });

  it('pushes input id to history', () => {
    const traceId = 'MOCK-TRACE-ID';
    const idInput = screen.getByPlaceholderText('Lookup by Trace ID...');
    fireEvent.change(idInput, { target: { value: traceId } });
    fireEvent.submit(screen.getByTestId('TraceIDSearchInput--form'));

    expect(mockNavigate).toHaveBeenCalledWith(`/trace/${traceId}`);
  });

  it('does not push to history on falsy input value', () => {
    fireEvent.submit(screen.getByTestId('TraceIDSearchInput--form'));

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
