// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

vi.mock('copy-to-clipboard', () => ({ default: vi.fn().mockResolvedValue(true) }));

vi.mock('../../../../utils/span-to-otlp', () => ({
  spanToOtlpJson: vi.fn().mockReturnValue({ resourceSpans: [{ stub: 'otlp' }] }),
  spanToFlatJson: vi.fn().mockReturnValue({ traceId: 'abc', stub: 'flat' }),
}));

import copy from 'copy-to-clipboard';
import { spanToOtlpJson, spanToFlatJson } from '../../../../utils/span-to-otlp';
import ExportSpanButton from './ExportSpanButton';
import { IOtelSpan, SpanKind, StatusCode } from '../../../../types/otel';

const mockSpan: IOtelSpan = {
  traceID: 'trace001',
  spanID: 'span001',
  name: 'test-op',
  kind: SpanKind.SERVER,
  startTime: 1_000_000 as any,
  endTime: 1_050_000 as any,
  duration: 50_000 as any,
  attributes: [],
  events: [],
  links: [],
  status: { code: StatusCode.OK },
  resource: { serviceName: 'svc', attributes: [] },
  instrumentationScope: { name: 'test' },
  depth: 0,
  hasChildren: false,
  childSpans: [],
  relativeStartTime: 0 as any,
  inboundLinks: [],
  warnings: null,
} as unknown as IOtelSpan;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('<ExportSpanButton>', () => {
  it('renders an Export button', () => {
    render(<ExportSpanButton span={mockSpan} />);
    expect(screen.getByTestId('export-span-button')).toBeInTheDocument();
    expect(screen.getByTestId('export-span-button')).toHaveTextContent('Export');
  });

  it('has correct idle aria-label', () => {
    render(<ExportSpanButton span={mockSpan} />);
    expect(screen.getByTestId('export-span-button')).toHaveAttribute('aria-label', 'Export span data');
  });

  it('shows "Copy as OTLP JSON" and "Copy as flat JSON" menu items on click', async () => {
    const user = userEvent.setup();
    render(<ExportSpanButton span={mockSpan} />);

    await user.click(screen.getByTestId('export-span-button'));

    expect(await screen.findByText('Copy as OTLP JSON')).toBeInTheDocument();
    expect(await screen.findByText('Copy as flat JSON')).toBeInTheDocument();
  });

  it('calls spanToOtlpJson and copies the result when "Copy as OTLP JSON" is clicked', async () => {
    const user = userEvent.setup();
    render(<ExportSpanButton span={mockSpan} />);

    await user.click(screen.getByTestId('export-span-button'));
    const otlpItem = await screen.findByText('Copy as OTLP JSON');
    await user.click(otlpItem);

    expect(spanToOtlpJson).toHaveBeenCalledWith(mockSpan);
    expect(copy).toHaveBeenCalledWith(JSON.stringify({ resourceSpans: [{ stub: 'otlp' }] }, null, 2));
  });

  it('calls spanToFlatJson and copies the result when "Copy as flat JSON" is clicked', async () => {
    const user = userEvent.setup();
    render(<ExportSpanButton span={mockSpan} />);

    await user.click(screen.getByTestId('export-span-button'));
    const flatItem = await screen.findByText('Copy as flat JSON');
    await user.click(flatItem);

    expect(spanToFlatJson).toHaveBeenCalledWith(mockSpan);
    expect(copy).toHaveBeenCalledWith(JSON.stringify({ traceId: 'abc', stub: 'flat' }, null, 2));
  });

  it('updates aria-label to "Copied!" after a successful copy', async () => {
    const user = userEvent.setup();
    vi.mocked(copy).mockResolvedValue(true);
    render(<ExportSpanButton span={mockSpan} />);

    await user.click(screen.getByTestId('export-span-button'));
    await user.click(await screen.findByText('Copy as OTLP JSON'));

    expect(await screen.findByLabelText('Copied!')).toBeInTheDocument();
  });

  it('updates aria-label to failed message when copy returns false', async () => {
    const user = userEvent.setup();
    vi.mocked(copy).mockResolvedValue(false);
    render(<ExportSpanButton span={mockSpan} />);

    await user.click(screen.getByTestId('export-span-button'));
    await user.click(await screen.findByText('Copy as OTLP JSON'));

    expect(await screen.findByLabelText('Copy failed — try again')).toBeInTheDocument();
  });

  it('resets to idle aria-label after the 2-second timer', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    vi.mocked(copy).mockResolvedValue(true);

    render(<ExportSpanButton span={mockSpan} />);
    await user.click(screen.getByTestId('export-span-button'));
    await user.click(await screen.findByText('Copy as OTLP JSON'));

    expect(await screen.findByLabelText('Copied!')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2001));
    expect(screen.getByTestId('export-span-button')).toHaveAttribute('aria-label', 'Export span data');

    vi.useRealTimers();
  });

  it('clears the timer on unmount to prevent setState after unmount', () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(global, 'clearTimeout');

    const { unmount } = render(<ExportSpanButton span={mockSpan} />);
    unmount();

    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
    vi.useRealTimers();
  });
});
