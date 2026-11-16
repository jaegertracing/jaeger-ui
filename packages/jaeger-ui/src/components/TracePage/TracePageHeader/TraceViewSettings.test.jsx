// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import TraceViewSettings from './TraceViewSettings';
import track from './KeyboardShortcutsHelp.track';
import { useLayoutPrefsStore } from '../TraceTimelineViewer/store';

vi.mock('./KeyboardShortcutsHelp.track');
vi.mock('../keyboard-mappings', () => mockDefault({}));

const mockPopover = vi.fn();

vi.mock('antd', async () => {
  const antd = await vi.importActual('antd');
  return {
    ...antd,
    Popover: props => {
      mockPopover(props);
      return (
        <div>
          {props.children}
          <div data-testid="popover-content">{props.content}</div>
        </div>
      );
    },
  };
});

const defaultProps = {
  detailPanelMode: 'inline',
  enableSidePanel: false,
  onDetailPanelModeToggle: jest.fn(),
  onTimelineToggle: jest.fn(),
  timelineBarsVisible: true,
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

  it('renders the "Show Timeline" switch', () => {
    render(<TraceViewSettings {...defaultProps} />);
    const toggle = screen.getByRole('switch', { name: 'Show Timeline' });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toBeChecked();
  });

  it('calls onTimelineToggle when the "Show Timeline" switch is clicked', async () => {
    render(<TraceViewSettings {...defaultProps} />);
    await userEvent.click(screen.getByRole('switch', { name: 'Show Timeline' }));
    expect(defaultProps.onTimelineToggle).toHaveBeenCalledTimes(1);
  });

  it('does not show the "Show Span in Sidebar" switch when enableSidePanel is false', () => {
    render(<TraceViewSettings {...defaultProps} enableSidePanel={false} />);
    expect(screen.queryByRole('switch', { name: 'Show Span in Sidebar' })).not.toBeInTheDocument();
  });

  it('shows the "Show Span in Sidebar" switch when enableSidePanel is true', () => {
    render(<TraceViewSettings {...defaultProps} enableSidePanel />);
    expect(screen.getByRole('switch', { name: 'Show Span in Sidebar' })).toBeInTheDocument();
  });

  it('calls onDetailPanelModeToggle when the "Show Span in Sidebar" switch is clicked', async () => {
    render(<TraceViewSettings {...defaultProps} enableSidePanel />);
    await userEvent.click(screen.getByRole('switch', { name: 'Show Span in Sidebar' }));
    expect(defaultProps.onDetailPanelModeToggle).toHaveBeenCalledTimes(1);
  });

  describe('Span Latency Heatmap', () => {
    beforeEach(() => {
      useLayoutPrefsStore.setState({ heatmapEnabled: false });
    });

    it('shows the heatmap switch, unchecked while the heatmap is off', () => {
      render(<TraceViewSettings {...defaultProps} />);
      expect(screen.getByRole('switch', { name: 'Span Latency Heatmap' })).not.toBeChecked();
    });

    it('shows the heatmap switch checked while the heatmap is on', () => {
      useLayoutPrefsStore.setState({ heatmapEnabled: true });
      render(<TraceViewSettings {...defaultProps} />);
      expect(screen.getByRole('switch', { name: 'Span Latency Heatmap' })).toBeChecked();
    });

    it('toggles the heatmap preference when clicked', async () => {
      render(<TraceViewSettings {...defaultProps} />);
      await userEvent.click(screen.getByRole('switch', { name: 'Span Latency Heatmap' }));
      expect(useLayoutPrefsStore.getState().heatmapEnabled).toBe(true);
    });
  });

  it('always shows "Keyboard Shortcuts" in the panel', () => {
    render(<TraceViewSettings {...defaultProps} />);
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('opens the keyboard shortcuts modal and calls track() when "Keyboard Shortcuts" is clicked', async () => {
    render(<TraceViewSettings {...defaultProps} />);
    await userEvent.click(screen.getByText('Keyboard Shortcuts'));
    expect(track).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('returns the cached kbdTable on a second call to getHelpModal', async () => {
    const { unmount } = render(<TraceViewSettings {...defaultProps} />);
    await userEvent.click(screen.getByText('Keyboard Shortcuts'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    unmount();

    render(<TraceViewSettings {...defaultProps} />);
    await userEvent.click(screen.getByText('Keyboard Shortcuts'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders the Popover with the trace-view-settings title and placement', () => {
    render(<TraceViewSettings {...defaultProps} />);
    const popoverProps = mockPopover.mock.calls[0][0];
    expect(popoverProps.title).toBe('Trace view settings');
    expect(popoverProps.placement).toBe('bottomRight');
    expect(popoverProps.trigger).toBe('click');
  });
});
