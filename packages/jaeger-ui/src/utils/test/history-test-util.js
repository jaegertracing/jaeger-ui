// Copyright (c) 2024 The Jaeger Authors
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

/**
 * Creates a memory history instance for testing
 * @returns {Object} History object with v4 API
 */
export function createTestHistory() {
  return createMemoryHistory();
}

/**
 * Creates a mock history object for testing
 * @returns {Object} Mock history object
 */
export function createMockHistory() {
  return {
    length: 1,
    action: 'POP',
    location: {
      pathname: '/',
      search: '',
      hash: '',
      state: null,
    },
    push: jest.fn(),
    replace: jest.fn(),
    go: jest.fn(),
    goBack: jest.fn(),
    goForward: jest.fn(),
    block: jest.fn(),
    listen: jest.fn(),
  };
}

/**
 * Wraps a component with router and history providers for testing
 * @param {React.Component} Component - Component to wrap
 * @param {Object} history - History object
 * @returns {React.Component} Wrapped component
 */
export function withTestRouter(Component, history = createTestHistory()) {
  return (
    <HistoryProvider history={history}>
      <Router history={history}>
        {Component}
      </Router>
    </HistoryProvider>
  );
}