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

// import { createStore } from 'redux';

// import queryString from 'query-string';

import _cloneDeep from 'lodash/cloneDeep';
import _get from 'lodash/get';
import _set from 'lodash/set';

import { fetchDeepDependencyGraphDone, fetchDeepDependencyGraphErred, fetchDeepDependencyGraphStarted } from './deep-dependency-graph'
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
  }
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
        }
      },
    },
  };
  const targetPath = [service, operation, start, end];

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
      expect(newState).toEqual(_set(_cloneDeep(existingState), targetPath, expectedState));
    });

    it('handles lack of operation', () => {
      const newState = fetchDeepDependencyGraphStarted(existingState, { meta: metaWithoutOperation });
      const expected = _cloneDeep(existingState);
      expected[service]['*'] = { [start]: { [end]: expectedState } };
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
      expect(newState).toEqual(_set(_cloneDeep(existingState), targetPath, expectedState));
    });

    it('handles lack of operation', () => {
      const newState = fetchDeepDependencyGraphErred(existingState, { meta: metaWithoutOperation, payload: testError });
      const expected = _cloneDeep(existingState);
      expected[service]['*'] = { [start]: { [end]: expectedState } };
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
      expect(newState).toEqual(_set(_cloneDeep(existingState), targetPath, expectedState));
    });

    it('handles lack of operation', () => {
      const newState = fetchDeepDependencyGraphDone(existingState, { meta: metaWithoutOperation, payload });
      const expected = _cloneDeep(existingState);
      expected[service]['*'] = { [start]: { [end]: expectedState } };
      expect(newState).toEqual(expected);
      expect(transformSpy).toHaveBeenLastCalledWith(payload, { operation: undefined, service });
    });
  });
});
