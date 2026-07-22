// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import SpanBarRow from './SpanBarRow';
import SpanBar from './SpanBar';
import { makeAttributes } from '../../../model/attributes';

vi.mock('./SpanTreeOffset', () => ({
  default: jest.fn(({ span, childrenVisible, onClick }) => (
    <div data-testid="span-tree-offset" onClick={onClick}>
      SpanTreeOffset: {span.spanID} - {childrenVisible ? 'expanded' : 'collapsed'}
    </div>
  )),
}));

vi.mock('./ReferencesButton', () => ({
  default: jest.fn(({ tooltipText, links, children }) => (
    <button
      type="button"
      data-testid="references-button"
      data-tooltip={tooltipText}
      data-references={JSON.stringify(links)}
    >
      {children}
    </button>
  )),
}));

vi.mock('./SpanBar', () => ({
  default: jest.fn(() => <div data-testid="span-bar">SpanBar</div>),
}));

vi.mock('./utils', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    formatDurationCompact: jest.fn(d => `formatted-${d}`),
  };
});

describe('<SpanBarRow>', () => {
  const spanID = 'some-id';
  const defaultProps = {
    className: 'a-class-name',
    color: 'color-a',
    criticalPath: [],
    nameColumnWidth: 0.5,
    isChildrenExpanded: true,
    isDetailExpanded: false,
    isMatchingFilter: false,
    timelineBarsVisible: true,
    onDetailToggled: jest.fn(),
    onChildrenToggled: jest.fn(),
    numTicks: 5,
    rpc: {
      viewStart: 0.25,
      viewEnd: 0.75,
      color: 'color-b',
      operationName: 'rpc-op-name',
      serviceName: 'rpc-service-name',
    },
    hasOwnError: false,
    hasChildError: false,
    getViewedBounds: jest.fn().mockReturnValue({ start: 0.5, end: 0.6 }),
    span: {
      traceId: 'trace-id',
      spanID: spanID,
      name: 'op-name',
      kind: 'SERVER',
      startTime: 100,
      endTime: 200,
      duration: 100,
      attributes: makeAttributes([]),
      events: [],
      links: [],
      status: { code: 'OK' },
      resource: { attributes: makeAttributes([]), serviceName: 'service-name' },
      instrumentationScope: { name: 'scope' },
      depth: 0,
      hasChildren: true,
      relativeStartTime: 100,
      inboundLinks: [],
      warnings: null,
    },
    traceStartTime: 0,
    traceDuration: 1000,
    focusSpan: jest.fn(),
    spanPillsEnabled: false,
    useOtelTerms: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    defaultProps.onDetailToggled.mockReset();
    defaultProps.onChildrenToggled.mockReset();
  });

  it('renders correctly with essential elements', () => {
    render(<SpanBarRow {...defaultProps} />);
    expect(screen.getByTestId('span-tree-offset')).toBeVisible();
    expect(screen.getByRole('switch')).toBeVisible();
  });

  it('triggers onDetailToggled when view area is clicked', () => {
    render(<SpanBarRow {...defaultProps} />);
    const spanView = screen.getByTestId('span-bar').closest('div.span-view');
    fireEvent.click(spanView);
    expect(defaultProps.onDetailToggled).toHaveBeenCalledTimes(1);
    expect(defaultProps.onDetailToggled).toHaveBeenCalledWith(spanID);
  });

  it('triggers onDetailToggled when Enter is pressed on span name', () => {
    render(<SpanBarRow {...defaultProps} />);
    const spanName = screen.getByRole('switch');
    fireEvent.keyDown(spanName, { key: 'Enter' });
    expect(defaultProps.onDetailToggled).toHaveBeenCalledTimes(1);
    expect(defaultProps.onDetailToggled).toHaveBeenCalledWith(spanID);
  });

  it('triggers onDetailToggled when Space is pressed on span name', () => {
    render(<SpanBarRow {...defaultProps} />);
    const spanName = screen.getByRole('switch');
    fireEvent.keyDown(spanName, { key: ' ' });
    expect(defaultProps.onDetailToggled).toHaveBeenCalledTimes(1);
    expect(defaultProps.onDetailToggled).toHaveBeenCalledWith(spanID);
  });

  it('does not trigger onDetailToggled for other keys on span name', () => {
    render(<SpanBarRow {...defaultProps} />);
    const spanName = screen.getByRole('switch');
    fireEvent.keyDown(spanName, { key: 'Tab' });
    expect(defaultProps.onDetailToggled).not.toHaveBeenCalled();
  });

  it('triggers onChildrenToggled when SpanTreeOffset is clicked', () => {
    render(<SpanBarRow {...defaultProps} />);
    const treeOffset = screen.getByTestId('span-tree-offset');
    fireEvent.click(treeOffset);
    expect(defaultProps.onChildrenToggled).toHaveBeenCalledTimes(1);
    expect(defaultProps.onChildrenToggled).toHaveBeenCalledWith(spanID);
  });

  it('shows ReferencesButton when span has multiple references', () => {
    const span = {
      ...defaultProps.span,
      links: [
        { traceId: 't1', spanID: 's1', attributes: [] },
        { traceId: 't2', spanID: 's2', attributes: [] },
      ],
    };
    render(<SpanBarRow {...defaultProps} span={span} />);
    const btn = screen.getByTestId('references-button');
    expect(btn).toBeVisible();
    expect(btn).toHaveAttribute('data-tooltip', 'Contains multiple references');
  });

  it('shows tooltip for a single downstream reference', () => {
    const span = {
      ...defaultProps.span,
      inboundLinks: [{ traceId: 't1', spanID: 's1', attributes: [] }],
    };
    render(<SpanBarRow {...defaultProps} span={span} />);
    const btn = screen.getByTestId('references-button');
    expect(btn).toBeVisible();
    expect(btn).toHaveAttribute('data-tooltip', 'This span is referenced by another span');
  });

  it('shows tooltip for multiple downstream references', () => {
    const span = {
      ...defaultProps.span,
      inboundLinks: [
        { traceId: 't1', spanID: 's1', attributes: [] },
        { traceId: 't2', spanID: 's2', attributes: [] },
      ],
    };
    render(<SpanBarRow {...defaultProps} span={span} />);
    const btn = screen.getByTestId('references-button');
    expect(btn).toBeVisible();
    expect(btn).toHaveAttribute('data-tooltip', 'This span is referenced by multiple other spans');
  });

  it('renders with noInstrumentedServer', () => {
    const props = {
      ...defaultProps,
      rpc: null,
      noInstrumentedServer: {
        color: 'color-c',
        serviceName: 'no-instrumented-service',
      },
    };
    render(<SpanBarRow {...props} />);
    expect(screen.getByText('no-instrumented-service')).toBeVisible();
  });

  it('renders with error icon when hasOwnError is true', () => {
    const props = {
      ...defaultProps,
      hasOwnError: true,
      hasChildError: false,
    };
    render(<SpanBarRow {...props} />);
    expect(document.querySelector('.SpanBarRow--errorIcon')).toBeInTheDocument();
  });

  it('applies is-detail-expanded class when isDetailExpanded is true', () => {
    const props = {
      ...defaultProps,
      isDetailExpanded: true,
    };
    render(<SpanBarRow {...props} />);
    const link = screen.getByRole('switch');
    expect(link).toHaveClass('span-name', 'is-detail-expanded');
  });

  it('applies is-matching-filter classes when isMatchingFilter is true', () => {
    const props = {
      ...defaultProps,
      isMatchingFilter: true,
    };
    render(<SpanBarRow {...props} />);
    const row = screen.getByTestId('span-bar').closest('.span-row');
    expect(row).toHaveClass('is-matching-filter');
    const wrapper = screen.getByTestId('span-tree-offset').parentElement;
    expect(wrapper).toHaveClass('span-name-wrapper', 'is-matching-filter');
  });

  it('applies is-children-collapsed class when isParent is true and isChildrenExpanded is false', () => {
    const props = {
      ...defaultProps,
      isChildrenExpanded: false,
    };
    render(<SpanBarRow {...props} />);
    const svcName = screen.getByText('service-name').closest('.span-svc-name');
    expect(svcName).toHaveClass('span-svc-name', 'is-children-collapsed');
  });

  describe('tree-only mode (timelineBarsVisible=false)', () => {
    // TraceTimelineViewer passes nameColumnWidth=1 when timeline bars are hidden.
    const barsHiddenProps = { ...defaultProps, timelineBarsVisible: false, nameColumnWidth: 1 };

    it('does not render the span-view cell', () => {
      render(<SpanBarRow {...barsHiddenProps} />);
      expect(screen.queryByTestId('span-bar')).not.toBeInTheDocument();
    });

    it('renders the span name column at full width', () => {
      const { container } = render(<SpanBarRow {...barsHiddenProps} />);
      const nameCell = container.querySelector('.span-name-column');
      expect(nameCell).toHaveStyle('flex-basis: 100%');
      expect(nameCell).toHaveStyle('max-width: 100%');
    });
  });

  describe('span pills', () => {
    it('renders pills with error styling for 5xx status codes', () => {
      render(
        <SpanBarRow
          {...defaultProps}
          spanPillsEnabled
          span={{
            ...defaultProps.span,
            attributes: makeAttributes([{ key: 'http.status_code', value: '500' }]),
          }}
        />
      );
      const errorPill = screen.getByLabelText('http.status_code: 500');
      expect(errorPill).toBeInTheDocument();
      expect(errorPill).toHaveClass('is-error');
    });

    it('renders neutral pills without error styling for non-5xx', () => {
      render(
        <SpanBarRow
          {...defaultProps}
          spanPillsEnabled
          span={{
            ...defaultProps.span,
            attributes: makeAttributes([{ key: 'http.status_code', value: '200' }]),
          }}
        />
      );
      const pill = screen.getByLabelText('http.status_code: 200');
      expect(pill).toBeInTheDocument();
      expect(pill).not.toHaveClass('is-error');
    });

    it('does not render pills when spanPillsEnabled is false', () => {
      render(
        <SpanBarRow
          {...defaultProps}
          spanPillsEnabled={false}
          span={{
            ...defaultProps.span,
            attributes: makeAttributes([{ key: 'http.status_code', value: '200' }]),
          }}
        />
      );
      expect(screen.queryByLabelText(/http\.status_code/)).not.toBeInTheDocument();
    });

    it('renders a pill for gen_ai.request.model', () => {
      render(
        <SpanBarRow
          {...defaultProps}
          spanPillsEnabled
          span={{
            ...defaultProps.span,
            attributes: makeAttributes([{ key: 'gen_ai.request.model', value: 'gpt-4o' }]),
          }}
        />
      );
      const pill = screen.getByLabelText('gen_ai.request.model: gpt-4o');
      expect(pill).toBeInTheDocument();
      expect(pill).not.toHaveClass('is-error');
    });

    it('renders both an http status pill and a gen_ai.request.model pill when both are present', () => {
      render(
        <SpanBarRow
          {...defaultProps}
          spanPillsEnabled
          span={{
            ...defaultProps.span,
            attributes: makeAttributes([
              { key: 'http.status_code', value: '500' },
              { key: 'gen_ai.request.model', value: 'claude-3-haiku' },
            ]),
          }}
        />
      );
      expect(screen.getByLabelText('http.status_code: 500')).toBeInTheDocument();
      expect(screen.getByLabelText('gen_ai.request.model: claude-3-haiku')).toBeInTheDocument();
    });

    it('renders multiple pills from span attributes', () => {
      render(
        <SpanBarRow
          {...defaultProps}
          spanPillsEnabled
          span={{
            ...defaultProps.span,
            attributes: makeAttributes([
              { key: 'http.status_code', value: '200' },
              { key: 'http.method', value: 'GET' },
            ]),
          }}
        />
      );
      expect(screen.getByLabelText('http.status_code: 200')).toBeInTheDocument();
      expect(screen.getByLabelText('http.method: GET')).toBeInTheDocument();
    });

    it('shows the pill label and value as a tooltip on hover', async () => {
      render(
        <SpanBarRow
          {...defaultProps}
          spanPillsEnabled
          span={{
            ...defaultProps.span,
            attributes: makeAttributes([{ key: 'http.status_code', value: '200' }]),
          }}
        />
      );
      fireEvent.mouseEnter(screen.getByLabelText('http.status_code: 200').parentElement);
      expect(await screen.findByRole('tooltip')).toHaveTextContent('http.status_code: 200');
    });

    it('shows the full label and value in the tooltip, so a CSS-truncated pill value is still discoverable on hover', async () => {
      const longModel = 'gpt-4o-2024-08-06-fine-tuned-deployment-name';
      render(
        <SpanBarRow
          {...defaultProps}
          spanPillsEnabled
          span={{
            ...defaultProps.span,
            attributes: makeAttributes([{ key: 'gen_ai.request.model', value: longModel }]),
          }}
        />
      );
      const pill = screen.getByLabelText(`gen_ai.request.model: ${longModel}`);
      fireEvent.mouseEnter(pill.parentElement);
      expect(await screen.findByRole('tooltip')).toHaveTextContent(`gen_ai.request.model: ${longModel}`);
    });
  });

  it('sets longLabel and hintSide to right when viewStart <= 1 - viewEnd', () => {
    const getViewedBounds = jest.fn().mockReturnValue({ start: 0.2, end: 0.3 });
    const props = {
      ...defaultProps,
      getViewedBounds,
      span: {
        ...defaultProps.span,
        startTime: 100,
        duration: 50,
      },
    };
    render(<SpanBarRow {...props} />);
    expect(SpanBar).toHaveBeenCalledWith(
      expect.objectContaining({
        longLabel: 'formatted-50 | service-name::op-name',
        hintSide: 'right',
      }),
      undefined
    );
  });

  describe('GenAI icon', () => {
    it('shows no GenAI icon for a standard span', () => {
      render(<SpanBarRow {...defaultProps} />);
      expect(
        screen.queryByRole('img', { name: /LLM call|MCP Tool call|AI Agent|Retrieval|GenAI span/ })
      ).not.toBeInTheDocument();
    });

    it('shows an LLM call icon when span.genAIKind=LLM_CALL', () => {
      const span = { ...defaultProps.span, genAIKind: 'LLM_CALL' };
      render(<SpanBarRow {...defaultProps} span={span} />);
      expect(screen.getByRole('img', { name: 'LLM call' })).toBeInTheDocument();
    });

    it('shows a tool call icon when span.genAIKind=TOOL_CALL', () => {
      const span = { ...defaultProps.span, genAIKind: 'TOOL_CALL' };
      render(<SpanBarRow {...defaultProps} span={span} />);
      expect(screen.getByRole('img', { name: 'MCP Tool call' })).toBeInTheDocument();
    });

    it('shows an agent icon when span.genAIKind=AGENT', () => {
      const span = { ...defaultProps.span, genAIKind: 'AGENT' };
      render(<SpanBarRow {...defaultProps} span={span} />);
      expect(screen.getByRole('img', { name: 'AI Agent' })).toBeInTheDocument();
    });

    it('shows a retrieval icon when span.genAIKind=RETRIEVAL', () => {
      const span = { ...defaultProps.span, genAIKind: 'RETRIEVAL' };
      render(<SpanBarRow {...defaultProps} span={span} />);
      expect(screen.getByRole('img', { name: 'Retrieval' })).toBeInTheDocument();
    });

    it('shows a generic GenAI icon when span.genAIKind=UNKNOWN_GENAI', () => {
      const span = { ...defaultProps.span, genAIKind: 'UNKNOWN_GENAI' };
      render(<SpanBarRow {...defaultProps} span={span} />);
      expect(screen.getByRole('img', { name: 'GenAI span' })).toBeInTheDocument();
    });

    it('does not also render the generic namespace icon for a span with gen_ai attributes, only the kind-specific GenAISpanIcon (#4217)', () => {
      const span = {
        ...defaultProps.span,
        genAIKind: 'LLM_CALL',
        attributes: makeAttributes([{ key: 'gen_ai.system', value: 'openai' }]),
      };
      const { container } = render(<SpanBarRow {...defaultProps} span={span} />);
      // getSpanIconComponent's generic namespace icon (aria-hidden, rendered via
      // this class) must not appear alongside GenAISpanIcon's kind-specific icon -
      // that combination was the reported double-sparkle/double-icon rendering.
      expect(container.querySelector('.SpanBarRow--spanTypeIcon')).not.toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'LLM call' })).toBeInTheDocument();
    });

    it('suppresses the generic namespace icon even when a GenAI span also carries http attributes, not just gen_ai ones (#4217)', () => {
      // Regression case found by testing against a real trace: the root HTTP
      // server span for a GenAI agent's own endpoint carries both gen_ai.* and
      // real http.* attributes (http.request.method, http.response.status_code,
      // etc.). Removing only the gen_ai entry from the generic icon's namespace
      // map was not enough - the icon then fell through to http's globe icon
      // instead, recreating the same double-icon bug with a different pair of
      // icons. The generic icon must be suppressed for any GenAI-classified span
      // regardless of what other namespaces it also has attributes from.
      const span = {
        ...defaultProps.span,
        genAIKind: 'AGENT',
        attributes: makeAttributes([
          { key: 'gen_ai.operation.name', value: 'invoke_agent' },
          { key: 'http.request.method', value: 'POST' },
          { key: 'http.response.status_code', value: 200 },
        ]),
      };
      const { container } = render(<SpanBarRow {...defaultProps} span={span} />);
      expect(container.querySelector('.SpanBarRow--spanTypeIcon')).not.toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'AI Agent' })).toBeInTheDocument();
    });
  });
});
