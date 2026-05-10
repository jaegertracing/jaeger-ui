// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import configureStore from './configure-store';
import * as constants from './constants';

describe('configureStore', () => {
  afterEach(() => {
    delete window.__REDUX_DEVTOOLS_EXTENSION__;
    vi.restoreAllMocks();
  });

  it('returns a valid redux store', () => {
    const store = configureStore();

    expect(typeof store.dispatch).toBe('function');
    expect(typeof store.getState).toBe('function');
    expect(typeof store.subscribe).toBe('function');
    expect(typeof store.replaceReducer).toBe('function');
    expect({}.hasOwnProperty.call(store.getState(), 'trace')).toBeTruthy();
  });

  it('applies Redux DevTools enhancer when available in non-production', () => {
    // A minimal identity StoreEnhancer: (createStore) => createStore
    const devToolsEnhancer = createStore => createStore;
    window.__REDUX_DEVTOOLS_EXTENSION__ = vi.fn(() => devToolsEnhancer);

    const store = configureStore();

    expect(window.__REDUX_DEVTOOLS_EXTENSION__).toHaveBeenCalledOnce();
    expect(typeof store.dispatch).toBe('function');
  });

  it('does not apply Redux DevTools enhancer in production even when extension is present', () => {
    vi.spyOn(constants, 'getAppEnvironment').mockReturnValue('production');
    window.__REDUX_DEVTOOLS_EXTENSION__ = vi.fn(() => createStore => createStore);

    configureStore();

    expect(window.__REDUX_DEVTOOLS_EXTENSION__).not.toHaveBeenCalled();
  });
});
