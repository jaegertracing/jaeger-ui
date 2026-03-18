// Copyright (c) 2023 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom-v5-compat';
import withRouteProps from './withRouteProps';

describe('withRouteProps', () => {
  test('passes route props to WrappedComponent', () => {
    const WrappedComponent = jest.fn(() => null);
    const ComponentWithRouteProps = withRouteProps(WrappedComponent);
    render(
      <MemoryRouter initialEntries={['/test?param=value']}>
        <Routes>
          <Route path="/test" element={<ComponentWithRouteProps />} />
        </Routes>
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
        navigate: expect.any(Function),
      })
    );
  });
});
