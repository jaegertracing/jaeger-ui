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

function openTextarea() {
  fireEvent.click(screen.getByTestId('JaegerAskSearchInput--input'));
  return screen.getByTestId('JaegerAskSearchInput--textarea');
}

describe('<JaegerAskSearchInput />', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    agUiMock.configured = false;
  });

  it('renders the trigger button', () => {
    render(
      <MemoryRouter>
        <JaegerAskSearchInput />
      </MemoryRouter>
    );
    expect(screen.getByTestId('JaegerAskSearchInput--input')).toBeInTheDocument();
  });

  it('opens the floating textarea when trigger is clicked', () => {
    render(
      <MemoryRouter>
        <JaegerAskSearchInput />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('JaegerAskSearchInput--textarea')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('JaegerAskSearchInput--input'));
    expect(screen.getByTestId('JaegerAskSearchInput--textarea')).toBeInTheDocument();
  });

  it('navigates to trace page when assistant is not configured', () => {
    render(
      <MemoryRouter>
        <JaegerAskSearchInput />
      </MemoryRouter>
    );
    const traceId = 'MOCK-TRACE-ID';
    const textarea = openTextarea();
    fireEvent.change(textarea, { target: { value: traceId } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(`/trace/${traceId.toLowerCase()}`);
  });

  it('does not navigate when input is empty', () => {
    render(
      <MemoryRouter>
        <JaegerAskSearchInput />
      </MemoryRouter>
    );
    const textarea = openTextarea();
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('closes the textarea on Escape', () => {
    render(
      <MemoryRouter>
        <JaegerAskSearchInput />
      </MemoryRouter>
    );
    const textarea = openTextarea();
    fireEvent.keyDown(textarea, { key: 'Escape' });
    expect(screen.queryByTestId('JaegerAskSearchInput--textarea')).not.toBeInTheDocument();
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

    const textarea = openTextarea();
    fireEvent.change(textarea, { target: { value: 'What is a trace?' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

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
    const textarea = openTextarea();
    fireEvent.change(textarea, { target: { value: traceId } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(mockNavigate).toHaveBeenCalledWith(`/trace/${traceId.toLowerCase()}`);
  });

  it('Shift+Enter does not submit', () => {
    render(
      <MemoryRouter>
        <JaegerAskSearchInput />
      </MemoryRouter>
    );
    const textarea = openTextarea();
    fireEvent.change(textarea, { target: { value: 'some query' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByTestId('JaegerAskSearchInput--textarea')).toBeInTheDocument();
  });
});
