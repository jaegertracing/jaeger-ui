// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { SpanDetailSidePanelImpl } from './index';
import SpanDetail from '../SpanDetail';
import DetailState from '../SpanDetail/DetailState';
import * as track from '../store.track';
import traceGenerator from '../../../../demo/trace-generators';
import transformTraceData from '../../../../model/transform-trace-data';

vi.mock('../SpanDetail', () =>
  mockDefault(
    jest.fn(({ span, focusSpan, linksGetter }) => {
      linksGetter([], 0);
      return (
        <div data-testid="span-detail-mock" data-span-id={span.spanID}>
          <button data-testid="focus-span-button" type="button" onClick={() => focusSpan('test-find')} />
        </div>
      );
    })
  )
);

vi.mock('../../../../model/link-patterns', () => mockDefault(jest.fn(() => [])));
vi.mock('../../../../utils/update-ui-find');
vi.mock('../store.track');

const mockZustandState = vi.hoisted(() => ({
  detailStates: new Map(),
  detailLogItemToggle: jest.fn(),
  detailLogsToggle: jest.fn(),
  detailProcessToggle: jest.fn(),
  detailReferencesToggle: jest.fn(),
  detailTagsToggle: jest.fn(),
  detailWarningsToggle: jest.fn(),
  focusUiFindMatches: jest.fn(),
}));

vi.mock('../store', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    useTraceTimelineStore: selector => selector(mockZustandState),
    getSelectedSpanID: detailStatesArg =>
      detailStatesArg.size > 0 ? detailStatesArg.keys().next().value : null,
  };
});

describe('<SpanDetailSidePanelImpl>', () => {
  let trace;
  let baseProps;

  beforeEach(() => {
    trace = transformTraceData(traceGenerator.trace({ numberOfSpans: 3 })).asOtelTrace();
    baseProps = {
      trace,
      currentViewRangeTime: [0, 1],
      useOtelTerms: false,
      location: { pathname: '/', search: '', hash: '', state: undefined },
      navigate: jest.fn(),
    };
    // reset Zustand mock state
    mockZustandState.detailStates = new Map();
    vi.clearAllMocks();
    Object.values(mockZustandState).forEach(v => typeof v === 'function' && v.mockReset?.());
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
    mockZustandState.detailStates = new Map([[secondSpan.spanID, new DetailState()]]);
    render(<SpanDetailSidePanelImpl {...baseProps} />);
    expect(screen.getByTestId('span-detail-mock').dataset.spanId).toBe(secondSpan.spanID);
  });

  it('returns null when trace has no spans', () => {
    const emptyTrace = { ...trace, spans: [], spanMap: new Map(), rootSpans: [] };
    const { container } = render(<SpanDetailSidePanelImpl {...baseProps} trace={emptyTrace} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when detailStates references an unknown spanID', () => {
    mockZustandState.detailStates = new Map([['unknown-span-id', new DetailState()]]);
    const { container } = render(<SpanDetailSidePanelImpl {...baseProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls focusUiFindMatches when focusSpan is invoked', () => {
    render(<SpanDetailSidePanelImpl {...baseProps} />);
    fireEvent.click(screen.getByTestId('focus-span-button'));
    expect(mockZustandState.focusUiFindMatches).toHaveBeenCalledWith(baseProps.trace, 'test-find', false);
  });

  it('tracks each section toggle before updating the store', () => {
    render(<SpanDetailSidePanelImpl {...baseProps} />);
    const props = SpanDetail.mock.lastCall[0];
    const { spanID } = trace.spans[0];
    const logItem = { name: 'log' };
    const cases = [
      [props.attributesToggle, track.trackDetailTagsToggle, mockZustandState.detailTagsToggle],
      [props.resourceToggle, track.trackDetailProcessToggle, mockZustandState.detailProcessToggle],
      [props.eventsToggle, track.trackDetailLogsToggle, mockZustandState.detailLogsToggle],
    ];
    cases.forEach(([toggle, tracker, storeAction]) => {
      toggle(spanID);
      expect(tracker).toHaveBeenCalledWith(spanID);
      expect(storeAction).toHaveBeenCalledWith(spanID);
      expect(tracker.mock.invocationCallOrder[0]).toBeLessThan(storeAction.mock.invocationCallOrder[0]);
    });

    props.eventItemToggle(spanID, logItem);
    expect(track.trackDetailLogItemToggle).toHaveBeenCalledWith(spanID, logItem);
    expect(mockZustandState.detailLogItemToggle).toHaveBeenCalledWith(spanID, logItem);
    expect(track.trackDetailLogItemToggle.mock.invocationCallOrder[0]).toBeLessThan(
      mockZustandState.detailLogItemToggle.mock.invocationCallOrder[0]
    );
  });

  it('passes eventsInitialVisibleCount={10} to SpanDetail', () => {
    render(<SpanDetailSidePanelImpl {...baseProps} />);
    const props = SpanDetail.mock.lastCall[0];
    expect(props.eventsInitialVisibleCount).toBe(10);
  });

  it('passes a side-panel default detailState with attributes and resource expanded when no span is selected', () => {
    render(<SpanDetailSidePanelImpl {...baseProps} />);
    const { detailState } = SpanDetail.mock.lastCall[0];
    expect(detailState.isAttributesOpen).toBe(true);
    expect(detailState.isResourceOpen).toBe(true);
  });
});
