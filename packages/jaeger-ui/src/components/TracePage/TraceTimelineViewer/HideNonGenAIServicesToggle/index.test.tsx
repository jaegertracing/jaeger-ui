// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, beforeEach } from 'vitest';

import HideNonGenAIServicesToggle from './index';
import { useTraceTimelineStore } from '../store';
import DetailState from '../SpanDetail/DetailState';
import { IOtelTrace, IOtelSpan } from '../../../../types/otel';

function makeTrace(spans: ReadonlyArray<{ spanID: string; serviceName?: string }> = []): IOtelTrace {
  const spanMap = new Map(
    spans.map(({ spanID, serviceName }) => [
      spanID,
      { spanID, resource: { serviceName: serviceName ?? 'default-svc' } } as unknown as IOtelSpan,
    ])
  ) as unknown as Map<string, IOtelSpan>;
  return { spanMap } as unknown as IOtelTrace;
}

const initialState = useTraceTimelineStore.getState();

describe('HideNonGenAIServicesToggle', () => {
  beforeEach(() => {
    useTraceTimelineStore.setState(initialState, true);
  });

  it('renders nothing when there are no services to hide', () => {
    useTraceTimelineStore.setState({ nonGenAIServicesToHide: new Set() });
    const { container } = render(
      <HideNonGenAIServicesToggle trace={makeTrace([])} detailPanelMode="inline" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the toggle button when there are non-GenAI services to hide', () => {
    useTraceTimelineStore.setState({ nonGenAIServicesToHide: new Set(['gateway-svc']) });
    render(<HideNonGenAIServicesToggle trace={makeTrace([])} detailPanelMode="inline" />);
    expect(screen.getByTestId('hide-non-genai-services-toggle-button')).toBeInTheDocument();
  });

  it('is inactive by default', () => {
    useTraceTimelineStore.setState({ nonGenAIServicesToHide: new Set(['gateway-svc']) });
    render(<HideNonGenAIServicesToggle trace={makeTrace([])} detailPanelMode="inline" />);
    const button = screen.getByTestId('hide-non-genai-services-toggle-button');
    expect(button).not.toHaveClass('is-active');
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles hideNonGenAIServicesEnabled in the store on click', () => {
    useTraceTimelineStore.setState({ nonGenAIServicesToHide: new Set(['gateway-svc']) });
    render(<HideNonGenAIServicesToggle trace={makeTrace([])} detailPanelMode="inline" />);
    fireEvent.click(screen.getByTestId('hide-non-genai-services-toggle-button'));
    expect(useTraceTimelineStore.getState().hideNonGenAIServicesEnabled).toBe(true);
    fireEvent.click(screen.getByTestId('hide-non-genai-services-toggle-button'));
    expect(useTraceTimelineStore.getState().hideNonGenAIServicesEnabled).toBe(false);
  });

  it('reflects active state and aria-pressed once enabled', () => {
    useTraceTimelineStore.setState({ nonGenAIServicesToHide: new Set(['gateway-svc']) });
    render(<HideNonGenAIServicesToggle trace={makeTrace([])} detailPanelMode="inline" />);
    fireEvent.click(screen.getByTestId('hide-non-genai-services-toggle-button'));
    const button = screen.getByTestId('hide-non-genai-services-toggle-button');
    expect(button).toHaveClass('is-active');
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles via Enter key', () => {
    useTraceTimelineStore.setState({ nonGenAIServicesToHide: new Set(['gateway-svc']) });
    render(<HideNonGenAIServicesToggle trace={makeTrace([])} detailPanelMode="inline" />);
    fireEvent.keyDown(screen.getByTestId('hide-non-genai-services-toggle-button'), { key: 'Enter' });
    expect(useTraceTimelineStore.getState().hideNonGenAIServicesEnabled).toBe(true);
  });

  it('toggles via Space key', () => {
    useTraceTimelineStore.setState({ nonGenAIServicesToHide: new Set(['gateway-svc']) });
    render(<HideNonGenAIServicesToggle trace={makeTrace([])} detailPanelMode="inline" />);
    fireEvent.keyDown(screen.getByTestId('hide-non-genai-services-toggle-button'), { key: ' ' });
    expect(useTraceTimelineStore.getState().hideNonGenAIServicesEnabled).toBe(true);
  });

  it('deselects a side-panel-selected span that becomes hidden when enabling in sidepanel mode', () => {
    // The selected span belongs to the service the toggle is about to prune.
    const trace = makeTrace([{ spanID: 'selected-span', serviceName: 'gateway-svc' }]);
    const detailStates = new Map([['selected-span', DetailState.forDetailPanelMode('sidepanel')]]);
    useTraceTimelineStore.setState({
      nonGenAIServicesToHide: new Set(['gateway-svc']),
      detailStates,
      prunedServices: new Set(),
    });
    render(<HideNonGenAIServicesToggle trace={trace} detailPanelMode="sidepanel" />);
    fireEvent.click(screen.getByTestId('hide-non-genai-services-toggle-button'));
    expect(useTraceTimelineStore.getState().detailStates.size).toBe(0);
  });

  it('does not touch detailStates when the selected span is unaffected', () => {
    const trace = makeTrace([{ spanID: 'selected-span', serviceName: 'agent-svc' }]);
    const detailStates = new Map([['selected-span', DetailState.forDetailPanelMode('sidepanel')]]);
    useTraceTimelineStore.setState({
      nonGenAIServicesToHide: new Set(['gateway-svc']),
      detailStates,
      prunedServices: new Set(),
    });
    render(<HideNonGenAIServicesToggle trace={trace} detailPanelMode="sidepanel" />);
    fireEvent.click(screen.getByTestId('hide-non-genai-services-toggle-button'));
    expect(useTraceTimelineStore.getState().detailStates.size).toBe(1);
  });

  it('does not touch detailStates when not in sidepanel mode', () => {
    const trace = makeTrace([{ spanID: 'selected-span', serviceName: 'gateway-svc' }]);
    const detailStates = new Map([['selected-span', new DetailState()]]);
    useTraceTimelineStore.setState({
      nonGenAIServicesToHide: new Set(['gateway-svc']),
      detailStates,
      prunedServices: new Set(),
    });
    render(<HideNonGenAIServicesToggle trace={trace} detailPanelMode="inline" />);
    fireEvent.click(screen.getByTestId('hide-non-genai-services-toggle-button'));
    expect(useTraceTimelineStore.getState().detailStates.size).toBe(1);
  });
});
