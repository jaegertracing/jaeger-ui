// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

const mockNavigate = jest.fn();
let mockLocation = { search: '', state: null };

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

jest.mock('../../hooks/useConfig', () => ({
  useConfig: () => ({
    archiveEnabled: false,
    storageCapabilities: null,
    criticalPathEnabled: false,
    disableJsonView: false,
    traceGraph: null,
    useOpenTelemetryTerms: false,
  }),
}));

jest.mock('../../utils/withRouteProps', () => ({
  __esModule: true,
  default: Component => Component,
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  connect: () => () => () => null,
}));

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import TracePage from './index';

describe('TracePage URL normalization', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockLocation = { search: '', state: null };
  });

  it('normalizes uppercase trace IDs to lowercase in the URL', async () => {
    const uppercaseTraceId = 'ABC123DEF456';
    const lowercaseTraceId = uppercaseTraceId.toLowerCase();

    render(
      <MemoryRouter>
        <TracePage params={{ id: uppercaseTraceId }} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining(lowercaseTraceId),
        expect.objectContaining({ replace: true })
      );
    });
  });

  it('preserves query parameters during trace ID normalization', async () => {
    const uppercaseTraceId = 'ABC123DEF456';
    const lowercaseTraceId = uppercaseTraceId.toLowerCase();
    const searchParams = '?uiFind=foo&x=1';

    mockLocation = { search: searchParams, state: null };

    render(
      <MemoryRouter>
        <TracePage params={{ id: uppercaseTraceId }} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining(`${lowercaseTraceId}${searchParams}`),
        expect.objectContaining({ replace: true })
      );
    });
  });
});
