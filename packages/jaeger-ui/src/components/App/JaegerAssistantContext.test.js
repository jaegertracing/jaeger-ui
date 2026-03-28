// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { JaegerAssistantProvider, useJaegerAssistant } from './JaegerAssistantContext';

function Consumer() {
  const { isOpen, pendingMessage, bootstrapId, openWithMessage, close, consumePending } =
    useJaegerAssistant();
  return (
    <div>
      <span data-testid="isOpen">{String(isOpen)}</span>
      <span data-testid="pending">{pendingMessage ?? ''}</span>
      <span data-testid="bootstrapId">{String(bootstrapId)}</span>
      <button type="button" onClick={() => openWithMessage('hello')}>
        openWithMessage
      </button>
      <button type="button" onClick={close}>
        close
      </button>
      <button type="button" onClick={consumePending}>
        consumePending
      </button>
    </div>
  );
}

function MissingProvider() {
  useJaegerAssistant();
  return null;
}

describe('JaegerAssistantProvider', () => {
  it('throws when useJaegerAssistant is used outside the provider', () => {
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<MissingProvider />)).toThrow(/useJaegerAssistant must be used within/);
    err.mockRestore();
  });

  it('starts closed with no pending message', () => {
    render(
      <JaegerAssistantProvider>
        <Consumer />
      </JaegerAssistantProvider>
    );
    expect(screen.getByTestId('isOpen')).toHaveTextContent('false');
    expect(screen.getByTestId('pending')).toHaveTextContent('');
    expect(screen.getByTestId('bootstrapId')).toHaveTextContent('0');
  });

  it('openWithMessage sets pending, opens, and increments bootstrapId', async () => {
    const user = userEvent.setup();
    render(
      <JaegerAssistantProvider>
        <Consumer />
      </JaegerAssistantProvider>
    );
    await user.click(screen.getByRole('button', { name: 'openWithMessage' }));
    expect(screen.getByTestId('isOpen')).toHaveTextContent('true');
    expect(screen.getByTestId('pending')).toHaveTextContent('hello');
    expect(screen.getByTestId('bootstrapId')).toHaveTextContent('1');
  });

  it('close clears open state and pending', async () => {
    const user = userEvent.setup();
    render(
      <JaegerAssistantProvider>
        <Consumer />
      </JaegerAssistantProvider>
    );
    await user.click(screen.getByRole('button', { name: 'openWithMessage' }));
    await user.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.getByTestId('isOpen')).toHaveTextContent('false');
    expect(screen.getByTestId('pending')).toHaveTextContent('');
  });

  it('consumePending clears pending without closing', async () => {
    const user = userEvent.setup();
    render(
      <JaegerAssistantProvider>
        <Consumer />
      </JaegerAssistantProvider>
    );
    await user.click(screen.getByRole('button', { name: 'openWithMessage' }));
    await user.click(screen.getByRole('button', { name: 'consumePending' }));
    expect(screen.getByTestId('isOpen')).toHaveTextContent('true');
    expect(screen.getByTestId('pending')).toHaveTextContent('');
  });
});
