// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi, describe, beforeEach, it, expect } from 'vitest';

import TraceViewSettings from './TraceViewSettings';
import track from './KeyboardShortcutsHelp.track';

vi.mock('./KeyboardShortcutsHelp.track');
vi.mock('../keyboard-mappings', () => mockDefault({}));

const defaultProps: React.ComponentProps<typeof TraceViewSettings> = {
  detailPanelMode: 'inline',
  enableSidePanel: false,
  onDetailPanelModeToggle: vi.fn(),
  onTimelineToggle: vi.fn(),
  timelineBarsVisible: true,
};

describe('<TraceViewSettings>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the settings gear button with accessible label', () => {
    render(<TraceViewSettings {...defaultProps} />);
    const button = screen.getByRole('button', { name: /trace view settings/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Trace view settings');
  });

  it('opens popover on click and shows "Show Timeline" switch', async () => {
    render(<TraceViewSettings {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
    expect(await screen.findByText('Show Timeline')).toBeInTheDocument();
    const switchControl = screen.getByRole('switch', { name: 'Show Timeline' });
    expect(switchControl).toBeInTheDocument();
    expect(switchControl).toBeChecked();
  });

  it('calls onTimelineToggle when "Show Timeline" switch is toggled', async () => {
    render(<TraceViewSettings {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
    const switchControl = await screen.findByRole('switch', { name: 'Show Timeline' });
    await userEvent.click(switchControl);
    expect(defaultProps.onTimelineToggle).toHaveBeenCalledTimes(1);
  });

  it('does not show "Show Span in Sidebar" when enableSidePanel is false', async () => {
    render(<TraceViewSettings {...defaultProps} enableSidePanel={false} />);
    await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
    await screen.findByText('Show Timeline');
    expect(screen.queryByText('Show Span in Sidebar')).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Show Span in Sidebar' })).not.toBeInTheDocument();
  });

  it('shows "Show Span in Sidebar" switch when enableSidePanel is true', async () => {
    render(<TraceViewSettings {...defaultProps} enableSidePanel detailPanelMode="inline" />);
    await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
    expect(await screen.findByText('Show Span in Sidebar')).toBeInTheDocument();
    const sidebarSwitch = screen.getByRole('switch', { name: 'Show Span in Sidebar' });
    expect(sidebarSwitch).toBeInTheDocument();
    expect(sidebarSwitch).not.toBeChecked();
  });

  it('shows checked sidebar switch when detailPanelMode is sidepanel', async () => {
    render(<TraceViewSettings {...defaultProps} enableSidePanel detailPanelMode="sidepanel" />);
    await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
    const sidebarSwitch = await screen.findByRole('switch', { name: 'Show Span in Sidebar' });
    expect(sidebarSwitch).toBeChecked();
  });

  it('calls onDetailPanelModeToggle when "Show Span in Sidebar" switch is toggled', async () => {
    render(<TraceViewSettings {...defaultProps} enableSidePanel />);
    await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
    const sidebarSwitch = await screen.findByRole('switch', { name: 'Show Span in Sidebar' });
    await userEvent.click(sidebarSwitch);
    expect(defaultProps.onDetailPanelModeToggle).toHaveBeenCalledTimes(1);
  });

  it('always shows "Keyboard Shortcuts" in the popover', async () => {
    render(<TraceViewSettings {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
    expect(await screen.findByRole('button', { name: 'Keyboard Shortcuts' })).toBeInTheDocument();
  });

  it('opens the keyboard shortcuts modal and calls track() when "Keyboard Shortcuts" is clicked', async () => {
    render(<TraceViewSettings {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
    const shortcutsButton = await screen.findByRole('button', { name: 'Keyboard Shortcuts' });
    await userEvent.click(shortcutsButton);
    expect(track).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('returns the cached kbdTable on a second call to getHelpModal', async () => {
    const { unmount } = render(<TraceViewSettings {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
    const shortcutsBtn = await screen.findByRole('button', { name: 'Keyboard Shortcuts' });
    await userEvent.click(shortcutsBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    unmount();

    render(<TraceViewSettings {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
    const secondShortcutsBtn = await screen.findByRole('button', { name: 'Keyboard Shortcuts' });
    await userEvent.click(secondShortcutsBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
