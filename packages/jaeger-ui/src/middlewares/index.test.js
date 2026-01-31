// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

jest.mock(
  'node-fetch',
  () => () =>
    Promise.resolve({
      status: 200,
      data: () => Promise.resolve({ data: null }),
      json: () => Promise.resolve({ data: null }),
    })
);

jest.mock('redux-first-history', () => ({
  replace: jest.fn(url => ({ type: 'REPLACE', payload: url })),
}));

jest.mock('../components/SearchTracePage/url', () => ({
  getUrl: jest.fn(query => `/search?${JSON.stringify(query)}`),
}));

import * as jaegerMiddlewares from './index';
import { searchTraces } from '../actions/jaeger-api';
import { replace } from 'redux-first-history';
import { getUrl as getSearchUrl } from '../components/SearchTracePage/url';

it('jaegerMiddlewares should contain the promise middleware', () => {
  expect(typeof jaegerMiddlewares.promise).toBe('function');
});

describe('historyUpdateMiddleware', () => {
  const mockStore = {
    dispatch: jest.fn(),
  };
  const mockNext = jest.fn(action => action);

  beforeEach(() => {
    mockStore.dispatch.mockClear();
    mockNext.mockClear();
    replace.mockClear();
    getSearchUrl.mockClear();
  });

  it('dispatches replace action when action type matches searchTraces', () => {
    const query = { service: 'test-service', operation: 'test-op' };
    const action = {
      type: String(searchTraces),
      meta: { query },
    };

    jaegerMiddlewares.historyUpdateMiddleware(mockStore)(mockNext)(action);

    expect(getSearchUrl).toHaveBeenCalledWith(query);
    expect(replace).toHaveBeenCalled();
    expect(mockStore.dispatch).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledWith(action);
  });

  it('does not dispatch replace action for non-searchTraces actions', () => {
    const action = {
      type: 'SOME_OTHER_ACTION',
      payload: { data: 'test' },
    };

    const result = jaegerMiddlewares.historyUpdateMiddleware(mockStore)(mockNext)(action);

    expect(getSearchUrl).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(mockStore.dispatch).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledWith(action);
    expect(result).toBe(action);
  });
});
