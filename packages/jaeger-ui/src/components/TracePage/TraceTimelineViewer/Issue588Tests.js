// 1) UI: renders a distinct, clickable bubbled error pill and calls focus with descendant IDs; solid icon for on-span errors.
// packages/jaeger-ui/src/components/TracePage/TraceTimelineViewer/SpanBarRow.bubbledError.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import SpanBarRow from './SpanBarRow';

jest.mock('./SpanTreeOffset', () => ({
  __esModule: true,
  default: jest.fn(({ span, childrenVisible, onClick }) => (
    <div data-testid="span-tree-offset" onClick={onClick}>
      SpanTreeOffset: {span.spanID} - {childrenVisible ? 'expanded' : 'collapsed'}
    </div>
  )),
}));

jest.mock('./SpanBar', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="span-bar">SpanBar</div>),
}));

describe('SpanBarRow bubbled error pill', () => {
  const spanID = 'parent-1';
  const baseProps = {
    className: '',
    color: '#000',
    criticalPath: [],
    columnDivision: 0.5,
    isChildrenExpanded: false,
    isDetailExpanded: false,
    isMatchingFilter: false,
    onDetailToggled: jest.fn(),
    onChildrenToggled: jest.fn(),
    numTicks: 5,
    rpc: null,
    noInstrumentedServer: null,
    showErrorIcon: true,
    hasOwnError: false,
    bubbledErrorIds: ['e-1', 'e-2'],
    getViewedBounds: jest.fn().mockReturnValue({ start: 0.1, end: 0.2 }),
    traceStartTime: 0,
    traceDuration: 1000,
    span: {
      duration: 10,
      hasChildren: true,
      operationName: 'op',
      process: { serviceName: 'svc' },
      spanID,
      logs: [],
      startTime: 100,
    },
    focusSpan: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a distinct bubbled error pill and focuses descendant errors on click', () => {
    render(<SpanBarRow {...baseProps} />);

    const pill = screen.getByTitle('Click to navigate to descendant error span(s)');
    expect(pill).toBeInTheDocument();

    fireEvent.click(pill);
    expect(baseProps.focusSpan).toHaveBeenCalledWith('e-1 e-2');
    expect(baseProps.onDetailToggled).not.toHaveBeenCalled();
  });

  it('renders solid error icon for on-span error and no bubbled pill', () => {
    render(<SpanBarRow {...baseProps} hasOwnError bubbledErrorIds={[]} showErrorIcon />);

    // solid icon present
    expect(document.querySelector('.SpanBarRow--errorIcon')).toBeInTheDocument();
    // bubbled pill absent
    expect(screen.queryByTitle('Click to navigate to descendant error span(s)')).not.toBeInTheDocument();
  });
});

// 2) Logic: collects descendant errored span IDs correctly.
// packages/jaeger-ui/src/components/TracePage/TraceTimelineViewer/utils.bubbledError.test.js
import { getDescendantErroredSpanIDs } from './utils';

describe('getDescendantErroredSpanIDs', () => {
  function span({ spanID, depth, tags = [] }) {
    return {
      spanID,
      depth,
      tags,
      // minimal fields not used by this util
      duration: 1,
      hasChildren: false,
      operationName: 'op',
      process: { serviceName: 'svc' },
      logs: [],
      startTime: 0,
    };
  }

  it('returns IDs of descendant spans with error tag until depth unwinds', () => {
    const spans = [
      span({ spanID: 'root', depth: 0 }),
      span({ spanID: 'parent', depth: 1 }),
      span({ spanID: 'child-ok', depth: 2 }),
      span({ spanID: 'child-err', depth: 2, tags: [{ key: 'error', value: true }] }),
      span({ spanID: 'grandchild-err', depth: 3, tags: [{ key: 'error', value: 'true' }] }),
      // depth drops back to 1 -> stop scanning descendants of parent
      span({ spanID: 'sibling-of-parent', depth: 1 }),
    ];

    const ids = getDescendantErroredSpanIDs(spans, 1);
    expect(ids).toEqual(['child-err', 'grandchild-err']);
  });

  it('returns empty when no descendants have errors', () => {
    const spans = [
      span({ spanID: 'root', depth: 0 }),
      span({ spanID: 'parent', depth: 1 }),
      span({ spanID: 'child-ok', depth: 2 }),
      span({ spanID: 'child-ok-2', depth: 2 }),
      span({ spanID: 'sibling-of-parent', depth: 1 }),
    ];
    const ids = getDescendantErroredSpanIDs(spans, 1);
    expect(ids).toEqual([]);
  });
});
