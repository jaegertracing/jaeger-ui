// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import { createStore } from 'redux';

import reducer, { actions, newInitialState } from './duck';
import DetailState from './SpanDetail/DetailState';
import transformTraceData from '../../../model/transform-trace-data';
import traceGenerator from '../../../demo/trace-generators';

describe('TraceTimelineViewer/duck', () => {
  const trace = transformTraceData(traceGenerator.trace({ numberOfSpans: 10 }));
  let store;

  beforeEach(() => {
    store = createStore(reducer, newInitialState(trace));
  });

  describe('initial state', () => {
    it('retains a provided trace', () => {
      const state = store.getState();
      expect(state.trace).toBe(trace);
    });

    it('has no details, collapsed children or text search', () => {
      const state = store.getState();
      expect(state.childrenHiddenIDs).toEqual(new Set());
      expect(state.findMatches).not.toBeDefined();
      expect(state.detailStates).toEqual(new Map());
    });
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

  // TODO(joe): test toggling log items
});
