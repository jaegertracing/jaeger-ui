// Copyright (c) 2023 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route } from 'react-router-dom';
import withRouteProps from './withRouteProps';

describe('withRouteProps', () => {
  test('passes route props to WrappedComponent', () => {
    const WrappedComponent = jest.fn(() => null);
    const ComponentWithRouteProps = withRouteProps(WrappedComponent);
    render(
      <MemoryRouter initialEntries={['/test?param=value']}>
        <Route path="/test">
          <ComponentWithRouteProps />
        </Route>
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
      })
    );
  });
});
