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

import _cloneDeep from 'lodash/cloneDeep';
import _get from 'lodash/get';
import _set from 'lodash/set';
// _setWith is necessary when numbers exist in the path, see lodash issue #4323 for info
import _setWith from 'lodash/setWith';

import {
  addStyleState,
  clearStyleState,
  fetchDeepDependencyGraphDone,
  fetchDeepDependencyGraphErred,
  fetchDeepDependencyGraphStarted,
} from './deep-dependency-graph';
import { fetchedState } from '../constants';
import * as transformDdgData from '../model/ddg/transformDdgData';
import { StyleStates } from '../model/ddg/types';

describe('deepDependencyGraph reducers', () => {
  const service = 'serviceName';
  const operation = 'operationName';
  const start = 400;
  const end = 800;
  const otherService = 'otherServiceName';
  const otherOperation = 'otherOperationName';
  const otherStart = 555;
  const otherEnd = 999;
  const meta = {
    query: {
      service,
      operation,
      start,
      end,
    },
  };
  const metaWithoutOperation = {
    query: {
      service,
      start,
      end,
    },
  };
  const existingState = {
    [service]: {
      [operation]: {
        [start]: {
          [end]: 'some pre-existing state on target branch',
          [otherEnd]: 'some pre-existing state at a different end time',
        },
        [otherStart]: {
          [end]: 'some pre-existing state at a different start time',
        },
      },
      [otherOperation]: {
        [start]: {
          [end]: 'some pre-existing state at a different operation',
        },
      },
    },
    [otherService]: {
      [operation]: {
        [start]: {
          [end]: 'some pre-existing state at a different service',
        },
      },
    },
  };
  const targetPath = [service, operation, start, end];
  const operationlessPath = [service, '*', start, end];

  describe('retrieving deep dependency graph data', () => {
    describe('fetchDeepDependencyGraphStarted', () => {
      const expectedState = {
        state: fetchedState.LOADING,
      };

      it('indicates request is loading', () => {
        const newState = fetchDeepDependencyGraphStarted({}, { meta });
        expect(_get(newState, targetPath)).toEqual(expectedState);
      });

      it('clears relevant exisitng state and preserves the rest', () => {
        const newState = fetchDeepDependencyGraphStarted(existingState, { meta });
        const expected = _set(_cloneDeep(existingState), targetPath, expectedState);
        expect(newState).toEqual(expected);
      });

      it('handles lack of operation', () => {
        const newState = fetchDeepDependencyGraphStarted(existingState, { meta: metaWithoutOperation });
        const expected = _setWith(_cloneDeep(existingState), operationlessPath, expectedState, Object);
        expect(newState).toEqual(expected);
      });
    });

    describe('fetchDeepDependencyGraphStarted', () => {
      const testError = new Error('Test error');
      const expectedState = {
        error: testError,
        state: fetchedState.ERROR,
      };

      it('indicates request has erred', () => {
        const newState = fetchDeepDependencyGraphErred({}, { meta, payload: testError });
        expect(_get(newState, targetPath)).toEqual(expectedState);
      });

      it('clears relevant exisitng state and preserves the rest', () => {
        const newState = fetchDeepDependencyGraphErred(existingState, { meta, payload: testError });
        const expected = _set(_cloneDeep(existingState), targetPath, expectedState);
        expect(newState).toEqual(expected);
      });

      it('handles lack of operation', () => {
        const newState = fetchDeepDependencyGraphErred(existingState, {
          meta: metaWithoutOperation,
          payload: testError,
        });
        const expected = _setWith(_cloneDeep(existingState), operationlessPath, expectedState, Object);
        expect(newState).toEqual(expected);
      });
    });

    describe('fetchDeepDependencyGraphDone', () => {
      const payload = { test: 'payload' };
      const mockModel = { mock: 'model' };
      const expectedState = {
        model: mockModel,
        state: fetchedState.DONE,
        styleStates: new Map(),
      };
      let transformSpy;

      beforeAll(() => {
        transformSpy = jest.spyOn(transformDdgData, 'default').mockImplementation(() => mockModel);
      });

      afterAll(() => {
        transformSpy.mockRestore();
      });

      it('indicates request has succeeded and transforms payload', () => {
        const newState = fetchDeepDependencyGraphDone({}, { meta, payload });
        expect(_get(newState, targetPath)).toEqual(expectedState);
        expect(transformSpy).toHaveBeenLastCalledWith(payload, { operation, service });
      });

      it('clears relevant exisitng state and preserves the rest', () => {
        const newState = fetchDeepDependencyGraphDone(existingState, { meta, payload });
        const expected = _set(_cloneDeep(existingState), targetPath, expectedState);
        expect(newState).toEqual(expected);
      });

      it('handles lack of operation', () => {
        const newState = fetchDeepDependencyGraphDone(existingState, { meta: metaWithoutOperation, payload });
        const expected = _setWith(_cloneDeep(existingState), operationlessPath, expectedState, Object);
        expect(newState).toEqual(expected);
        expect(transformSpy).toHaveBeenLastCalledWith(payload, { operation: undefined, service });
      });
    });
  });

  describe('managing style', () => {
    const visibilityIndices = [4, 8, 15, 16, 23, 42];
    const emphasizedPayload = {
      visibilityIndices,
      style: StyleStates.Emphasized,
    };
    const emphasizedStyleStates = new Map();
    visibilityIndices.forEach(idx => emphasizedStyleStates.set(idx, emphasizedPayload.style));

    const selectedPayload = {
      visibilityIndices,
      style: StyleStates.Selected,
    };
    const selectedStyleStates = new Map();
    visibilityIndices.forEach(idx => selectedStyleStates.set(idx, selectedPayload.style));

    const multiPayload = {
      visibilityIndices,
      style: StyleStates.Emphasized | StyleStates.Selected, // eslint-disable-line no-bitwise
    };
    const multiStyleStates = new Map();
    visibilityIndices.forEach(idx => multiStyleStates.set(idx, multiPayload.style));

    let warnSpy;

    beforeAll(() => {
      warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterAll(() => {
      warnSpy.mockRestore();
    });

    describe('addStyleState', () => {
      it('warns and returns existing state if not done', () => {
        const copyOfState = _cloneDeep(existingState);
        const newState = addStyleState(copyOfState, { meta, payload: emphasizedPayload });
        expect(newState).toBe(copyOfState);
        expect(newState).toEqual(existingState);
        expect(warnSpy).toHaveBeenLastCalledWith('Cannot set style state for unloaded Deep Dependency Graph');
      });

      it('adds style to empty style state', () => {
        const existingDoneState = _set(_cloneDeep(existingState), targetPath, {
          state: fetchedState.DONE,
          styleStates: new Map(),
        });
        const newState = addStyleState(existingDoneState, { meta, payload: emphasizedPayload });
        const expected = _set(existingDoneState, [...targetPath, 'styleStates'], emphasizedStyleStates);
        expect(newState).toEqual(expected);
      });

      it('adds multilpe styles at once', () => {
        const existingDoneState = _set(_cloneDeep(existingState), targetPath, {
          state: fetchedState.DONE,
          styleStates: new Map(),
        });
        const newState = addStyleState(existingDoneState, { meta, payload: multiPayload });
        const expected = _set(existingDoneState, [...targetPath, 'styleStates'], multiStyleStates);
        expect(newState).toEqual(expected);
      });

      it('adds provided style to existing style', () => {
        const existingStyledState = _set(_cloneDeep(existingState), targetPath, {
          state: fetchedState.DONE,
          styleStates: emphasizedStyleStates,
        });
        const newState = addStyleState(existingStyledState, { meta, payload: selectedPayload });
        const expected = _set(existingStyledState, [...targetPath, 'styleStates'], multiStyleStates);
        expect(newState).toEqual(expected);
      });

      it('handles absent operation', () => {
        const existingDoneState = _setWith(
          _cloneDeep(existingState),
          operationlessPath,
          {
            state: fetchedState.DONE,
            styleStates: new Map(),
          },
          Object
        );
        const newState = addStyleState(existingDoneState, {
          meta: metaWithoutOperation,
          payload: emphasizedPayload,
        });
        const expected = _set(
          existingDoneState,
          [...operationlessPath, 'styleStates'],
          emphasizedStyleStates
        );
        expect(newState).toEqual(expected);
      });
    });

    describe('clearStyleState', () => {
      const partialIndices = visibilityIndices.slice(0, visibilityIndices.length - 1);
      const omittedIdx = visibilityIndices[visibilityIndices.length - 1];

      it('warns and returns existing state if not done', () => {
        const copyOfState = _cloneDeep(existingState);
        const newState = clearStyleState(copyOfState, { meta, payload: emphasizedPayload });
        expect(newState).toBe(copyOfState);
        expect(newState).toEqual(existingState);
        expect(warnSpy).toHaveBeenLastCalledWith(
          'Cannot change style state for unloaded Deep Dependency Graph'
        );
      });

      it('clears the provided style preserving other style state', () => {
        const existingStyledState = _set(_cloneDeep(existingState), targetPath, {
          state: fetchedState.DONE,
          styleStates: multiStyleStates,
        });
        const newState = clearStyleState(existingStyledState, { meta, payload: selectedPayload });
        const expected = _set(existingStyledState, [...targetPath, 'styleStates'], emphasizedStyleStates);
        expect(newState).toEqual(expected);
      });

      it('clears provided indices if style is omitted', () => {
        const existingStyledState = _set(_cloneDeep(existingState), targetPath, {
          state: fetchedState.DONE,
          styleStates: multiStyleStates,
        });
        const newState = clearStyleState(existingStyledState, {
          meta,
          payload: { visibilityIndices: partialIndices },
        });
        const expectedMap = new Map([[omittedIdx, multiPayload.style]]);
        const expected = _set(existingStyledState, [...targetPath, 'styleStates'], expectedMap);
        expect(newState).toEqual(expected);
      });

      it('clears provided style from all indices if visibilityIndices array is omitted', () => {
        const existingStyledState = _set(_cloneDeep(existingState), targetPath, {
          state: fetchedState.DONE,
          styleStates: multiStyleStates,
        });
        const newState = clearStyleState(existingStyledState, {
          meta,
          payload: { style: StyleStates.Selected },
        });
        const expected = _set(existingStyledState, [...targetPath, 'styleStates'], emphasizedStyleStates);
        expect(newState).toEqual(expected);
      });

      it('removes indices that become 0', () => {
        const mixedStyleStates = new Map(multiStyleStates);
        for (let i = 0; i < partialIndices.length - 1; i++) {
          mixedStyleStates.set(partialIndices[i], StyleStates.Emphasized);
        }
        const existingStyledState = _set(_cloneDeep(existingState), targetPath, {
          state: fetchedState.DONE,
          styleStates: mixedStyleStates,
        });
        const newState = clearStyleState(existingStyledState, {
          meta,
          payload: { visibilityIndices: partialIndices, style: StyleStates.Emphasized },
        });
        const expectedMap = new Map([
          [partialIndices[partialIndices.length - 1], StyleStates.Selected],
          [omittedIdx, multiPayload.style],
        ]);
        const expected = _set(existingStyledState, [...targetPath, 'styleStates'], expectedMap);
        expect(newState).toEqual(expected);
      });

      it('does not add previously absent idx if included in payload', () => {
        const partialStyleStates = new Map();
        for (let i = 0; i < partialIndices.length; i++) {
          partialStyleStates.set(partialIndices[i], StyleStates.Emphasized);
        }
        const existingStyledState = _set(_cloneDeep(existingState), targetPath, {
          state: fetchedState.DONE,
          styleStates: partialStyleStates,
        });
        const newState = clearStyleState(existingStyledState, {
          meta,
          payload: { visibilityIndices, style: StyleStates.Emphasized },
        });
        const expected = _set(existingStyledState, [...targetPath, 'styleStates'], new Map());
        expect(newState).toEqual(expected);
      });

      it('handles absent operation', () => {
        const existingStyledState = _setWith(
          _cloneDeep(existingState),
          operationlessPath,
          {
            state: fetchedState.DONE,
            styleStates: multiStyleStates,
          },
          Object
        );
        const newState = clearStyleState(existingStyledState, {
          meta: metaWithoutOperation,
          payload: selectedPayload,
        });
        const expected = _set(
          existingStyledState,
          [...operationlessPath, 'styleStates'],
          emphasizedStyleStates
        );
        expect(newState).toEqual(expected);
      });
    });
  });
});
