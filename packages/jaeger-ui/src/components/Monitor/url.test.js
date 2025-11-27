// Copyright (c) 2021 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { ROUTE_PATH, matches, getUrl } from './url';

describe('Monitor/url', () => {
  it('matches', () => {
    expect(matches('/monitor')).toBe(true);
    expect(matches('/monitor?var=123')).toBe(false);
    expect(matches('/bla')).toBe(false);
  });

  it('getUrl', () => {
    expect(getUrl()).toBe(ROUTE_PATH);
  });
});
