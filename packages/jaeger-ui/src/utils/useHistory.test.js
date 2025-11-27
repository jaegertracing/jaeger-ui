// Copyright (c) 2023 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import { useHistory, HistoryProvider } from './useHistory';

describe('useHistory', () => {
  it('should return the history object from the context', () => {
    const history = { push: jest.fn() };
    const TestComponent = () => {
      const historyFromContext = useHistory();
      expect(historyFromContext).toEqual(history);
      return null;
    };
    render(
      <HistoryProvider history={history}>
        <TestComponent />
      </HistoryProvider>
    );
  });
});
