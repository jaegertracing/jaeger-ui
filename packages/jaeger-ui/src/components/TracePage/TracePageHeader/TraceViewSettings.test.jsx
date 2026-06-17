// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import TraceViewSettings from './TraceViewSettings';
import track from './KeyboardShortcutsHelp.track';
import transformTraceData from '../../../model/transform-trace-data';
import { buildAvailableFields } from '../TraceTimelineViewer/summaryFieldsUtils';

vi.mock('./KeyboardShortcutsHelp.track');
vi.mock('../keyboard-mappings', () => mockDefault({}));

const trace = transformTraceData({
  traceID: 'settings-test',
  processes: { p1: { serviceName: 'svc', tags: [] } },
  spans: [
    {
      spanID: 's1',
      traceID: 'settings-test',
      operationName: 'op',
      duration: 1,
      startTime: 1,
      processID: 'p1',
      references: [],
      tags: [{ key: 'alpha', value: '1' }],
    },
  ],
}).asOtelTrace();

const defaultProps = {
  availableFields: buildAvailableFields(trace),
  detailPanelMode: 'inline',
  enableSidePanel: false,
  onDetailPanelModeToggle: jest.fn(),
  onSelectedSummaryFieldsChange: jest.fn(),
  onTimelineToggle: jest.fn(),
  selectedSummaryFields: [],
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

  it('opens panel on click and shows "Show Timeline" item', async () => {
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

  it('shows summary fields section when trace has attribute keys', async () => {
    render(<TraceViewSettings {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
    expect(await screen.findByText('Summary fields')).toBeInTheDocument();
    expect(screen.getByTestId('summary-fields-select')).toBeInTheDocument();
  });

  it('hides summary fields section when trace has no attribute keys', async () => {
    render(<TraceViewSettings {...defaultProps} availableFields={[]} />);
    await userEvent.click(screen.getByRole('button', { name: /trace view settings/i }));
    await screen.findByText('Show Timeline');
    expect(screen.queryByText('Summary fields')).not.toBeInTheDocument();
  });

  it('always shows "Keyboard Shortcuts" in the panel', async () => {
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
