// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import copy from 'copy-to-clipboard';
import CopyIcon from './CopyIcon';

// Mock the copy-to-clipboard module
vi.mock('copy-to-clipboard');

// Replace Ant Design's Tooltip with a minimal implementation that shows/hides
// synchronously and removes from DOM on close — no CSS animations in jsdom.
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');

  function MockTooltip({ children, onOpenChange, title }) {
    const [open, setOpen] = React.useState(false);

    const enhanced = React.cloneElement(children, {
      onMouseEnter: () => {
        setOpen(true);
        onOpenChange?.(true);
      },
      onMouseLeave: () => {
        setOpen(false);
        onOpenChange?.(false);
      },
    });

    return (
      <>
        {enhanced}
        {open && <div role="tooltip">{title}</div>}
      </>
    );
  }

  return { ...actual, Tooltip: MockTooltip };
});

describe('<CopyIcon />', () => {
  const props = {
    className: 'classNameValue',
    copyText: 'copyTextValue',
    tooltipTitle: 'tooltipTitleValue',
    buttonText: 'Click to Copy', // Added buttonText for better RTL querying
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(copy).mockResolvedValue(true);
    render(<CopyIcon {...props} />);
  });

  it('renders the button with correct text and initial tooltip title', () => {
    const copyButton = screen.getByRole('button', { name: props.buttonText });
    expect(copyButton).toBeInTheDocument();
    expect(copyButton).toHaveClass('CopyIcon'); // Check the base class
    expect(copyButton).toHaveClass(props.className); // Check the passed className
  });

  it('calls copy-to-clipboard and updates tooltip text when clicked', async () => {
    const copyButton = screen.getByRole('button', { name: props.buttonText });

    fireEvent.mouseEnter(copyButton);
    expect(screen.getByRole('tooltip')).toHaveTextContent(props.tooltipTitle);

    fireEvent.click(copyButton);
    await screen.findByText('Copied');

    expect(copy).toHaveBeenCalledWith(props.copyText);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Copied');
  });

  it('does not show "Copied" when copy fails', async () => {
    vi.mocked(copy).mockResolvedValue(false);
    const copyButton = screen.getByRole('button', { name: props.buttonText });

    fireEvent.mouseEnter(copyButton);
    fireEvent.click(copyButton);

    // Give any microtasks a chance to run
    await new Promise(r => setTimeout(r, 0));

    expect(screen.getByRole('tooltip')).toHaveTextContent(props.tooltipTitle);
  });

  it('resets tooltip text to original title when tooltip hides after copying', async () => {
    const copyButton = screen.getByRole('button', { name: props.buttonText });

    // 1. Hover to show the initial tooltip
    fireEvent.mouseEnter(copyButton);
    expect(screen.getByRole('tooltip')).toHaveTextContent(props.tooltipTitle);

    // 2. Click the button
    fireEvent.click(copyButton);

    // 3. Tooltip now shows "Copied"
    await screen.findByText('Copied');

    // 4. Move the mouse away — MockTooltip hides synchronously and calls onOpenChange(false)
    fireEvent.mouseLeave(copyButton);

    // 5. Tooltip is gone; hasCopied was reset via onOpenChange(false)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // 6. Hover again
    fireEvent.mouseEnter(copyButton);

    // 7. Tooltip shows original title again
    expect(screen.getByRole('tooltip')).toHaveTextContent(props.tooltipTitle);
  });

  it('shows "Copied" tooltip when clicked and resets on mouse leave', async () => {
    const copyButton = screen.getByRole('button', { name: props.buttonText });

    // 1. Hover to show the initial tooltip
    fireEvent.mouseEnter(copyButton);
    expect(screen.getByRole('tooltip')).toHaveTextContent(props.tooltipTitle);

    // 2. Click the button (while implicitly still hovered)
    fireEvent.click(copyButton);

    // 3. Tooltip content changes to "Copied"
    await screen.findByText('Copied');

    // 4. Move the mouse away
    fireEvent.mouseLeave(copyButton);

    // 5. Tooltip is gone
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
