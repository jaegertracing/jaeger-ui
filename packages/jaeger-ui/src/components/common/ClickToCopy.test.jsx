// Copyright (c) 2025 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClickToCopy from './ClickToCopy';
import { act } from '@testing-library/react';

beforeAll(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: jest.fn().mockResolvedValue(undefined) },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  jest.clearAllMocks();
  if (jest.isMockFunction(setTimeout)) {
    jest.useRealTimers();
  }
});

describe('<ClickToCopy />', () => {
  const textToCopy = 'copy-me';
  const childText = 'Click here!';
  const className = 'test-class';

  it('renders children and applies className', () => {
    render(
      <ClickToCopy text={textToCopy} className={className}>
        {childText}
      </ClickToCopy>
    );
    const span = screen.getByRole('button', { name: /Copy to clipboard/i });
    expect(span).toBeInTheDocument();
    expect(span).toHaveTextContent(childText);
    expect(span).toHaveClass(className);
  });

  it('copies text to clipboard on click', async () => {
    render(<ClickToCopy text={textToCopy}>{childText}</ClickToCopy>);
    const span = screen.getByRole('button', { name: /Copy to clipboard/i });
    fireEvent.click(span);
    await act(async () => {});
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(textToCopy);
  });

  it('shows "Copied to clipboard" when clicked and resets after timeout', async () => {
    jest.useFakeTimers();
    render(
      <ClickToCopy className="classNameValue" text="textValue">
        <span>Click to Copy</span>
      </ClickToCopy>
    );
    const copyButton = screen.getByRole('button', { name: /Copy to clipboard/i });

    fireEvent.click(copyButton);
    await act(async () => {});

    await waitFor(() => {
      expect(copyButton).toHaveAttribute('aria-label', 'Copied to clipboard');
    });

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(copyButton).toHaveAttribute('aria-label', 'Copy to clipboard');
    });
    jest.useRealTimers();
  });

  it('triggers copy on Enter and Space key press', async () => {
    render(<ClickToCopy text="copied!">Click me</ClickToCopy>);
    const button = screen.getByRole('button');

    button.focus();
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
    await act(async () => {});
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('copied!');

    fireEvent.keyDown(button, { key: ' ', code: 'Space' });
    await act(async () => {});
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(2);
  });

  it('does not trigger copy on other key presses', async () => {
    render(<ClickToCopy text="test">Click me</ClickToCopy>);
    const button = screen.getByRole('button');

    button.focus();
    fireEvent.keyDown(button, { key: 'Escape', code: 'Escape' });
    fireEvent.keyDown(button, { key: 'Tab', code: 'Tab' });
    fireEvent.keyDown(button, { key: 'a', code: 'KeyA' });

    await act(async () => {});
    expect(button).toHaveAttribute('aria-label', 'Copy to clipboard');
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('clears timeout on unmount', async () => {
    jest.useFakeTimers();
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    const { unmount } = render(<ClickToCopy text="test">Click</ClickToCopy>);
    const button = screen.getByRole('button');

    fireEvent.click(button);
    await act(async () => {});
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('clears timeout on second click while isCopied is true', async () => {
    jest.useRealTimers();
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    const { getByRole } = render(
      <ClickToCopy text="double click test">
        <span>Copy me</span>
      </ClickToCopy>
    );

    const button = getByRole('button', { name: /copy to clipboard/i });

    fireEvent.click(button);
    await act(async () => {});
    fireEvent.click(button);
    await act(async () => {});

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
