// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import JaegerAskSearchInput from './JaegerAskSearchInput';
import { JaegerAssistantProvider } from './JaegerAssistantContext';

const mockNavigate = jest.fn();

const agUiMock = vi.hoisted(() => ({
  configured: false,
}));

vi.mock('react-router-dom', async () => {
  return {
    ...(await vi.importActual('react-router-dom')),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('./jaegerAgUi', () => ({
  getJaegerAgUiUrl: () => (agUiMock.configured ? 'http://localhost/ag-ui' : ''),
  isJaegerAssistantConfigured: () => agUiMock.configured,
}));

describe('<JaegerAskSearchInput />', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    agUiMock.configured = false;
  });

  it('renders as expected', () => {
    render(
      <MemoryRouter>
        <JaegerAskSearchInput />
      </MemoryRouter>
    );
    expect(screen.getByTestId('JaegerAskSearchInput--input')).toBeInTheDocument();
  });

  it('navigates to trace page when assistant is not configured', () => {
    render(
      <MemoryRouter>
        <JaegerAskSearchInput />
      </MemoryRouter>
    );
    const traceId = 'MOCK-TRACE-ID';
    fireEvent.change(screen.getByPlaceholderText('Lookup by Trace ID…'), {
      target: { value: traceId },
    });
    fireEvent.submit(screen.getByTestId('JaegerAskSearchInput--form'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(`/trace/${traceId.toLowerCase()}`);
  });

  it('does not navigate when input is empty', () => {
    render(
      <MemoryRouter>
        <JaegerAskSearchInput />
      </MemoryRouter>
    );
    fireEvent.submit(screen.getByTestId('JaegerAskSearchInput--form'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens assistant for natural language when configured instead of navigating', () => {
    agUiMock.configured = true;
    render(
      <MemoryRouter>
        <JaegerAssistantProvider>
          <JaegerAskSearchInput />
        </JaegerAssistantProvider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Ask Jaeger or lookup trace ID…'), {
      target: { value: 'What is a trace?' },
    });
    fireEvent.submit(screen.getByTestId('JaegerAskSearchInput--form'));

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('still navigates for 16–32 hex trace ids when assistant is configured', () => {
    agUiMock.configured = true;
    render(
      <MemoryRouter>
        <JaegerAssistantProvider>
          <JaegerAskSearchInput />
        </JaegerAssistantProvider>
      </MemoryRouter>
    );

    const traceId = 'a1b2c3d4e5f67890';
    fireEvent.change(screen.getByTestId('JaegerAskSearchInput--input'), {
      target: { value: traceId },
    });
    fireEvent.submit(screen.getByTestId('JaegerAskSearchInput--form'));

    expect(mockNavigate).toHaveBeenCalledWith(`/trace/${traceId.toLowerCase()}`);
  });
});
