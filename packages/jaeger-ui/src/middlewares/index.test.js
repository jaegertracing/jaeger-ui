// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

jest.mock(
  'node-fetch',
  () => () =>
    Promise.resolve({
      status: 200,
      data: () => Promise.resolve({ data: null }),
      json: () => Promise.resolve({ data: null }),
    })
);

import * as jaegerMiddlewares from './index';

it('jaegerMiddlewares should contain the promise middleware', () => {
  expect(typeof jaegerMiddlewares.promise).toBe('function');
});
