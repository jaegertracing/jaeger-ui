// Copyright (c) 2019 Uber Technologies, Inc.
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

import _merge from 'lodash/merge';

import { getDecorationDone } from './path-agnostic-decorations';

describe('pathAgnosticDecoration reducers', () => {
  const decorationID = {
    0: 'decoration id 0',
    1: 'decoration id 1',
  };
  const op = {
    0: 'op 0',
    1: 'op 1',
  };
  const svc = {
    0: 'svc 0',
    1: 'svc 1',
  };

  function genStateAndPayload(_id, _service, _operation, value) {
    const id = decorationID[_id];
    const operation = op[_operation];
    const service = svc[_service];

    const isWithOp = Boolean(operation);

    const payloadKey = isWithOp ? 'withOp' : 'withoutOp';
    const payload = {
      [id]: {
        [payloadKey]: {
          [service]: isWithOp
            ? {
                [operation]: value,
              }
            : value,
        },
      },
    };

    const stateKey = isWithOp ? 'withOpMax' : 'withoutOpMax';
    const state = {
      [id]: {
        ...payload[id],
        [stateKey]: typeof value === 'number' ? value : -Infinity,
      },
    };
    return { id, operation, service, payload, state };
  }

  // variable names are type(payload|state)+decoration(0|1)+service(0|1)+operation(0|1|u)+value(0|1|s)
  // u for undefined, or opless
  // s for string, or errored request
  const { payload: payload00u0, state: state00u0 } = genStateAndPayload(0, 0, undefined, 0);
  const { payload: payload00us, state: state00us } = genStateAndPayload(0, 0, undefined, 'Error: 404');
  const { state: state00u1 } = genStateAndPayload(0, 0, undefined, 1);
  const { payload: payload01u1, state: state01u1 } = genStateAndPayload(0, 1, undefined, 1);
  const { payload: payload10u1, state: state10u1 } = genStateAndPayload(1, 0, undefined, 1);

  const { payload: payload0000, state: state0000 } = genStateAndPayload(0, 0, 0, 0);
  const { payload: payload000s, state: state000s } = genStateAndPayload(0, 0, 0, 'Error: 404');
  const { payload: payload0011, state: state0011 } = genStateAndPayload(0, 0, 1, 1);
  const { payload: payload0101, state: state0101 } = genStateAndPayload(0, 1, 0, 1);
  const { payload: payload1001, state: state1001 } = genStateAndPayload(1, 0, 0, 1);

  function mergeAndObjectContaining(...args) {
    const merged = _merge({}, ...args);
    const objectContaining = {};
    Object.keys(merged).forEach(key => {
      objectContaining[key] = expect.objectContaining(merged[key]);
    });
    return objectContaining;
  }

  it('returns existing state if payload is undefined', () => {
    const priorState = {};
    expect(getDecorationDone(priorState)).toBe(priorState);
  });

  describe('withoutOp', () => {
    it('adds service decoration to empty state', () => {
      expect(getDecorationDone({}, payload00u0)).toEqual(mergeAndObjectContaining(state00u0));
    });

    it('adds service decoration error to empty state', () => {
      expect(getDecorationDone({}, payload00us)).toEqual(mergeAndObjectContaining(state00us));
    });

    it('adds service decoration to state with different decoration', () => {
      expect(getDecorationDone(state00u0, payload10u1)).toEqual(
        mergeAndObjectContaining(state00u0, state10u1)
      );
    });

    it('adds service decoration to state with existing decoration and updates withoutOpMax', () => {
      expect(getDecorationDone(state00u0, payload01u1)).toEqual(
        mergeAndObjectContaining(state00u0, state01u1)
      );
    });

    it('adds service decoration to state with existing decoration without overriding higher withoutOpMax', () => {
      expect(getDecorationDone(state01u1, payload00u0)).toEqual(
        mergeAndObjectContaining(state00u0, state01u1)
      );
    });

    it('adds service decoration error to state with existing decoration without overriding existing withoutOpMax', () => {
      expect(getDecorationDone(state01u1, payload00us)).toEqual(
        mergeAndObjectContaining(state00us, state01u1)
      );
    });
  });

  describe('withOp', () => {
    it('adds operation decoration to empty state', () => {
      expect(getDecorationDone({}, payload0000)).toEqual(mergeAndObjectContaining(state0000));
    });

    it('adds operation decoration error to empty state', () => {
      expect(getDecorationDone({}, payload000s)).toEqual(mergeAndObjectContaining(state000s));
    });

    it('adds operation decoration to state with different decoration', () => {
      expect(getDecorationDone(state0000, payload1001)).toEqual(
        mergeAndObjectContaining(state0000, state1001)
      );
    });

    it('adds operation decoration to state with same decoration but different service and updates withOpMax', () => {
      expect(getDecorationDone(state0000, payload0101)).toEqual(
        mergeAndObjectContaining(state0000, state0101)
      );
    });

    it('adds operation decoration to state with same decoration but different service without overriding higher withoutOpMax', () => {
      expect(getDecorationDone(state0101, payload0000)).toEqual(
        mergeAndObjectContaining(state0000, state0101)
      );
    });

    it('adds operation decoration to state with existing decoration and same service and updates withoutOpMax', () => {
      expect(getDecorationDone(state0000, payload0011)).toEqual(
        mergeAndObjectContaining(state0000, state0011)
      );
    });

    it('adds operation decoration to state with existing decoration and same service without overriding higher withoutOpMax', () => {
      expect(getDecorationDone(state0011, payload0000)).toEqual(
        mergeAndObjectContaining(state0000, state0011)
      );
    });

    it('adds operation decoration error to state with existing decoration without overriding existing withoutOpMax', () => {
      expect(getDecorationDone(state0011, payload000s)).toEqual(
        mergeAndObjectContaining(state000s, state0011)
      );
    });
  });

  describe('mixed', () => {
    it('adds service decoration to state with only operation decorations', () => {
      expect(getDecorationDone(state0011, payload00u0)).toEqual(
        mergeAndObjectContaining(state00u0, state0011)
      );
    });

    it('adds operation decoration to state with only service decorations', () => {
      expect(getDecorationDone(state00u1, payload0000)).toEqual(
        mergeAndObjectContaining(state0000, state00u1)
      );
    });

    it('adds multiple operation and service decortions to state with multiple operation and service decorations', () => {
      const initialState = _merge({}, state00us, state00u0, state1001);
      const payload = _merge({}, payload01u1, payload10u1, payload10u1, payload000s, payload0101);
      const expectedState = mergeAndObjectContaining(
        {},
        state000s,
        initialState,
        state01u1,
        state10u1,
        state0101
      );

      expect(getDecorationDone(initialState, payload)).toEqual(expectedState);
    });
  });
});
