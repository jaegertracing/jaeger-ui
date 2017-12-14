// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { createStore } from 'redux';

import reducer, { actions, newInitialState } from './duck';
import DetailState from './SpanDetail/DetailState';
import transformTraceData from '../../../model/transform-trace-data';
import traceGenerator from '../../../demo/trace-generators';

describe('TraceTimelineViewer/duck', () => {
  const trace = transformTraceData(traceGenerator.trace({ numberOfSpans: 10 }));
  const searchSetup = {
    uniqueText: '--something-unique',
    spanID: trace.spans[0].spanID,
  };
  trace.spans[0].operationName += searchSetup.uniqueText;

  let store;

  beforeEach(() => {
    store = createStore(reducer, newInitialState(trace));
  });

  it('the initial state has no details, collapsed children or text search', () => {
    const state = store.getState();
    expect(state.childrenHiddenIDs).toEqual(new Set());
    expect(state.findMatches).not.toBeDefined();
    expect(state.detailStates).toEqual(new Map());
  });

  it('sets the span column width', () => {
    const n = 0.5;
    let width = store.getState().spanNameColumnWidth;
    expect(width).toBeGreaterThanOrEqual(0);
    expect(width).toBeLessThanOrEqual(1);
    const action = actions.setSpanNameColumnWidth(n);
    store.dispatch(action);
    width = store.getState().spanNameColumnWidth;
    expect(width).toBe(n);
  });

  it('retains all state when setting to the same traceID', () => {
    const state = store.getState();
    const action = actions.setTrace(trace.traceID);
    store.dispatch(action);
    expect(store.getState()).toBe(state);
  });

  it('retains only the spanNameColumnWidth when changing traceIDs', () => {
    let action;
    const width = 0.5;
    const id = 'some-id';
    const { spanID, uniqueText } = searchSetup;

    action = actions.childrenToggle(id);
    store.dispatch(action);
    action = actions.detailToggle(id);
    store.dispatch(action);
    action = actions.find(trace, uniqueText);
    store.dispatch(action);
    action = actions.setSpanNameColumnWidth(width);
    store.dispatch(action);

    let state = store.getState();
    expect(state.traceID).toBe(trace.traceID);
    expect(state.findMatchesIDs).toEqual(new Set([spanID]));
    expect(state.childrenHiddenIDs).not.toEqual(new Set());
    expect(state.detailStates).not.toEqual(new Map());
    expect(state.spanNameColumnWidth).toBe(width);

    action = actions.setTrace(id);
    store.dispatch(action);
    state = store.getState();
    expect(state.traceID).toBe(id);
    expect(state.findMatchesIDs).toBe(null);
    expect(state.childrenHiddenIDs).toEqual(new Set());
    expect(state.detailStates).toEqual(new Map());
    expect(state.spanNameColumnWidth).toBe(width);
  });

  describe('toggles children and details', () => {
    const parentID = trace.spans[0].spanID;
    const tests = [
      {
        msg: 'toggles children',
        action: actions.childrenToggle(parentID),
        propName: 'childrenHiddenIDs',
        initial: new Set(),
        resultant: new Set([parentID]),
      },
      {
        msg: 'toggles details',
        action: actions.detailToggle(parentID),
        propName: 'detailStates',
        initial: new Map(),
        resultant: new Map([[parentID, new DetailState()]]),
      },
    ];

    tests.forEach(info => {
      const { msg, action, propName, initial, resultant } = info;

      it(msg, () => {
        const st0 = store.getState();
        expect(st0[propName]).toEqual(initial);

        store.dispatch(action);
        const st1 = store.getState();
        expect(st0[propName]).toEqual(initial);
        expect(st1[propName]).toEqual(resultant);

        store.dispatch(action);
        const st2 = store.getState();
        expect(st1[propName]).toEqual(resultant);
        expect(st2[propName]).toEqual(initial);
      });
    });
  });

  describe("toggles a detail's sub-sections", () => {
    const id = trace.spans[0].spanID;
    const baseDetail = new DetailState();
    const tests = [
      {
        msg: 'toggles tags',
        action: actions.detailTagsToggle(id),
        get: state => state.detailStates.get(id),
        unchecked: new DetailState(),
        checked: baseDetail.toggleTags(),
      },
      {
        msg: 'toggles process',
        action: actions.detailProcessToggle(id),
        get: state => state.detailStates.get(id),
        unchecked: new DetailState(),
        checked: baseDetail.toggleProcess(),
      },
      {
        msg: 'toggles logs',
        action: actions.detailLogsToggle(id),
        get: state => state.detailStates.get(id),
        unchecked: new DetailState(),
        checked: baseDetail.toggleLogs(),
      },
    ];

    beforeEach(() => {
      store.dispatch(actions.detailToggle(id));
    });

    tests.forEach(info => {
      const { msg, action, get, unchecked, checked } = info;

      it(msg, () => {
        const st0 = store.getState();
        expect(get(st0)).toEqual(unchecked);

        store.dispatch(action);
        const st1 = store.getState();
        expect(get(st0)).toEqual(unchecked);
        expect(get(st1)).toEqual(checked);

        store.dispatch(action);
        const st2 = store.getState();
        expect(get(st1)).toEqual(checked);
        expect(get(st2)).toEqual(unchecked);
      });
    });
  });

  it('toggles a log item', () => {
    const logItem = 'hello-log-item';
    const id = trace.spans[0].spanID;
    const baseDetail = new DetailState();
    const toggledDetail = baseDetail.toggleLogItem(logItem);

    store.dispatch(actions.detailToggle(id));
    expect(store.getState().detailStates.get(id)).toEqual(baseDetail);
    store.dispatch(actions.detailLogItemToggle(id, logItem));
    expect(store.getState().detailStates.get(id)).toEqual(toggledDetail);
  });

  it('filters based on search text', () => {
    const { uniqueText, spanID } = searchSetup;
    expect(store.getState().findMatchesIDs).toBe(null);
    store.dispatch(actions.find(trace, uniqueText));
    expect(store.getState().findMatchesIDs).toEqual(new Set([spanID]));
  });
});
