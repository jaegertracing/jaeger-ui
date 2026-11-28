// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TraceViewSettings from './TraceViewSettings';
import track from './KeyboardShortcutsHelp.track';
import { useDisplayedLayoutStore } from '../TraceTimelineViewer/store';

vi.mock('./KeyboardShortcutsHelp.track', () => ({
  default: vi.fn(),
}));

describe('<TraceViewSettings>', () => {
  const defaultProps = {
    detailPanelMode: 'inline' as const,
    enableSidePanel: true,
    onDetailPanelModeToggle: vi.fn(),
    onTimelineToggle: vi.fn(),
    timelineBarsVisible: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useDisplayedLayoutStore.setState({ heatmapEnabled: false });
  });

  it('renders settings trigger button with correct icon and attributes', () => {
    render(<TraceViewSettings {...defaultProps} />);
    const button = screen.getByRole('button', { name: /trace view settings/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Trace view settings');
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    render(<TraceViewSettings {...defaultProps} className="custom-class" />);
    const button = screen.getByRole('button', { name: /trace view settings/i });
    expect(button.className).toContain('custom-class');
  });

  it('opens popover when clicking the settings button', async () => {
    render(<TraceViewSettings {...defaultProps} />);
    const button = screen.getByRole('button', { name: /trace view settings/i });
    await userEvent.click(button);
    expect(await screen.findByText('Trace View Settings')).toBeInTheDocument();
    expect(screen.getByText('Show Timeline')).toBeInTheDocument();
  });

  it('renders "Show Timeline" switch with checked state matching timelineBarsVisible', async () => {
    const { rerender } = render(<TraceViewSettings {...defaultProps} timelineBarsVisible={true} />);
    await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
    const switchControl = await screen.findByRole('switch', { name: 'Show Timeline' });
    expect(switchControl).toBeChecked();

    rerender(<TraceViewSettings {...defaultProps} timelineBarsVisible={false} />);
    expect(switchControl).not.toBeChecked();
  });

  it('calls onTimelineToggle when "Show Timeline" switch is toggled', async () => {
    render(<TraceViewSettings {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
    const switchControl = await screen.findByRole('switch', { name: 'Show Timeline' });
    await userEvent.click(switchControl);
    expect(defaultProps.onTimelineToggle).toHaveBeenCalledTimes(1);
  });

  describe('Span Latency Heatmap', () => {
    it('shows the heatmap switch, unchecked while heatmap is off', async () => {
      useDisplayedLayoutStore.setState({ heatmapEnabled: false });
      render(<TraceViewSettings {...defaultProps} />);
      await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
      const heatmapSwitch = await screen.findByRole('switch', { name: 'Span Latency Heatmap' });
      expect(heatmapSwitch).toBeInTheDocument();
      expect(heatmapSwitch).not.toBeChecked();
    });

    it('shows checked heatmap switch while heatmap is on', async () => {
      useDisplayedLayoutStore.setState({ heatmapEnabled: true });
      render(<TraceViewSettings {...defaultProps} />);
      await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
      const heatmapSwitch = await screen.findByRole('switch', { name: 'Span Latency Heatmap' });
      expect(heatmapSwitch).toBeChecked();
    });

    it('toggles the heatmap preference when clicked', async () => {
      render(<TraceViewSettings {...defaultProps} />);
      await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
      const heatmapSwitch = await screen.findByRole('switch', { name: 'Span Latency Heatmap' });
      await userEvent.click(heatmapSwitch);
      expect(useDisplayedLayoutStore.getState().heatmapEnabled).toBe(true);
    });
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

    const closeBtn = await screen.findByRole('button', { name: /close/i });
    await userEvent.click(closeBtn);

    unmount();

    render(<TraceViewSettings {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
    const secondShortcutsBtn = await screen.findByRole('button', { name: 'Keyboard Shortcuts' });
    await userEvent.click(secondShortcutsBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
