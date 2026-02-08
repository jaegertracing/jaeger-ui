// Copyright (c) 2023 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import withRouteProps from './withRouteProps';

jest.mock('./configure-store', () => ({
  history: {
    push: jest.fn(),
    replace: jest.fn(),
    go: jest.fn(),
    goBack: jest.fn(),
    goForward: jest.fn(),
    block: jest.fn(),
    listen: jest.fn(),
    createHref: jest.fn(),
    action: 'POP',
    length: 1,
    location: { pathname: '/test', search: '?param=value' },
  },
  store: {},
}));

describe('withRouteProps', () => {
  test('passes route props to WrappedComponent', () => {
    const { history: mockHistory } = require('./configure-store');
    const WrappedComponent = jest.fn(() => null);
    const ComponentWithRouteProps = withRouteProps(WrappedComponent);
    render(
      <MemoryRouter initialEntries={['/test?param=value']}>
        <ComponentWithRouteProps />
      </MemoryRouter>
    );

    const [wrappedProps] = WrappedComponent.mock.calls[0];
    expect(wrappedProps).toEqual(
      expect.objectContaining({
        location: expect.objectContaining({
          pathname: '/test',
          search: '?param=value',
        }),
        pathname: '/test',
        search: '?param=value',
        params: {},
        history: mockHistory,
      })
    );
  });
});
