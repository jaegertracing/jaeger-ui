// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import SpanBarRow from './SpanBarRow';
import SpanBar from './SpanBar';

jest.mock('./SpanTreeOffset', () => ({
  __esModule: true,
  default: jest.fn(({ span, childrenVisible, onClick }) => (
    <div data-testid="span-tree-offset" onClick={onClick}>
      SpanTreeOffset: {span.spanID} - {childrenVisible ? 'expanded' : 'collapsed'}
    </div>
  )),
}));

jest.mock('./ReferencesButton', () => ({
  __esModule: true,
  default: jest.fn(({ tooltipText, references, children }) => (
    <button
      type="button"
      data-testid="references-button"
      data-tooltip={tooltipText}
      data-references={JSON.stringify(references)}
    >
      {children}
    </button>
  )),
}));

jest.mock('./SpanBar', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="span-bar">SpanBar</div>),
}));

jest.mock('./utils', () => ({
  formatDuration: jest.fn(d => `formatted-${d}`),
  ViewedBoundsFunctionType: {},
}));

describe('<SpanBarRow>', () => {
  const spanID = 'some-id';
  const defaultProps = {
    className: 'a-class-name',
    color: 'color-a',
    criticalPath: [],
    columnDivision: 0.5,
    isChildrenExpanded: true,
    isDetailExpanded: false,
    isMatchingFilter: false,
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
    showErrorIcon: false,
    getViewedBounds: jest.fn().mockReturnValue({ start: 0.5, end: 0.6 }),
    span: {
      duration: 100,
      hasChildren: true,
      operationName: 'op-name',
      process: {
        serviceName: 'service-name',
      },
      spanID,
      logs: [],
      startTime: 100,
    },
    traceStartTime: 0,
    traceDuration: 1000,
    focusSpan: jest.fn(),
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
      references: [
        { refType: 'CHILD_OF', traceID: 't1', spanID: 's1', span: { spanID: 's1' } },
        { refType: 'CHILD_OF', traceID: 't2', spanID: 's2', span: { spanID: 's2' } },
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
      subsidiarilyReferencedBy: [
        { refType: 'CHILD_OF', traceID: 't1', spanID: 's1', span: { spanID: 's1' } },
      ],
    };
    render(<SpanBarRow {...defaultProps} span={span} />);
    const btn = screen.getByTestId('references-button');
    expect(btn).toBeVisible();
    expect(btn).toHaveAttribute('data-tooltip', 'This span is referenced by another span');
  });

  it('shows tooltip for multiple downstream references', () => {
    const span = {
      ...defaultProps.span,
      subsidiarilyReferencedBy: [
        { refType: 'CHILD_OF', traceID: 't1', spanID: 's1', span: { spanID: 's1' } },
        { refType: 'CHILD_OF', traceID: 't2', spanID: 's2', span: { spanID: 's2' } },
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

  it('renders with error icon when showErrorIcon is true', () => {
    const props = {
      ...defaultProps,
      showErrorIcon: true,
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

  it('renders the status column with static "ok" text', () => {
    render(<SpanBarRow {...defaultProps} />);
    const statusColumn = document.querySelector('.trace-timeline__status-column');
    expect(statusColumn).toBeInTheDocument();
    expect(statusColumn).toHaveTextContent('ok');
  });
});
