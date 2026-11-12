// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import _get from 'lodash/get';

import { supplantPath, supplantUrl } from './template';

describe('supplantUrl', () => {
  it('encodes substituted values as URI components', () => {
    expect(
      supplantUrl('/operations?service=#{service}&operation=#{operation}', {
        service: 'frontend',
        operation: 'GET /dispatch?driver=1&x=y',
      })
    ).toBe('/operations?service=frontend&operation=GET%20%2Fdispatch%3Fdriver%3D1%26x%3Dy');
  });

  it('encodes a value substituted into the path of the URL', () => {
    expect(supplantUrl('/services/#{service}/summary', { service: 'api/v2' })).toBe(
      '/services/api%2Fv2/summary'
    );
  });

  it('leaves the template itself unencoded', () => {
    expect(supplantUrl('http://host/summary?a=1&b=#{service}', { service: 'svc' })).toBe(
      'http://host/summary?a=1&b=svc'
    );
  });
});

describe('supplantPath', () => {
  it('keeps a substituted name containing dots as one key', () => {
    const path = supplantPath('services.#{service}', { service: 'payment.svc' });
    expect(path).toEqual(['services', 'payment.svc']);
    expect(_get({ services: { 'payment.svc': 42 } }, path)).toBe(42);
  });

  it('keeps names containing dots, slashes and brackets as one key each', () => {
    expect(
      supplantPath('operations.#{service}.#{operation}.p99', {
        service: 'checkout.default',
        operation: 'grpc.health.v1.Health/Check[0]',
      })
    ).toEqual(['operations', 'checkout.default', 'grpc.health.v1.Health/Check[0]', 'p99']);
  });

  it('splits the template the same way lodash does', () => {
    expect(supplantPath('data[0].services["#{service}"].value', { service: 'a.b' })).toEqual([
      'data',
      '0',
      'services',
      'a.b',
      'value',
    ]);
  });

  it('substitutes a parameter that is only part of a segment', () => {
    expect(supplantPath('services.svc-#{service}-latency', { service: 'a.b' })).toEqual([
      'services',
      'svc-a.b-latency',
    ]);
  });

  it('substitutes an empty string for a missing value', () => {
    expect(supplantPath('operations.#{operation}', {})).toEqual(['operations', '']);
  });

  it('returns the plain path when there are no parameters', () => {
    expect(supplantPath('test.detail.path', { service: 'svc' })).toEqual(['test', 'detail', 'path']);
  });
});
