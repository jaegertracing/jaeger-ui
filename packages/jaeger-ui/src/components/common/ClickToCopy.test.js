// Copyright (c) 2019 Uber Technologies, Inc.
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

describe('<ClickToCopy />', () => {
  const props = {
    className: 'classNameValue',
    text: 'textValue',
    children: <span>Click to Copy</span>,
  };

  beforeEach(() => {
    render(<ClickToCopy {...props} />);
  });

  it('renders the button with correct text and initial aria-label', async () => {
    const copyButton = screen.getByRole('button', { name: /Click to Copy/i });
    expect(copyButton).toBeInTheDocument();
    expect(copyButton).toHaveClass(props.className);
    expect(copyButton).toHaveAttribute('aria-label', 'Copy to clipboard');
  });

  it('calls execCommand and updates aria-label when clicked', async () => {
    const copyButton = screen.getByRole('button', { name: /Click to Copy/i });

    fireEvent.click(copyButton);

    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });

  it('shows "Copied to clipboard" aria-label when clicked', async () => {
    const copyButton = screen.getByRole('button', { name: /Click to Copy/i });

    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(copyButton).toHaveAttribute('aria-label', 'Copied to clipboard');
    });
  });

  it('resets aria-label to original text after timeout', async () => {
    jest.useFakeTimers();

    const copyButton = screen.getByRole('button', { name: /Click to Copy/i });

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
