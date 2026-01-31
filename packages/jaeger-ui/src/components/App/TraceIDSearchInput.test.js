/*
Copyright (c) 2020 The Jaeger Authors
SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { createMemoryHistory } from 'history';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Router } from 'react-router-dom';
import TraceIDSearchInput from './TraceIDSearchInput';
import { CompatRouter } from 'react-router-dom-v5-compat';

describe('<TraceIDSearchInput />', () => {
  let history;

  beforeEach(() => {
    history = createMemoryHistory();
    render(
      <Router history={history}>
        <CompatRouter>
          <TraceIDSearchInput />
        </CompatRouter>
      </Router>
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

    expect(history.length).toEqual(2);
    expect(history.location.pathname).toEqual(`/trace/${traceId}`);
  });

  it('does not push to history on falsy input value', () => {
    fireEvent.submit(screen.getByTestId('TraceIDSearchInput--form'));

    expect(history.length).toEqual(1);
  });
});
