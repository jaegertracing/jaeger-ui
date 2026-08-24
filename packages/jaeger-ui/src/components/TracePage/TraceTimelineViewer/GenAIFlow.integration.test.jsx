// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Integration test for the GenAI rendering pipeline on one real trace: span-type
 * icons, the Logical View service-pruning filter, and the SpanDetail -> GenAI tab
 * wiring reached by actually expanding a row. Each deliverable already has its own
 * unit tests (classification, icon component, generateRowStates, GenAITab), but
 * those mount each piece in isolation - nothing currently renders them together
 * through the real VirtualizedTraceView -> SpanBarRow -> SpanDetail -> GenAITab
 * wiring on an actual multi-agent trace, which is what this file checks.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import DetailState from './SpanDetail/DetailState';
import { VirtualizedTraceViewImpl } from './VirtualizedTraceView';
import transformTraceData from '../../../model/transform-trace-data';
import memoizedTraceCriticalPath from '../CriticalPath/index';
import genaiTestTrace from './genaiTestTrace.json';

vi.mock('./SpanTreeOffset');
vi.mock('../../../utils/update-ui-find');

const { listViewPropsCapture } = vi.hoisted(() => ({
  listViewPropsCapture: { current: null },
}));

vi.mock('./ListView', () => {
  const ReactModule = require('react');
  const MockListView = ReactModule.forwardRef(function MockListView(props, ref) {
    listViewPropsCapture.current = props;
    ReactModule.useImperativeHandle(ref, () => ({
      getViewHeight: vi.fn(),
      getBottomVisibleIndex: vi.fn(),
      getTopVisibleIndex: vi.fn(),
      getRowPosition: vi.fn(),
      forceUpdate: vi.fn(),
    }));
    return ReactModule.createElement('div', { 'data-testid': 'list-view' });
  });
  return { default: MockListView, __esModule: true };
});

describe('GenAI flow: icons, Logical View pruning, and the GenAI tab', () => {
  let trace;
  let mockProps;

  beforeEach(() => {
    const legacyTrace = transformTraceData(genaiTestTrace);
    const criticalPath = memoizedTraceCriticalPath(legacyTrace).sections;
    trace = legacyTrace.asOtelTrace();

    mockProps = {
      childrenHiddenIDs: new Set(),
      childrenToggle: vi.fn(),
      clearShouldScrollToFirstUiFindMatch: vi.fn(),
      currentViewRangeTime: [0, 1],
      detailLogItemToggle: vi.fn(),
      detailLogsToggle: vi.fn(),
      detailProcessToggle: vi.fn(),
      detailStates: new Map(),
      detailTagsToggle: vi.fn(),
      detailToggle: vi.fn(),
      detailWarningsToggle: vi.fn(),
      detailReferencesToggle: vi.fn(),
      findMatchesIDs: null,
      registerAccessors: vi.fn(),
      scrollToFirstVisibleSpan: vi.fn(),
      setSpanNameColumnWidth: vi.fn(),
      focusUiFindMatches: vi.fn(),
      setTrace: vi.fn(),
      shouldScrollToFirstUiFindMatch: false,
      spanNameColumnWidth: 0.5,
      nameColumnWidth: 0.5,
      prunedServices: new Set(),
      trace,
      criticalPath,
      spanPillsEnabled: true,
      uiFind: '',
      navigate: vi.fn(),
      location: { search: null },
    };

    listViewPropsCapture.current = null;
  });

  function spanIndex(spanID) {
    return trace.spans.findIndex(s => s.spanID === spanID);
  }

  function renderAndCapture(props = mockProps) {
    render(<VirtualizedTraceViewImpl {...props} />);
    return listViewPropsCapture.current;
  }

  function visibleSpanIDs(listViewProps) {
    const ids = [];
    for (let i = 0; i < listViewProps.dataLength; i += 1) {
      const key = listViewProps.getKeyFromIndex(i);
      if (key.endsWith('--bar')) ids.push(key.slice(0, -'--bar'.length));
    }
    return ids;
  }

  it('renders the correct icon for each GenAI span kind', () => {
    const listViewProps = renderAndCapture();

    const cases = [
      { spanID: '0000000000000004', label: 'AI Agent' }, // invoke_agent triage-agent
      { spanID: '0000000000000005', label: 'LLM call' }, // chat model-a
      { spanID: '0000000000000007', label: 'MCP Tool call' }, // execute_tool list_dashboards
      { spanID: '0000000000000012', label: 'Retrieval' }, // retrieval vector-search
    ];

    cases.forEach(({ spanID, label }) => {
      const row = listViewProps.itemRenderer(`${spanID}--bar`, {}, spanIndex(spanID), {});
      const { unmount } = render(row);
      expect(screen.getByLabelText(label)).toBeInTheDocument();
      unmount();
    });
  });

  it('renders no GenAI icon for a plain infrastructure span', () => {
    const listViewProps = renderAndCapture();
    const spanID = '0000000000000009'; // GET /validate, auth-service - no gen_ai.* attributes
    const row = listViewProps.itemRenderer(`${spanID}--bar`, {}, spanIndex(spanID), {});
    const { container } = render(row);
    expect(container.querySelector('.GenAISpanIcon')).not.toBeInTheDocument();
  });

  it('Logical View pruning removes a filtered service and its whole subtree from the rendered rows', () => {
    const listViewProps = renderAndCapture({
      ...mockProps,
      prunedServices: new Set(['auth-service']),
    });
    const visible = visibleSpanIDs(listViewProps);

    // auth-service ("GET /validate") spans are pure infra leaves - all six instances pruned.
    ['0000000000000009', '000000000000000e', '0000000000000018', '000000000000001d'].forEach(spanID => {
      expect(visible).not.toContain(spanID);
    });
    // Sibling services under the same tool-call, and the GenAI spans themselves, stay visible.
    expect(visible).toContain('0000000000000008'); // mcp-gateway, sibling of the pruned auth-service call
    expect(visible).toContain('0000000000000004'); // invoke_agent triage-agent
    expect(visible).toContain('0000000000000005'); // chat model-a
  });

  it('expanding a GenAI span reaches the real GenAI tab with its actual conversation content', () => {
    const spanID = '0000000000000005'; // chat model-a: provider example-ai, real prompt/completion text
    const detailStates = new Map([[spanID, new DetailState()]]);
    const listViewProps = renderAndCapture({ ...mockProps, detailStates });

    const detailRow = listViewProps.itemRenderer(`${spanID}--detail`, {}, spanIndex(spanID) + 1, {});
    render(detailRow);

    expect(screen.getByText('example-ai')).toBeInTheDocument();
    expect(screen.getByText('model-a')).toBeInTheDocument();
    expect(screen.getByText('Tokens:')).toBeInTheDocument();
    expect(screen.getByText('Conversation')).toBeInTheDocument();
    expect(screen.getByText(/Why did the checkout latency regress this afternoon\?/)).toBeInTheDocument();
    expect(screen.getByText(/Latency rose with a slow pod rollout/)).toBeInTheDocument();
  });
});
