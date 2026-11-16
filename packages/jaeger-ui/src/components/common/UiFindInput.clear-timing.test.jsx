// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { UnconnectedUiFindInput } from './UiFindInput';
import updateUiFindSpy from '../../utils/update-ui-find';

// Unlike UiFindInput.test.jsx, this file uses the real lodash debounce so that clearing
// can be tested against a pending debounced update.
vi.mock('../../utils/update-ui-find');

const mockNavigate = jest.fn();
const mockLocation = { search: '', pathname: '/test' };

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

describe('UiFindInput clear timing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    updateUiFindSpy.mockReset();
    mockNavigate.mockReset();
    mockLocation.search = '?uiFind=service&limit=20';
  });

  afterEach(() => {
    vi.useRealTimers();
    mockLocation.search = '';
  });

  it('removes uiFind immediately and does not fire again after the debounce window', async () => {
    const user = userEvent.setup({ advanceTimers: delay => vi.advanceTimersByTime(delay) });
    const { container } = render(<UnconnectedUiFindInput />);

    await user.click(container.querySelector('.ant-input-clear-icon'));

    expect(updateUiFindSpy).toHaveBeenCalledTimes(1);
    expect(updateUiFindSpy).toHaveBeenCalledWith({
      navigate: mockNavigate,
      location: mockLocation,
      uiFind: undefined,
    });

    await vi.advanceTimersByTimeAsync(300);
    expect(updateUiFindSpy).toHaveBeenCalledTimes(1);
  });

  it('has no text left after clearing, even though the value came from the URL', async () => {
    const user = userEvent.setup({ advanceTimers: delay => vi.advanceTimersByTime(delay) });
    const { container } = render(<UnconnectedUiFindInput />);

    await user.click(container.querySelector('.ant-input-clear-icon'));

    expect(screen.getByPlaceholderText('Find...')).toHaveValue('');
  });

  it('cancels a pending typing update on unmount', async () => {
    const user = userEvent.setup({ advanceTimers: delay => vi.advanceTimersByTime(delay) });
    const { unmount } = render(<UnconnectedUiFindInput />);

    await user.type(screen.getByPlaceholderText('Find...'), 'abc');
    expect(updateUiFindSpy).not.toHaveBeenCalled();

    unmount();
    await vi.advanceTimersByTimeAsync(300);
    expect(updateUiFindSpy).not.toHaveBeenCalled();
  });
});
