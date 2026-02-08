// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import configureStore from './configure-store';

it('configureStore() should return the redux store', () => {
  const store = configureStore();

  expect(typeof store.dispatch === 'function').toBeTruthy();
  expect(typeof store.getState === 'function').toBeTruthy();
  expect(typeof store.subscribe === 'function').toBeTruthy();
  expect(typeof store.replaceReducer === 'function').toBeTruthy();

  expect({}.hasOwnProperty.call(store.getState(), 'trace')).toBeTruthy();
});
