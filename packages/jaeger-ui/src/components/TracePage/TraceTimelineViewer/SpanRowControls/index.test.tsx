// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import copy from 'copy-to-clipboard';

import { SpanRowControls } from './index';
import { useTraceTimelineStore } from '../store';
import { IOtelSpan } from '../../../../types/otel';

vi.mock('copy-to-clipboard', () => ({
  default: vi.fn().mockReturnValue(true),
}));

describe('<SpanRowControls>', () => {
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
    attributes: { getValue: () => undefined } as any,
    resource: { serviceName: 'service-a', attributes: { getValue: () => undefined } as any },
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
    attributes: { getValue: () => undefined } as any,
    resource: { serviceName: 'service-b', attributes: { getValue: () => undefined } as any },
  } as unknown as IOtelSpan;

  beforeEach(() => {
    vi.clearAllMocks();
    useTraceTimelineStore.setState({
      focusedSubtreeSpanID: null,
      childrenHiddenIDs: new Set<string>(),
    });
  });

  it('renders collapse, focus, and more actions buttons for parent span', () => {
    render(<SpanRowControls span={mockParentSpan} />);

    expect(screen.getByTestId('collapse-subtree-btn')).toBeInTheDocument();
    expect(screen.getByTestId('focus-subtree-btn')).toBeInTheDocument();
    expect(screen.getByTestId('more-actions-btn')).toBeInTheDocument();
  });

  it('does not render collapse button for leaf span with no children', () => {
    render(<SpanRowControls span={mockLeafSpan} />);

    expect(screen.queryByTestId('collapse-subtree-btn')).not.toBeInTheDocument();
    expect(screen.getByTestId('focus-subtree-btn')).toBeInTheDocument();
    expect(screen.getByTestId('more-actions-btn')).toBeInTheDocument();
  });

  it('toggles subtree collapse when collapse button is clicked', () => {
    const toggleSubtreeCollapse = vi.fn();
    useTraceTimelineStore.setState({ toggleSubtreeCollapse });

    render(<SpanRowControls span={mockParentSpan} />);
    const collapseBtn = screen.getByTestId('collapse-subtree-btn');

    fireEvent.click(collapseBtn);
    expect(toggleSubtreeCollapse).toHaveBeenCalledWith(mockParentSpan);
  });

  it('toggles subtree focus when focus button is clicked', () => {
    render(<SpanRowControls span={mockParentSpan} />);
    const focusBtn = screen.getByTestId('focus-subtree-btn');

    // Click to focus
    fireEvent.click(focusBtn);
    expect(useTraceTimelineStore.getState().focusedSubtreeSpanID).toBe('span-1');

    // Now it should have is-active class
    expect(focusBtn).toHaveClass('is-active');

    // Click again to reset focus
    fireEvent.click(focusBtn);
    expect(useTraceTimelineStore.getState().focusedSubtreeSpanID).toBeNull();
  });

  it('copies deep link to clipboard on menu item click', () => {
    render(<SpanRowControls span={mockParentSpan} />);
    const moreBtn = screen.getByTestId('more-actions-btn');

    fireEvent.click(moreBtn);

    const copyDeepLinkItem = screen.getByText('Copy deep link');
    expect(copyDeepLinkItem).toBeInTheDocument();

    fireEvent.click(copyDeepLinkItem);
    expect(copy).toHaveBeenCalledWith(expect.stringContaining('?uiFind=span-1'));
  });

  it('copies span ID to clipboard on menu item click', () => {
    render(<SpanRowControls span={mockParentSpan} />);
    const moreBtn = screen.getByTestId('more-actions-btn');

    fireEvent.click(moreBtn);

    const copySpanIdItem = screen.getByText('Copy span ID');
    expect(copySpanIdItem).toBeInTheDocument();

    fireEvent.click(copySpanIdItem);
    expect(copy).toHaveBeenCalledWith('span-1');
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
