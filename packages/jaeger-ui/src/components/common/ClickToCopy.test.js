// Copyright (c) 2020 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClickToCopy from './ClickToCopy';

beforeAll(() => {
  Object.defineProperty(document, 'execCommand', {
    value: jest.fn(),
    writable: true,
  });
});

afterEach(() => {
  jest.clearAllMocks();
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

  it('shows "Copy to clipboard" tooltip initially and after timeout', async () => {
    jest.useFakeTimers();
    render(<ClickToCopy text={textToCopy}>{childText}</ClickToCopy>);
    const span = screen.getByRole('button', { name: /Copy to clipboard/i });
    fireEvent.mouseOver(span);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('Copy to clipboard');
    fireEvent.click(span);
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent('Copied to clipboard');
    });
    jest.advanceTimersByTime(2000);
    await waitFor(() => {
      const tooltipAfter = screen.queryByRole('tooltip');
      if (tooltipAfter) {
        expect(tooltipAfter).not.toBeVisible();
      }
    });
    jest.useRealTimers();
  });

  it('copies text to clipboard on click', async () => {
    render(<ClickToCopy text={textToCopy}>{childText}</ClickToCopy>);
    const span = screen.getByRole('button', { name: /Copy to clipboard/i });
    fireEvent.click(span);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });

  it('handles rapid multiple clicks and resets copied state', async () => {
    jest.useFakeTimers();
    render(<ClickToCopy text={textToCopy}>{childText}</ClickToCopy>);
    const span = screen.getByRole('button', { name: /Copy to clipboard/i });
    fireEvent.click(span);
    fireEvent.click(span);
    expect(document.execCommand).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(2000);
    await waitFor(() => {
      const tooltipAfter = screen.queryByRole('tooltip');
      if (tooltipAfter) {
        expect(tooltipAfter).not.toBeVisible();
      }
    });
    jest.useRealTimers();
  });

  // Additional tests from the other section, adapted to this structure
  it('renders the button with correct text and initial aria-label', async () => {
    render(
      <ClickToCopy className="classNameValue" text="textValue">
        <span>Click to Copy</span>
      </ClickToCopy>
    );
    const copyButton = screen.getByRole('button', { name: /Copy to clipboard/i });
    expect(copyButton).toBeInTheDocument();
    expect(copyButton).toHaveClass('classNameValue');
    expect(copyButton).toHaveAttribute('aria-label', 'Copy to clipboard');
  });

  it('shows "Copied to clipboard" aria-label when clicked', async () => {
    render(
      <ClickToCopy className="classNameValue" text="textValue">
        <span>Click to Copy</span>
      </ClickToCopy>
    );
    const copyButton = screen.getByRole('button', { name: /Copy to clipboard/i });
    fireEvent.click(copyButton);
    await waitFor(() => {
      expect(copyButton).toHaveAttribute('aria-label', 'Copied to clipboard');
    });
  });

  it('resets aria-label to original text after timeout', async () => {
    jest.useFakeTimers();
    render(
      <ClickToCopy className="classNameValue" text="textValue">
        <span>Click to Copy</span>
      </ClickToCopy>
    );
    const copyButton = screen.getByRole('button', { name: /Copy to clipboard/i });
    fireEvent.click(copyButton);
    await waitFor(() => {
      expect(copyButton).toHaveAttribute('aria-label', 'Copied to clipboard');
    });
    jest.advanceTimersByTime(2000);
    await waitFor(() => {
      expect(copyButton).toHaveAttribute('aria-label', 'Copy to clipboard');
    });
    jest.useRealTimers();
  });
});
