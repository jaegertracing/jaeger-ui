// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

jest.mock('./copilot-runtime', () => ({
  getJaegerCopilotRuntimeUrl: jest.fn(),
}));

import { getJaegerCopilotRuntimeUrl } from './copilot-runtime';
import JaegerTopSearch from './JaegerTopSearch';
import { JaegerAssistantProvider, useJaegerAssistant } from './JaegerAssistantContext';

function AssistantStateProbe() {
  const { isOpen, pendingMessage } = useJaegerAssistant();
  return (
    <>
      <span data-testid="probe-open">{String(isOpen)}</span>
      <span data-testid="probe-pending">{pendingMessage ?? ''}</span>
    </>
  );
}

function renderAt(path, runtimeUrl) {
  getJaegerCopilotRuntimeUrl.mockReturnValue(runtimeUrl);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <JaegerAssistantProvider>
        <JaegerTopSearch />
        <AssistantStateProbe />
        <Routes>
          <Route path="/search" element={<div data-testid="search-page" />} />
          <Route path="/trace/:id" element={<div data-testid="trace-page" />} />
        </Routes>
      </JaegerAssistantProvider>
    </MemoryRouter>
  );
}

describe('JaegerTopSearch', () => {
  beforeEach(() => {
    getJaegerCopilotRuntimeUrl.mockReset();
  });

  it('navigates to a trace when given a hex trace id and assistant runtime is off', async () => {
    const user = userEvent.setup();
    renderAt('/search', undefined);
    const input = screen.getByTestId('jaegerOmnibox');
    await user.type(input, 'a1b2c3d4');
    await user.keyboard('{Enter}');
    expect(await screen.findByTestId('trace-page')).toBeInTheDocument();
  });

  it('navigates to compare when given id...id and assistant runtime is off', async () => {
    const user = userEvent.setup();
    renderAt('/search', undefined);
    const input = screen.getByTestId('jaegerOmnibox');
    await user.type(input, 'a1b2c3d4...b2c3d4e5');
    await user.keyboard('{Enter}');
    expect(await screen.findByTestId('trace-page')).toBeInTheDocument();
  });

  it('navigates to trace when runtime is on but input looks like a trace id', async () => {
    const user = userEvent.setup();
    renderAt('/search', 'https://example/runtime');
    const input = screen.getByTestId('jaegerOmnibox');
    await user.type(input, 'a1b2c3d4');
    await user.keyboard('{Enter}');
    expect(await screen.findByTestId('trace-page')).toBeInTheDocument();
    expect(screen.getByTestId('probe-open')).toHaveTextContent('false');
  });

  it('opens the assistant with free text when runtime URL is set', async () => {
    const user = userEvent.setup();
    renderAt('/search', 'https://example/runtime');
    const input = screen.getByTestId('jaegerOmnibox');
    await user.type(input, 'explain this trace');
    await user.keyboard('{Enter}');
    expect(screen.queryByTestId('trace-page')).not.toBeInTheDocument();
    expect(screen.getByTestId('probe-open')).toHaveTextContent('true');
    expect(screen.getByTestId('probe-pending')).toHaveTextContent('explain this trace');
    expect(input).toHaveValue('');
  });
});
