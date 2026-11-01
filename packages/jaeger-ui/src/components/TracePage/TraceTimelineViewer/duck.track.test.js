// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

vi.mock('../../../utils/tracking');

import _set from 'lodash/set';
import _cloneDeep from 'lodash/cloneDeep';

import DetailState from './SpanDetail/DetailState';
import * as track from './duck.track';
import { actionTypes as types } from './duck';
import { trackEvent } from '../../../utils/tracking';
import { queryClient } from '../../../query/app-query-client';
import { useTraceTimelineStore } from './store.timeline';

describe('middlewareHooks', () => {
  const traceID = 'ABC';
  const spanID = 'abc';
  const spanDepth = 123;
  const columnWidth = { real: 0.15, tracked: 150 };
  const payload = { spanID };
  const traceData = { spans: [{ spanID, depth: spanDepth }] };
  const state = {
    traceTimeline: {
      traceID,
      childrenHiddenIDs: new Map(),
      detailStates: new Map([[spanID, new DetailState()]]),
    },
  };
  let stateClone;
  const store = {
    getState() {
      return stateClone;
    },
  };

  beforeEach(() => {
    trackEvent.mockClear();
    stateClone = _cloneDeep(state);
    // Seed the React Query cache so trackParent can find the trace by ID.
    queryClient.setQueryData(['trace', traceID], traceData);
  });

  afterEach(() => {
    queryClient.removeQueries({ queryKey: ['trace'] });
    useTraceTimelineStore.setState({
      traceID: null,
      traceSpans: null,
      childrenHiddenIDs: new Set(),
      detailStates: new Map(),
      shouldScrollToFirstUiFindMatch: false,
      prunedServices: new Set(),
    });
  });

  const cases = [
    {
      msg: 'tracks a GA event for resizing the span name column',
      type: types.SET_SPAN_NAME_COLUMN_WIDTH,
      payloadCustom: { width: columnWidth.real },
      category: track.CATEGORY_COLUMN,
      extraTrackArgs: [columnWidth.tracked],
    },
    {
      action: track.ACTION_COLLAPSE_ALL,
      category: track.CATEGORY_EXPAND_COLLAPSE,
      msg: 'tracks a GA event for collapsing all',
      type: types.COLLAPSE_ALL,
    },
    {
      action: track.ACTION_COLLAPSE_ONE,
      category: track.CATEGORY_EXPAND_COLLAPSE,
      msg: 'tracks a GA event for collapsing a level',
      type: types.COLLAPSE_ONE,
    },
    {
      msg: 'tracks a GA event for collapsing a parent',
      type: types.CHILDREN_TOGGLE,
      category: track.CATEGORY_PARENT,
      extraTrackArgs: [123],
    },
    {
      msg: 'tracks a single GA event for subtree collapse',
      type: types.CHILDREN_TOGGLE_SUBTREE,
      payloadCustom: { spanID, subtreeParentIDs: [spanID] },
      category: track.CATEGORY_PARENT,
      extraTrackArgs: [123],
    },
    {
      msg: 'handles no payload in trackParent',
      type: types.CHILDREN_TOGGLE,
      payloadCustom: null,
      category: track.CATEGORY_PARENT,
      noOp: true,
    },
    {
      msg: 'handles no traceID in trackParent',
      type: types.CHILDREN_TOGGLE,
      stateOverrides: new Map([['traceTimeline.traceID', null]]),
      category: track.CATEGORY_PARENT,
      noOp: true,
    },
    {
      msg: 'handles no trace data in trackParent',
      type: types.CHILDREN_TOGGLE,
      stateOverrides: new Map([['traceTimeline.traceID', `not-${traceID}`]]),
      category: track.CATEGORY_PARENT,
      noOp: true,
    },
    {
      msg: 'handles missing spanID in trackParent',
      type: types.CHILDREN_TOGGLE,
      payloadCustom: { spanID: 'missing spanID' },
      category: track.CATEGORY_PARENT,
      noOp: true,
    },
    {
      msg: 'handles unknown traceID (no cache match) in trackParent',
      type: types.CHILDREN_TOGGLE,
      stateOverrides: new Map([['traceTimeline.traceID', `00${traceID}`]]),
      category: track.CATEGORY_PARENT,
      noOp: true,
    },
    {
      action: track.ACTION_EXPAND_ALL,
      category: track.CATEGORY_EXPAND_COLLAPSE,
      msg: 'tracks a GA event for expanding all',
      type: types.EXPAND_ALL,
    },
    {
      action: track.ACTION_EXPAND_ONE,
      category: track.CATEGORY_EXPAND_COLLAPSE,
      msg: 'tracks a GA event for expanding a level',
      type: types.EXPAND_ONE,
    },
    {
      msg: 'tracks a GA event for toggling a detail row',
      type: types.DETAIL_TOGGLE,
      category: track.CATEGORY_ROW,
    },
    {
      msg: 'tracks a GA event for toggling the span tags',
      type: types.DETAIL_TAGS_TOGGLE,
      category: track.CATEGORY_TAGS,
    },
    {
      msg: 'tracks a GA event for toggling the span tags',
      type: types.DETAIL_PROCESS_TOGGLE,
      category: track.CATEGORY_PROCESS,
    },
    {
      msg: 'tracks a GA event for toggling the span logs view',
      type: types.DETAIL_LOGS_TOGGLE,
      category: track.CATEGORY_LOGS,
    },
    {
      msg: 'handles no detailState in trackDetailState',
      type: types.DETAIL_TAGS_TOGGLE,
      payloadCustom: { spanID: 'no details here' },
      category: track.CATEGORY_ROW,
      noOp: true,
    },
    {
      msg: 'tracks a GA event for toggling the span logs view',
      type: types.DETAIL_LOG_ITEM_TOGGLE,
      payloadCustom: { ...payload, logItem: {} },
      category: track.CATEGORY_LOGS_ITEM,
    },
    {
      msg: 'handles no payload in trackLogsitem',
      type: types.DETAIL_LOG_ITEM_TOGGLE,
      payloadCustom: null,
      category: track.CATEGORY_LOGS_ITEM,
      noOp: true,
    },
    {
      msg: 'handles no logItem in payload in trackLogsitem',
      type: types.DETAIL_LOG_ITEM_TOGGLE,
      payloadCustom: {},
      category: track.CATEGORY_LOGS_ITEM,
      noOp: true,
    },
    {
      msg: 'handles no logItem in payload in trackLogsitem',
      type: types.DETAIL_LOG_ITEM_TOGGLE,
      payloadCustom: { spanID: 'no details here', logItem: {} },
      category: track.CATEGORY_LOGS_ITEM,
      noOp: true,
    },
    {
      msg: 'tracks a GA event for changing detail panel mode',
      type: types.SET_DETAIL_PANEL_MODE,
      payloadCustom: { mode: 'sidepanel' },
      category: track.CATEGORY_PANEL_MODE,
      action: 'sidepanel',
    },
    {
      msg: 'tracks a GA event for changing timeline visibility',
      type: types.SET_TIMELINE_BARS_VISIBLE,
      payloadCustom: { visible: true },
      category: track.CATEGORY_TIMELINE_VISIBLE,
      action: 'true',
    },
    {
      msg: 'tracks a GA event for resizing the side panel',
      type: types.SET_SIDE_PANEL_WIDTH,
      payloadCustom: { width: columnWidth.real },
      category: track.CATEGORY_COLUMN,
      extraTrackArgs: [columnWidth.tracked],
    },
  ];

  cases.forEach(
    ({
      action = expect.any(String),
      msg,
      noOp = false,
      stateOverrides = new Map(),
      type,
      category,
      extraTrackArgs = [],
      payloadCustom,
    }) => {
      it(`${msg}`, () => {
        const reduxAction = {
          type,
          payload: payloadCustom !== undefined ? payloadCustom : payload,
        };
        stateOverrides.forEach((value, path) => {
          _set(stateClone, path, value);
        });
        track.middlewareHooks[type](store, reduxAction);
        if (noOp) expect(trackEvent).not.toHaveBeenCalled();
        else {
          expect(trackEvent.mock.calls.length).toBe(1);
          expect(trackEvent.mock.calls[0]).toEqual([category, action, ...extraTrackArgs]);
        }
      });
    }
  );

  it('has the correct keys and they refer to functions', () => {
    expect(Object.keys(track.middlewareHooks).sort()).toEqual(
      [
        types.CHILDREN_TOGGLE,
        types.CHILDREN_TOGGLE_SUBTREE,
        types.COLLAPSE_ALL,
        types.COLLAPSE_ONE,
        types.DETAIL_TOGGLE,
        types.DETAIL_TAGS_TOGGLE,
        types.DETAIL_PROCESS_TOGGLE,
        types.DETAIL_LOGS_TOGGLE,
        types.DETAIL_LOG_ITEM_TOGGLE,
        types.EXPAND_ALL,
        types.EXPAND_ONE,
        types.SET_DETAIL_PANEL_MODE,
        types.SET_SIDE_PANEL_WIDTH,
        types.SET_SPAN_NAME_COLUMN_WIDTH,
        types.SET_TIMELINE_BARS_VISIBLE,
      ].sort()
    );
  });

  describe('same-ID reload expand/collapse analytics regression tests', () => {
    it('records the actual UI toggle value for parent span after same-ID reload with search', () => {
      const reloadTraceID = 'trace-reload-id';
      const attributes = { entries: () => [] };
      const resource = { serviceName: 'service', attributes };
      const rootSpan = { spanID: 'root', name: 'root', depth: 0, hasChildren: true, attributes, resource };
      const parentSpan = {
        spanID: 'parent',
        name: 'parent',
        depth: 1,
        hasChildren: true,
        parentSpan: rootSpan,
        attributes,
        resource,
      };
      const child1 = {
        spanID: 'child-1',
        name: 'other',
        depth: 2,
        parentSpan,
        attributes,
        resource,
      };
      const child2 = {
        spanID: 'child-2',
        name: 'late-match',
        depth: 2,
        parentSpan,
        attributes,
        resource,
      };

      const partialTrace = {
        traceID: reloadTraceID,
        spans: [rootSpan, parentSpan, child1],
      };
      const reloadedTrace = {
        traceID: reloadTraceID,
        spans: [rootSpan, parentSpan, child1, child2],
      };

      // 1. Open partial trace and cache it
      queryClient.setQueryData(['trace', reloadTraceID], partialTrace);

      // 2. Enter search term 'late-match'. In partial trace, no spans match, so root & parent are collapsed.
      useTraceTimelineStore.getState().setTrace(partialTrace, 'late-match');
      expect(useTraceTimelineStore.getState().childrenHiddenIDs.has('parent')).toBe(true);

      // In Redux, state was also initialized with the partial trace and collapsed parent
      const reduxStore = {
        getState: () => ({
          traceTimeline: {
            traceID: reloadTraceID,
            childrenHiddenIDs: new Set(['root', 'parent']),
            detailStates: new Map(),
          },
        }),
      };

      // 3. Reload the same trace ID with new matching span (child2 matches 'late-match')
      queryClient.setQueryData(['trace', reloadTraceID], reloadedTrace);
      // Redux setTrace returns early on same-ID reload, leaving stale collapsed parent in Redux.
      // Zustand recomputes find-focus row states and unhides (expands) root & parent:
      useTraceTimelineStore.getState().setTrace(reloadedTrace, 'late-match');

      // Ensure the Zustand state differs from the stale Redux state:
      expect(reduxStore.getState().traceTimeline.childrenHiddenIDs.has('parent')).toBe(true);
      expect(useTraceTimelineStore.getState().childrenHiddenIDs.has('parent')).toBe(false);

      // 4. User clicks to collapse the parent span in the UI
      track.middlewareHooks[types.CHILDREN_TOGGLE](reduxStore, {
        type: types.CHILDREN_TOGGLE,
        payload: { spanID: 'parent' },
      });

      // 5. Verify that the analytics event records 'close' (matching actual UI state) rather than 'open' from stale Redux
      expect(trackEvent).toHaveBeenCalledTimes(1);
      expect(trackEvent).toHaveBeenCalledWith(track.CATEGORY_PARENT, 'close', parentSpan.depth);
    });

    it('records open when toggling a span that is collapsed in UI but not in Redux', () => {
      const reloadTraceID = 'trace-reload-id-2';
      const attributes = { entries: () => [] };
      const resource = { serviceName: 'service', attributes };
      const rootSpan = { spanID: 'root', name: 'root', depth: 0, hasChildren: true, attributes, resource };
      const parentSpan = {
        spanID: 'parent',
        name: 'parent',
        depth: 1,
        hasChildren: true,
        parentSpan: rootSpan,
        attributes,
        resource,
      };
      const child = { spanID: 'child', name: 'child', depth: 2, parentSpan, attributes, resource };
      const traceDataForTest = { traceID: reloadTraceID, spans: [rootSpan, parentSpan, child] };

      queryClient.setQueryData(['trace', reloadTraceID], traceDataForTest);
      useTraceTimelineStore.getState().setTrace(traceDataForTest);
      // Collapse parent in Zustand
      useTraceTimelineStore.setState({
        childrenHiddenIDs: new Set(['parent']),
      });

      // Stale Redux where parent is not in childrenHiddenIDs
      const reduxStore = {
        getState: () => ({
          traceTimeline: {
            traceID: reloadTraceID,
            childrenHiddenIDs: new Set(),
            detailStates: new Map(),
          },
        }),
      };

      track.middlewareHooks[types.CHILDREN_TOGGLE](reduxStore, {
        type: types.CHILDREN_TOGGLE,
        payload: { spanID: 'parent' },
      });

      expect(trackEvent).toHaveBeenCalledTimes(1);
      expect(trackEvent).toHaveBeenCalledWith(track.CATEGORY_PARENT, 'open', parentSpan.depth);
    });
  });
});
