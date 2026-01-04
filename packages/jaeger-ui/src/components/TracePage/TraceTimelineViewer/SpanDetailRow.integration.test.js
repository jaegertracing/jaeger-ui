// Copyright (c) 2026 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Integration test to verify SpanDetailRow does not render expand/collapse icons.
 * This prevents regression where the icon might be accidentally shown in detail rows.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import SpanDetailRow from './SpanDetailRow';
import DetailState from './SpanDetail/DetailState';

// Mock only SpanDetail, NOT SpanTreeOffset - we want to test real SpanTreeOffset behavior
jest.mock('./SpanDetail', () => ({
  __esModule: true,
  default: () => <div data-testid="mocked-span-detail" />,
}));

// Minimal Redux store for SpanTreeOffset's connected component
const mockStore = createStore(() => ({
  traceTimeline: {
    hoverIndentGuideIds: new Set(),
  },
}));

describe('<SpanDetailRow> icon behavior', () => {
  const spanWithChildren = {
    spanID: 'span-with-children',
    traceID: 'trace-id',
    name: 'op-name',
    startTimeUnixMicros: 1000,
    durationMicros: 100,
    depth: 0,
    hasChildren: true,
    childSpans: [{ spanID: 'child-1' }],
    attributes: [],
    events: [],
    links: [],
    inboundLinks: [],
    resource: {
      serviceName: 'service',
      attributes: [],
    },
    status: { code: 'UNSET' },
    kind: 'INTERNAL',
    instrumentationScope: { name: '' },
    warnings: null,
    relativeStartTimeMicros: 0,
    endTimeUnixMicros: 1100,
  };

  const props = {
    color: 'some-color',
    columnDivision: 0.5,
    detailState: new DetailState(),
    onDetailToggled: jest.fn(),
    linksGetter: jest.fn(),
    eventItemToggle: jest.fn(),
    eventsToggle: jest.fn(),
    resourceToggle: jest.fn(),
    linksToggle: jest.fn(),
    warningsToggle: jest.fn(),
    span: spanWithChildren,
    attributesToggle: jest.fn(),
    traceStartTime: 1000,
    focusSpan: jest.fn(),
    currentViewRangeTime: [0, 100],
    traceDuration: 1000,
    useOtelTerms: false,
  };

  it('does not render expand/collapse icon even when span has children', () => {
    render(
      <Provider store={mockStore}>
        <SpanDetailRow {...props} />
      </Provider>
    );

    // SpanTreeOffset renders the icon inside a span with data-testid="icon-wrapper"
    // In a detail row, this icon should NOT be rendered
    expect(screen.queryByTestId('icon-wrapper')).not.toBeInTheDocument();
  });
});
