// Copyright (c) 2023 The Jaeger Authors.
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

import React from 'react';
import { render } from '@testing-library/react';
import { useHistory, HistoryProvider } from './useHistory';

// Mock react-router-dom hooks
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/', search: '' }),
}));

describe('useHistory', () => {
  it('should return a history-like object', () => {
    const history = { push: jest.fn() };
    const TestComponent = () => {
      const historyObj = useHistory();
      expect(historyObj).toHaveProperty('push');
      expect(historyObj).toHaveProperty('replace');
      expect(historyObj).toHaveProperty('location');
      return null;
    };
    render(
      <HistoryProvider history={history}>
        <TestComponent />
      </HistoryProvider>
    );
  });
});