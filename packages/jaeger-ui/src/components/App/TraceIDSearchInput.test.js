/**
 * Copyright (c) 2020 The Jaeger Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import { createMemoryHistory } from 'history';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Router } from 'react-router-dom';
import TraceIDSearchInput from './TraceIDSearchInput';
import { HistoryProvider } from '../../utils/useHistory';

describe('<TraceIDSearchInput />', () => {
  let history;

  beforeEach(() => {
    history = createMemoryHistory();
    render(
      <HistoryProvider history={history}>
        <Router history={history}>
          <TraceIDSearchInput />
        </Router>
      </HistoryProvider>
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
