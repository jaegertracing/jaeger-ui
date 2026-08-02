// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, beforeEach } from 'vitest';

import LogicalViewToggle from './index';
import { useTraceTimelineStore } from '../store';
import DetailState from '../SpanDetail/DetailState';
import { IOtelTrace, IOtelSpan } from '../../../../types/otel';

function makeTrace(spanIDs: string[]): IOtelTrace {
  const spanMap = new Map(
    spanIDs.map(spanID => [spanID, { spanID } as unknown as IOtelSpan])
  ) as unknown as Map<string, IOtelSpan>;
  return { spanMap } as unknown as IOtelTrace;
}

const initialState = useTraceTimelineStore.getState();

describe('LogicalViewToggle', () => {
  beforeEach(() => {
    useTraceTimelineStore.setState(initialState, true);
  });

  it('renders nothing when there are no services to hide', () => {
    useTraceTimelineStore.setState({ logicalViewPrunedServices: new Set() });
    const { container } = render(<LogicalViewToggle trace={makeTrace([])} detailPanelMode="inline" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the toggle button when there are non-GenAI services to hide', () => {
    useTraceTimelineStore.setState({ logicalViewPrunedServices: new Set(['gateway-svc']) });
    render(<LogicalViewToggle trace={makeTrace([])} detailPanelMode="inline" />);
    expect(screen.getByTestId('logical-view-toggle-button')).toBeInTheDocument();
  });

  it('is inactive by default', () => {
    useTraceTimelineStore.setState({ logicalViewPrunedServices: new Set(['gateway-svc']) });
    render(<LogicalViewToggle trace={makeTrace([])} detailPanelMode="inline" />);
    const button = screen.getByTestId('logical-view-toggle-button');
    expect(button).not.toHaveClass('is-active');
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles logicalViewEnabled in the store on click', () => {
    useTraceTimelineStore.setState({ logicalViewPrunedServices: new Set(['gateway-svc']) });
    render(<LogicalViewToggle trace={makeTrace([])} detailPanelMode="inline" />);
    fireEvent.click(screen.getByTestId('logical-view-toggle-button'));
    expect(useTraceTimelineStore.getState().logicalViewEnabled).toBe(true);
    fireEvent.click(screen.getByTestId('logical-view-toggle-button'));
    expect(useTraceTimelineStore.getState().logicalViewEnabled).toBe(false);
  });

  it('reflects active state and aria-pressed once enabled', () => {
    useTraceTimelineStore.setState({ logicalViewPrunedServices: new Set(['gateway-svc']) });
    render(<LogicalViewToggle trace={makeTrace([])} detailPanelMode="inline" />);
    fireEvent.click(screen.getByTestId('logical-view-toggle-button'));
    const button = screen.getByTestId('logical-view-toggle-button');
    expect(button).toHaveClass('is-active');
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles via Enter key', () => {
    useTraceTimelineStore.setState({ logicalViewPrunedServices: new Set(['gateway-svc']) });
    render(<LogicalViewToggle trace={makeTrace([])} detailPanelMode="inline" />);
    fireEvent.keyDown(screen.getByTestId('logical-view-toggle-button'), { key: 'Enter' });
    expect(useTraceTimelineStore.getState().logicalViewEnabled).toBe(true);
  });

  it('toggles via Space key', () => {
    useTraceTimelineStore.setState({ logicalViewPrunedServices: new Set(['gateway-svc']) });
    render(<LogicalViewToggle trace={makeTrace([])} detailPanelMode="inline" />);
    fireEvent.keyDown(screen.getByTestId('logical-view-toggle-button'), { key: ' ' });
    expect(useTraceTimelineStore.getState().logicalViewEnabled).toBe(true);
  });

  it('deselects a side-panel-selected span that becomes hidden when enabling in sidepanel mode', () => {
    const trace = makeTrace(['selected-span']);
    const detailStates = new Map([['selected-span', DetailState.forDetailPanelMode('sidepanel')]]);
    useTraceTimelineStore.setState({
      logicalViewPrunedServices: new Set(['gateway-svc']),
      detailStates,
      prunedServices: new Set(),
    });
    // The selected span belongs to the service the logical view is about to prune.
    (trace.spanMap.get('selected-span') as unknown as { resource: { serviceName: string } }).resource = {
      serviceName: 'gateway-svc',
    };
    render(<LogicalViewToggle trace={trace} detailPanelMode="sidepanel" />);
    fireEvent.click(screen.getByTestId('logical-view-toggle-button'));
    expect(useTraceTimelineStore.getState().detailStates.size).toBe(0);
  });

  it('does not touch detailStates when the selected span is unaffected', () => {
    const trace = makeTrace(['selected-span']);
    (trace.spanMap.get('selected-span') as unknown as { resource: { serviceName: string } }).resource = {
      serviceName: 'agent-svc',
    };
    const detailStates = new Map([['selected-span', DetailState.forDetailPanelMode('sidepanel')]]);
    useTraceTimelineStore.setState({
      logicalViewPrunedServices: new Set(['gateway-svc']),
      detailStates,
      prunedServices: new Set(),
    });
    render(<LogicalViewToggle trace={trace} detailPanelMode="sidepanel" />);
    fireEvent.click(screen.getByTestId('logical-view-toggle-button'));
    expect(useTraceTimelineStore.getState().detailStates.size).toBe(1);
  });

  it('does not touch detailStates when not in sidepanel mode', () => {
    const trace = makeTrace(['selected-span']);
    (trace.spanMap.get('selected-span') as unknown as { resource: { serviceName: string } }).resource = {
      serviceName: 'gateway-svc',
    };
    const detailStates = new Map([['selected-span', new DetailState()]]);
    useTraceTimelineStore.setState({
      logicalViewPrunedServices: new Set(['gateway-svc']),
      detailStates,
      prunedServices: new Set(),
    });
    render(<LogicalViewToggle trace={trace} detailPanelMode="inline" />);
    fireEvent.click(screen.getByTestId('logical-view-toggle-button'));
    expect(useTraceTimelineStore.getState().detailStates.size).toBe(1);
  });
});
