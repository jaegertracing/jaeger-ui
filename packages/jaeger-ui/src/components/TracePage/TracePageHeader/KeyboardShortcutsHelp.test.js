// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import * as track from './KeyboardShortcutsHelp.track';

describe('KeyboardShortcutsHelp', () => {
  const testClassName = 'test--ClassName';
  let trackSpy;

  beforeAll(() => {
    trackSpy = jest.spyOn(track, 'default');
  });

  beforeEach(() => {
    trackSpy.mockReset();
    render(<KeyboardShortcutsHelp className={testClassName} />);
  });

  it('renders as expected', () => {
    const buttonElement = screen.getByRole('button');
    expect(buttonElement.className).toContain(testClassName);
  });

  it('opens modal and tracks its opening', () => {
    const buttonElement = screen.getByRole('button');
    let modalElement = screen.queryByText('Keyboard Shortcuts');
    expect(modalElement).not.toBeInTheDocument();

    fireEvent.click(buttonElement);
    modalElement = screen.getByText('Keyboard Shortcuts');
    expect(modalElement).toBeInTheDocument();

    expect(trackSpy).toHaveBeenCalled();
  });

  it('closes modal on cancel', async () => {
    const buttonElement = screen.getByRole('button');
    fireEvent.click(buttonElement);
    const closeButton = screen.getByLabelText('Close', { selector: 'button' });
    fireEvent.click(closeButton);
    const modalElement = screen.getByText('Keyboard Shortcuts');
    expect(modalElement).not.toBeVisible();
  });

  it('closes modal on ok', async () => {
    const buttonElement = screen.getByRole('button');
    fireEvent.click(buttonElement);
    const okButton = screen.getByText('OK');
    fireEvent.click(okButton);
    const modalElement = screen.getByText('Keyboard Shortcuts');
    expect(modalElement).not.toBeVisible();
  });
});
