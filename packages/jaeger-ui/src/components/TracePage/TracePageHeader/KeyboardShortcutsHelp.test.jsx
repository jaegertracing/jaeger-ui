// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import track from './KeyboardShortcutsHelp.track';

vi.mock('./KeyboardShortcutsHelp.track', () => mockDefault(jest.fn()));
vi.mock('../keyboard-mappings', () => mockDefault({}));

describe('KeyboardShortcutsHelp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render the modal when open is false', () => {
    render(<KeyboardShortcutsHelp open={false} onClose={jest.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the modal when open is true', () => {
    render(<KeyboardShortcutsHelp open onClose={jest.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('calls track() when open becomes true', () => {
    render(<KeyboardShortcutsHelp open onClose={jest.fn()} />);
    expect(track).toHaveBeenCalledTimes(1);
  });

  it('does not call track() when open is false', () => {
    render(<KeyboardShortcutsHelp open={false} onClose={jest.fn()} />);
    expect(track).not.toHaveBeenCalled();
  });

  it('calls onClose when OK is clicked', () => {
    const onClose = jest.fn();
    render(<KeyboardShortcutsHelp open onClose={onClose} />);
    fireEvent.click(screen.getByText('OK'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel/Close is clicked', () => {
    const onClose = jest.fn();
    render(<KeyboardShortcutsHelp open onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close', { selector: 'button' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('returns the cached kbdTable on a second call to getHelpModal', () => {
    const onClose = jest.fn();
    const { unmount } = render(<KeyboardShortcutsHelp open onClose={onClose} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    unmount();

    render(<KeyboardShortcutsHelp open onClose={onClose} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
