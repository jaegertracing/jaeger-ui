// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { SpanDetailSidePanelImpl } from './index';
import DetailState from '../SpanDetail/DetailState';
import traceGenerator from '../../../../demo/trace-generators';
import transformTraceData from '../../../../model/transform-trace-data';

jest.mock('../SpanDetail', () =>
  jest.fn(({ span, focusSpan, linksGetter }) => {
    linksGetter([], 0);
    return (
      <div data-testid="span-detail-mock" data-span-id={span.spanID}>
        <button data-testid="focus-span-button" type="button" onClick={() => focusSpan('test-find')} />
      </div>
    );
  })
);

jest.mock('../../../../model/link-patterns', () => jest.fn(() => []));
jest.mock('../../../../utils/update-ui-find', () => jest.fn());

describe('<SpanDetailSidePanelImpl>', () => {
  let trace;
  let baseProps;

  beforeEach(() => {
    trace = transformTraceData(traceGenerator.trace({ numberOfSpans: 3 })).asOtelTrace();
    baseProps = {
      trace,
      currentViewRangeTime: [0, 1],
      useOtelTerms: false,
      detailStates: new Map(),
      detailLogItemToggle: jest.fn(),
      detailLogsToggle: jest.fn(),
      detailProcessToggle: jest.fn(),
      detailReferencesToggle: jest.fn(),
      detailTagsToggle: jest.fn(),
      detailWarningsToggle: jest.fn(),
      focusUiFindMatches: jest.fn(),
      location: { pathname: '/', search: '', hash: '', state: undefined },
      history: { push: jest.fn() },
    };
  });

  it('renders without crashing', () => {
    render(<SpanDetailSidePanelImpl {...baseProps} />);
    expect(screen.getByTestId('span-detail-mock')).toBeInTheDocument();
  });

  it('shows the root span when detailStates is empty', () => {
    render(<SpanDetailSidePanelImpl {...baseProps} />);
    expect(screen.getByTestId('span-detail-mock').dataset.spanId).toBe(trace.spans[0].spanID);
  });

  it('shows the explicitly selected span when detailStates has an entry', () => {
    const secondSpan = trace.spans[1];
    const detailStates = new Map([[secondSpan.spanID, new DetailState()]]);
    render(<SpanDetailSidePanelImpl {...baseProps} detailStates={detailStates} />);
    expect(screen.getByTestId('span-detail-mock').dataset.spanId).toBe(secondSpan.spanID);
  });

  it('returns null when trace has no spans', () => {
    const emptyTrace = { ...trace, spans: [], spanMap: new Map() };
    const { container } = render(<SpanDetailSidePanelImpl {...baseProps} trace={emptyTrace} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when detailStates references an unknown spanID', () => {
    const detailStates = new Map([['unknown-span-id', new DetailState()]]);
    const { container } = render(<SpanDetailSidePanelImpl {...baseProps} detailStates={detailStates} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls focusUiFindMatches with the uiFind string when focusSpan is invoked', () => {
    render(<SpanDetailSidePanelImpl {...baseProps} />);
    fireEvent.click(screen.getByTestId('focus-span-button'));
    expect(baseProps.focusUiFindMatches).toHaveBeenCalledWith(baseProps.trace, 'test-find', false);
  });
});
