// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import copy from 'copy-to-clipboard';
import { message } from 'antd';

import { SpanRowControls } from './index';
import { useTraceTimelineStore } from '../store';
import * as track from '../store.track';
import { IOtelSpan } from '../../../../types/otel';

vi.mock('copy-to-clipboard', () => ({
  default: vi.fn().mockImplementation(() => Promise.resolve(true)),
}));

describe('<SpanRowControls>', () => {
  const originalLocation = window.location;
  const mockParentSpan: IOtelSpan = {
    spanID: 'span-1',
    traceID: 'trace-1',
    name: 'parent-op',
    startTime: 1000,
    endTime: 2000,
    duration: 1000,
    relativeStartTime: 0,
    hasChildren: true,
    depth: 0,
    childSpans: [],
    attributes: { getValue: () => undefined } as unknown as IOtelSpan['attributes'],
    resource: {
      serviceName: 'service-a',
      attributes: { getValue: () => undefined } as unknown as IOtelSpan['attributes'],
    },
  } as unknown as IOtelSpan;

  const mockLeafSpan: IOtelSpan = {
    spanID: 'span-2',
    traceID: 'trace-1',
    name: 'leaf-op',
    startTime: 1100,
    endTime: 1500,
    duration: 400,
    relativeStartTime: 100,
    hasChildren: false,
    depth: 1,
    childSpans: [],
    attributes: { getValue: () => undefined } as unknown as IOtelSpan['attributes'],
    resource: {
      serviceName: 'service-b',
      attributes: { getValue: () => undefined } as unknown as IOtelSpan['attributes'],
    },
  } as unknown as IOtelSpan;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(copy).mockResolvedValue(true);
    vi.spyOn(message, 'success').mockReturnValue({} as unknown as ReturnType<typeof message.success>);
    vi.spyOn(message, 'error').mockReturnValue({} as unknown as ReturnType<typeof message.error>);
    useTraceTimelineStore.setState({
      focusedSubtreeSpanID: null,
      childrenHiddenIDs: new Set<string>(),
    });
  });

  afterEach(() => {
    message.destroy();
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('renders collapse, focus, and more actions buttons for parent span', () => {
    render(<SpanRowControls span={mockParentSpan} />);

    const collapseBtn = screen.getByTestId('collapse-subtree-btn');
    const focusBtn = screen.getByTestId('focus-subtree-btn');
    expect(collapseBtn).toBeInTheDocument();
    expect(collapseBtn).toHaveAttribute('aria-expanded', 'true');
    expect(focusBtn).toBeInTheDocument();
    expect(focusBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('more-actions-btn')).toBeInTheDocument();
  });

  it('does not render collapse button for leaf span with no children', () => {
    render(<SpanRowControls span={mockLeafSpan} />);

    expect(screen.queryByTestId('collapse-subtree-btn')).not.toBeInTheDocument();
    expect(screen.getByTestId('focus-subtree-btn')).toBeInTheDocument();
    expect(screen.getByTestId('more-actions-btn')).toBeInTheDocument();
  });

  it('toggles subtree collapse when collapse button is clicked and calls trackChildrenToggle', () => {
    const trackSpy = vi.spyOn(track, 'trackChildrenToggle');

    render(<SpanRowControls span={mockParentSpan} />);
    const collapseBtn = screen.getByTestId('collapse-subtree-btn');

    fireEvent.click(collapseBtn);
    expect(trackSpy).toHaveBeenCalledWith('span-1');
    expect(useTraceTimelineStore.getState().childrenHiddenIDs.has('span-1')).toBe(true);
  });

  it('toggles subtree focus when focus button is clicked', () => {
    render(<SpanRowControls span={mockParentSpan} />);
    const focusBtn = screen.getByTestId('focus-subtree-btn');

    expect(focusBtn).toHaveAttribute('aria-pressed', 'false');

    // Click to focus
    fireEvent.click(focusBtn);
    expect(useTraceTimelineStore.getState().focusedSubtreeSpanID).toBe('span-1');

    // Now it should have is-active class and aria-pressed=true
    expect(focusBtn).toHaveClass('is-active');
    expect(focusBtn).toHaveAttribute('aria-pressed', 'true');

    // Click again to reset focus
    fireEvent.click(focusBtn);
    expect(useTraceTimelineStore.getState().focusedSubtreeSpanID).toBeNull();
    expect(focusBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('copies deep link to clipboard preserving existing query parameters and hash', async () => {
    Object.defineProperty(window, 'location', {
      value: new URL('https://example.com/trace/trace-1?svcFilter=service-x#details'),
      writable: true,
      configurable: true,
    });

    render(<SpanRowControls span={mockParentSpan} />);
    const moreBtn = screen.getByTestId('more-actions-btn');

    fireEvent.click(moreBtn);

    const copyDeepLinkItem = screen.getByText('Copy deep link');
    expect(copyDeepLinkItem).toBeInTheDocument();

    fireEvent.click(copyDeepLinkItem);

    expect(copy).toHaveBeenCalledWith(
      expect.stringMatching(
        /^https:\/\/example\.com\/trace\/trace-1\?.*svcFilter=service-x.*uiFind=span-1.*#details$/
      )
    );
    await waitFor(() => {
      expect(message.success).toHaveBeenCalledWith('Deep link copied to clipboard');
    });
  });

  it('copies span ID to clipboard on menu item click', async () => {
    render(<SpanRowControls span={mockParentSpan} />);
    const moreBtn = screen.getByTestId('more-actions-btn');

    fireEvent.click(moreBtn);

    const copySpanIdItem = screen.getByText('Copy span ID');
    expect(copySpanIdItem).toBeInTheDocument();

    fireEvent.click(copySpanIdItem);

    expect(copy).toHaveBeenCalledWith('span-1');
    await waitFor(() => {
      expect(message.success).toHaveBeenCalledWith('Span ID copied to clipboard');
    });
  });

  it('handles copy failure gracefully and displays message.error', async () => {
    vi.mocked(copy).mockResolvedValueOnce(false);
    render(<SpanRowControls span={mockParentSpan} />);
    const moreBtn = screen.getByTestId('more-actions-btn');

    fireEvent.click(moreBtn);

    const copySpanIdItem = screen.getByText('Copy span ID');
    fireEvent.click(copySpanIdItem);

    expect(copy).toHaveBeenCalledWith('span-1');
    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Failed to copy span ID to clipboard');
    });
  });

  it('handles deep link copy failure gracefully and displays message.error', async () => {
    vi.mocked(copy).mockResolvedValueOnce(false);
    render(<SpanRowControls span={mockParentSpan} />);
    const moreBtn = screen.getByTestId('more-actions-btn');

    fireEvent.click(moreBtn);

    const copyDeepLinkItem = screen.getByText('Copy deep link');
    fireEvent.click(copyDeepLinkItem);

    expect(copy).toHaveBeenCalled();
    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Failed to copy deep link to clipboard');
    });
  });

  it('renders expand subtree label and aria-expanded when subtree is already collapsed', () => {
    useTraceTimelineStore.setState({
      childrenHiddenIDs: new Set<string>(['span-1']),
    });

    render(<SpanRowControls span={mockParentSpan} />);
    const collapseBtn = screen.getByTestId('collapse-subtree-btn');
    expect(collapseBtn).toHaveAttribute('aria-label', 'Expand subtree');
    expect(collapseBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('stops event propagation when clicking more actions button', () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <SpanRowControls span={mockParentSpan} />
      </div>
    );

    const moreBtn = screen.getByTestId('more-actions-btn');
    fireEvent.click(moreBtn);

    expect(parentClick).not.toHaveBeenCalled();
  });

  it('stops event propagation when clicking controls container', () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <SpanRowControls span={mockParentSpan} />
      </div>
    );

    const controls = screen.getByTestId('span-row-controls');
    fireEvent.click(controls);

    expect(parentClick).not.toHaveBeenCalled();
  });
});
