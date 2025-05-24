/* eslint-disable import/no-extraneous-dependencies */
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

import { createMemoryHistory } from 'history';
import configureStore from './configure-store';

describe('configureStore()', () => {
  let store;
  let history;

  beforeEach(() => {
    history = createMemoryHistory();
    store = configureStore();
  });

  it('creates a store with the expected shape', () => {
    expect(typeof store.dispatch).toBe('function');
    expect(typeof store.getState).toBe('function');
    expect(typeof store.subscribe).toBe('function');
  });

  it('creates a store with the expected reducers', () => {
    const state = store.getState();
    expect(state).toEqual(expect.objectContaining({
      router: expect.any(Object),
      archive: expect.any(Object),
      traceDiff: expect.any(Object),
      traceTimeline: expect.any(Object),
    }));
  });

  it('history provides expected API', () => {
    expect(history.length).toBeDefined();
    expect(typeof history.push).toBe('function');
    expect(typeof history.replace).toBe('function');
    expect(typeof history.go).toBe('function');
    expect(typeof history.goBack).toBe('function');
    expect(typeof history.goForward).toBe('function');
    expect(typeof history.block).toBe('function');
    expect(typeof history.listen).toBe('function');
  });
});