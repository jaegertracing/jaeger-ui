// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import _cloneDeep from 'lodash/cloneDeep';

import {
  fetchDeepDependencyGraphDone,
  fetchDeepDependencyGraphErred,
  fetchDeepDependencyGraphStarted,
} from './ddg';
import { fetchedState } from '../constants';
import * as transformDdgData from '../model/ddg/transformDdgData';
import getStateEntryKey from '../model/ddg/getStateEntryKey';

describe('deepDependencyGraph reducers', () => {
  const service = 'serviceName';
  const operation = 'operationName';
  const start = 400;
  const end = 800;
  const metaSansOp = {
    query: {
      service,
      start,
      end,
    },
  };
  const meta = {
    query: {
      ...metaSansOp.query,
      operation,
    },
  };
  const targetKey = getStateEntryKey(meta.query);
  const keySansOp = getStateEntryKey(metaSansOp.query);
  const existingState = {
    [targetKey]: 'some pre-existing state on target branch',
    [keySansOp]: 'some pre-existing state on branch without operation',
  };

  describe('retrieving deep dependency graph data', () => {
    describe('fetchDeepDependencyGraphStarted', () => {
      const expectedState = {
        state: fetchedState.LOADING,
      };

      it('indicates request is loading', () => {
        const newState = fetchDeepDependencyGraphStarted({}, { meta });
        expect(newState[targetKey]).toEqual(expectedState);
      });

      it('clears relevant exisitng state and preserves the rest', () => {
        const newState = fetchDeepDependencyGraphStarted(existingState, { meta });
        const expected = _cloneDeep(existingState);
        expected[targetKey] = expectedState;
        expect(newState).toEqual(expected);
      });

      it('handles lack of operation', () => {
        const newState = fetchDeepDependencyGraphStarted(existingState, { meta: metaSansOp });
        const expected = _cloneDeep(existingState);
        expected[keySansOp] = expectedState;
        expect(newState).toEqual(expected);
      });
    });

    describe('fetchDeepDependencyGraphErred', () => {
      const testError = new Error('Test error');
      const expectedState = {
        error: testError,
        state: fetchedState.ERROR,
      };

      it('indicates request has erred', () => {
        const newState = fetchDeepDependencyGraphErred({}, { meta, payload: testError });
        expect(newState[targetKey]).toEqual(expectedState);
      });

      it('clears relevant exisitng state and preserves the rest', () => {
        const newState = fetchDeepDependencyGraphErred(existingState, { meta, payload: testError });
        const expected = _cloneDeep(existingState);
        expected[targetKey] = expectedState;
        expect(newState).toEqual(expected);
      });

      it('handles lack of operation', () => {
        const newState = fetchDeepDependencyGraphErred(existingState, {
          meta: metaSansOp,
          payload: testError,
        });
        const expected = _cloneDeep(existingState);
        expected[keySansOp] = expectedState;
        expect(newState).toEqual(expected);
      });
    });

    describe('fetchDeepDependencyGraphDone', () => {
      const payload = { test: 'payload' };
      const mockModel = { mock: 'model' };
      const expectedState = {
        model: mockModel,
        state: fetchedState.DONE,
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
        expect(newState[targetKey]).toEqual(expectedState);
        expect(transformSpy).toHaveBeenLastCalledWith(payload, { operation, service });
      });

      it('clears relevant exisitng state and preserves the rest', () => {
        const newState = fetchDeepDependencyGraphDone(existingState, { meta, payload });
        const expected = _cloneDeep(existingState);
        expected[targetKey] = expectedState;
        expect(newState).toEqual(expected);
      });

      it('handles lack of operation', () => {
        const newState = fetchDeepDependencyGraphDone(existingState, { meta: metaSansOp, payload });
        const expected = _cloneDeep(existingState);
        expected[keySansOp] = expectedState;
        expect(newState).toEqual(expected);
        expect(transformSpy).toHaveBeenLastCalledWith(payload, { operation: undefined, service });
      });
    });
  });
});
