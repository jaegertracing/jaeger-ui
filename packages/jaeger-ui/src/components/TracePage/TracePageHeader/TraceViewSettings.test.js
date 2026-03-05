// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import TraceViewSettings from './TraceViewSettings';
import track from './KeyboardShortcutsHelp.track';

jest.mock('./KeyboardShortcutsHelp.track', () => jest.fn());
jest.mock('../keyboard-mappings', () => ({}));

const defaultProps = {
  detailPanelMode: 'inline',
  enableSidePanel: false,
  onDetailPanelModeToggle: jest.fn(),
  onTimelineToggle: jest.fn(),
  timelineVisible: true,
};

describe('<TraceViewSettings>', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the settings gear button with accessible label', () => {
    render(<TraceViewSettings {...defaultProps} />);
    const button = screen.getByRole('button', { name: /trace view settings/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Trace view settings');
  });

  it('opens dropdown on click and shows "Show Timeline" item', async () => {
    render(<TraceViewSettings {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
    expect(await screen.findByText('Show Timeline')).toBeInTheDocument();
  });

  it('calls onTimelineToggle when "Show Timeline" is clicked', async () => {
    render(<TraceViewSettings {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
    await userEvent.click(await screen.findByText('Show Timeline'));
    expect(defaultProps.onTimelineToggle).toHaveBeenCalledTimes(1);
  });

  it('does not show "Show Span in Sidebar" when enableSidePanel is false', async () => {
    render(<TraceViewSettings {...defaultProps} enableSidePanel={false} />);
    await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
    await screen.findByText('Show Timeline');
    expect(screen.queryByText('Show Span in Sidebar')).not.toBeInTheDocument();
  });

  it('shows "Show Span in Sidebar" when enableSidePanel is true', async () => {
    render(<TraceViewSettings {...defaultProps} enableSidePanel />);
    await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
    expect(await screen.findByText('Show Span in Sidebar')).toBeInTheDocument();
  });

  it('calls onDetailPanelModeToggle when "Show Span in Sidebar" is clicked', async () => {
    render(<TraceViewSettings {...defaultProps} enableSidePanel />);
    await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
    await userEvent.click(await screen.findByText('Show Span in Sidebar'));
    expect(defaultProps.onDetailPanelModeToggle).toHaveBeenCalledTimes(1);
  });

  it('always shows "Keyboard Shortcuts" in the dropdown', async () => {
    render(<TraceViewSettings {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
    expect(await screen.findByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('opens the keyboard shortcuts modal and calls track() when "Keyboard Shortcuts" is clicked', async () => {
    render(<TraceViewSettings {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
    await userEvent.click(await screen.findByText('Keyboard Shortcuts'));
    expect(track).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('returns the cached kbdTable on a second call to getHelpModal', async () => {
    const { unmount } = render(<TraceViewSettings {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
    await userEvent.click(await screen.findByText('Keyboard Shortcuts'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    unmount();

    render(<TraceViewSettings {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
    await userEvent.click(await screen.findByText('Keyboard Shortcuts'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
