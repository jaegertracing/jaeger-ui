// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import TraceViewSettings from './TraceViewSettings';
import track from './KeyboardShortcutsHelp.track';

vi.mock('./KeyboardShortcutsHelp.track');
vi.mock('../keyboard-mappings', () => mockDefault({}));

const defaultProps = {
  detailPanelMode: 'inline',
  enableSidePanel: false,
  onDetailPanelModeToggle: jest.fn(),
  onTimelineToggle: jest.fn(),
  timelineBarsVisible: true,
};

async function openPanel() {
  await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
  // The panel content is rendered inside the popover
  return screen.findByRole('group', { name: /timeline view/i });
}

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

  it('opens popover on click and shows "Timeline View" setting', async () => {
    render(<TraceViewSettings {...defaultProps} />);
    await openPanel();
    expect(screen.getByText('Timeline View')).toBeInTheDocument();
  });

  it('calls onTimelineToggle when the Timeline switch is clicked', async () => {
    render(<TraceViewSettings {...defaultProps} />);
    await openPanel();
    // The switch for timeline is labelled by "Timeline View"
    const timelineSwitch = screen.getByRole('switch', { name: /timeline view/i });
    await userEvent.click(timelineSwitch);
    expect(defaultProps.onTimelineToggle).toHaveBeenCalledTimes(1);
  });

  it('does not show "Span Details Sidebar" setting when enableSidePanel is false', async () => {
    render(<TraceViewSettings {...defaultProps} enableSidePanel={false} />);
    await openPanel();
    expect(screen.queryByText('Span Details Sidebar')).not.toBeInTheDocument();
  });

  it('shows "Span Details Sidebar" setting when enableSidePanel is true', async () => {
    render(<TraceViewSettings {...defaultProps} enableSidePanel />);
    await openPanel();
    expect(screen.getByText('Span Details Sidebar')).toBeInTheDocument();
  });

  it('calls onDetailPanelModeToggle when the Sidebar switch is clicked', async () => {
    render(<TraceViewSettings {...defaultProps} enableSidePanel />);
    await openPanel();
    const sidebarSwitch = screen.getByRole('switch', { name: /span details sidebar/i });
    await userEvent.click(sidebarSwitch);
    expect(defaultProps.onDetailPanelModeToggle).toHaveBeenCalledTimes(1);
  });

  it('always shows "Keyboard Shortcuts" button in the panel', async () => {
    render(<TraceViewSettings {...defaultProps} />);
    await openPanel();
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('opens the keyboard shortcuts modal and calls track() when "Keyboard Shortcuts" is clicked', async () => {
    render(<TraceViewSettings {...defaultProps} />);
    await openPanel();
    await userEvent.click(screen.getByText('Keyboard Shortcuts'));
    expect(track).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows "Set by shared link" badge when timeline source is "url"', async () => {
    const settingSources = {
      timelineBarsVisible: { value: false, source: 'url', isOverridden: true },
      detailPanelMode: { value: 'inline', source: 'localstorage', isOverridden: false },
    };
    render(
      <TraceViewSettings {...defaultProps} timelineBarsVisible={false} settingSources={settingSources} />
    );
    await openPanel();
    expect(screen.getByText('Set by shared link')).toBeInTheDocument();
  });

  it('shows "Optimized for this trace" badge when timeline source is "heuristic"', async () => {
    const settingSources = {
      timelineBarsVisible: { value: false, source: 'heuristic', isOverridden: true },
      detailPanelMode: { value: 'inline', source: 'localstorage', isOverridden: false },
    };
    render(
      <TraceViewSettings {...defaultProps} timelineBarsVisible={false} settingSources={settingSources} />
    );
    await openPanel();
    expect(screen.getByText('Optimized for this trace')).toBeInTheDocument();
  });

  it('does not show a source badge when source is "localstorage"', async () => {
    const settingSources = {
      timelineBarsVisible: { value: true, source: 'localstorage', isOverridden: false },
      detailPanelMode: { value: 'inline', source: 'localstorage', isOverridden: false },
    };
    render(<TraceViewSettings {...defaultProps} settingSources={settingSources} />);
    await openPanel();
    expect(screen.queryByText('Set by shared link')).not.toBeInTheDocument();
    expect(screen.queryByText('Optimized for this trace')).not.toBeInTheDocument();
  });

  it('shows "Set as my default" link when a setting is overridden', async () => {
    const settingSources = {
      timelineBarsVisible: { value: false, source: 'url', isOverridden: true },
      detailPanelMode: { value: 'inline', source: 'localstorage', isOverridden: false },
    };
    render(
      <TraceViewSettings
        {...defaultProps}
        timelineBarsVisible={false}
        settingSources={settingSources}
        saveSettingAsDefault={jest.fn()}
      />
    );
    await openPanel();
    expect(screen.getByText('Set as my default')).toBeInTheDocument();
  });

  it('calls saveSettingAsDefault with correct key when "Set as my default" is clicked', async () => {
    const saveSettingAsDefault = jest.fn();
    const settingSources = {
      timelineBarsVisible: { value: false, source: 'url', isOverridden: true },
      detailPanelMode: { value: 'inline', source: 'localstorage', isOverridden: false },
    };
    render(
      <TraceViewSettings
        {...defaultProps}
        timelineBarsVisible={false}
        settingSources={settingSources}
        saveSettingAsDefault={saveSettingAsDefault}
      />
    );
    await openPanel();
    await userEvent.click(screen.getByText('Set as my default'));
    expect(saveSettingAsDefault).toHaveBeenCalledWith('timelineBarsVisible');
  });

  it('does not show "Set as my default" link when isOverridden is false', async () => {
    const settingSources = {
      timelineBarsVisible: { value: true, source: 'localstorage', isOverridden: false },
      detailPanelMode: { value: 'inline', source: 'localstorage', isOverridden: false },
    };
    render(
      <TraceViewSettings {...defaultProps} settingSources={settingSources} saveSettingAsDefault={jest.fn()} />
    );
    await openPanel();
    await waitFor(() => {
      expect(screen.queryByText('Set as my default')).not.toBeInTheDocument();
    });
  });

  it('shows "Set as my default" for sidebar when sidebar source is "url"', async () => {
    const saveSettingAsDefault = jest.fn();
    const settingSources = {
      timelineBarsVisible: { value: true, source: 'localstorage', isOverridden: false },
      detailPanelMode: { value: 'sidepanel', source: 'url', isOverridden: true },
    };
    render(
      <TraceViewSettings
        {...defaultProps}
        enableSidePanel
        detailPanelMode="sidepanel"
        settingSources={settingSources}
        saveSettingAsDefault={saveSettingAsDefault}
      />
    );
    await openPanel();
    const saveLinks = screen.getAllByText('Set as my default');
    // Only one override (sidebar), so exactly one link
    expect(saveLinks).toHaveLength(1);
    await userEvent.click(saveLinks[0]);
    expect(saveSettingAsDefault).toHaveBeenCalledWith('detailPanelMode');
  });
});
