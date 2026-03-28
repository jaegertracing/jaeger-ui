// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TraceRouter from './TraceRouter';

jest.mock('../TraceDiff', () => ({ __esModule: true, default: () => <div data-testid="trace-diff" /> }));
jest.mock('../TracePage', () => ({ __esModule: true, default: () => <div data-testid="trace-page" /> }));

const renderAt = path => {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/trace/:id" element={<TraceRouter />} />
      </Routes>
    </MemoryRouter>
  );
};

const validComparePath = '/trace/76f3d9a7eb1d924e5a9a1a0774be2c4c...39412b1dd0e6b5df4a19e14584e52286';

describe('TraceRouter', () => {
  describe('renders TracePage', () => {
    it('for a plain 32-char hex trace ID', () => {
      const { getByTestId } = renderAt('/trace/1624652f84191155db89a8d7e664f40b');
      expect(getByTestId('trace-page')).toBeInTheDocument();
    });

    it('for a short/partial trace ID', () => {
      const { getByTestId } = renderAt('/trace/abc123');
      expect(getByTestId('trace-page')).toBeInTheDocument();
    });

    it('does not render TraceDiff for a plain trace ID', () => {
      const { queryByTestId } = renderAt('/trace/1624652f84191155db89a8d7e664f40b');
      expect(queryByTestId('trace-diff')).not.toBeInTheDocument();
    });

    it('for an id with multiple ... (invalid compare) so it matches TracePage', () => {
      const { getByTestId } = renderAt('/trace/a1b2c3d4...b2c3d4e5...c3d4e5f6');
      expect(getByTestId('trace-page')).toBeInTheDocument();
    });

    it('when id has only a left-hand trace ID (b is empty)', () => {
      const { getByTestId } = renderAt('/trace/76f3d9a7eb1d924e5a9a1a0774be2c4c...');
      expect(getByTestId('trace-page')).toBeInTheDocument();
    });

    it('when id has only a right-hand trace ID (a is empty)', () => {
      const { getByTestId } = renderAt('/trace/...39412b1dd0e6b5df4a19e14584e52286');
      expect(getByTestId('trace-page')).toBeInTheDocument();
    });

    it('treats "..." alone (both IDs empty) as TracePage', () => {
      const { getByTestId } = renderAt('/trace/...');
      expect(getByTestId('trace-page')).toBeInTheDocument();
    });
  });

  describe('renders TraceDiff', () => {
    it('when id is a valid compare segment (two hex IDs separated by ...)', () => {
      const { getByTestId } = renderAt(validComparePath);
      expect(getByTestId('trace-diff')).toBeInTheDocument();
    });

    it('does not render TracePage for a valid diff URL', () => {
      const { queryByTestId } = renderAt(validComparePath);
      expect(queryByTestId('trace-page')).not.toBeInTheDocument();
    });
  });
});
