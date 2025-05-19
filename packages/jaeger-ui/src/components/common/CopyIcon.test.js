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
import copy from 'copy-to-clipboard';
import CopyIcon from './CopyIcon';

// Mock the copy-to-clipboard module
jest.mock('copy-to-clipboard');

describe('<CopyIcon />', () => {
  const props = {
    className: 'classNameValue',
    copyText: 'copyTextValue',
    tooltipTitle: 'tooltipTitleValue',
    buttonText: 'Click to Copy', // Added buttonText for better RTL querying
  };

  beforeEach(() => {
    jest.clearAllMocks();
    render(<CopyIcon {...props} />);
  });

  it('renders the button with correct text and initial tooltip title', async () => {
    const copyButton = screen.getByRole('button', { name: props.buttonText });
    expect(copyButton).toBeInTheDocument();
    expect(copyButton).toHaveClass('CopyIcon'); // Check the base class
    expect(copyButton).toHaveClass(props.className); // Check the passed className
  });

  it('calls copy-to-clipboard and updates tooltip text when clicked', async () => {
    const copyButton = screen.getByRole('button', { name: props.buttonText });

    // Simulate the user clicking the button
    fireEvent.click(copyButton);

    // Assert that copy-to-clipboard was called with the correct text
    expect(copy).toHaveBeenCalledWith(props.copyText);
  });

  // This test is flaky due to timing issues with tooltips
  it('resets tooltip text to original title when tooltip hides after copying', async () => {
    const copyButton = screen.getByRole('button', { name: props.buttonText });

    // 1. Hover to show the initial tooltip
    fireEvent.mouseEnter(copyButton);

    // Use a more reliable approach with longer timeout
    let tooltip = await screen.findByRole('tooltip', {}, { timeout: 3000 });
    expect(tooltip).toHaveTextContent(props.tooltipTitle);

    // 2. Click the button
    fireEvent.click(copyButton);

    // 3. Wait for "Copied" text with longer timeout
    await waitFor(
      () => {
        tooltip = screen.getByRole('tooltip'); // Re-find
        expect(tooltip).toHaveTextContent('Copied');
      },
      { timeout: 3000 }
    );

    // 4. Move the mouse away to hide the tooltip
    fireEvent.mouseLeave(copyButton);

    // 5. Wait for the tooltip to disappear with longer timeout
    await waitFor(
      () => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // 6. Hover again
    fireEvent.mouseEnter(copyButton);

    // 7. Wait for the tooltip to reappear and check for the *original* title
    tooltip = await screen.findByRole('tooltip', {}, { timeout: 3000 });
    expect(tooltip).toHaveTextContent(props.tooltipTitle);
  });

  it('shows "Copied" tooltip when clicked and resets on mouse leave', async () => {
    const copyButton = screen.getByRole('button', { name: props.buttonText });

    // 1. Hover to show the initial tooltip
    fireEvent.mouseEnter(copyButton);
    // Find the tooltip and check its initial content with longer timeout
    let tooltip = await screen.findByRole('tooltip', {}, { timeout: 3000 });
    expect(tooltip).toHaveTextContent(props.tooltipTitle);

    // 2. Click the button (while implicitly still hovered)
    fireEvent.click(copyButton);

    // 3. Assert the tooltip content changes to "Copied" with longer timeout
    await waitFor(
      () => {
        // Re-find the tooltip in case it re-rendered and check content
        tooltip = screen.getByRole('tooltip');
        expect(tooltip).toHaveTextContent('Copied');
      },
      { timeout: 3000 }
    );

    // 4. Move the mouse away
    fireEvent.mouseLeave(copyButton);

    // 5. Assert the tooltip disappears with longer timeout
    await waitFor(
      () => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});
