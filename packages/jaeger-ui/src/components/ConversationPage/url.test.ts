// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { DEFAULT_CONVERSATION_LOOKBACK, getUrl, getUrlState, ROUTE_PATH } from './url';

describe('ConversationPage url', () => {
  it('registers the route under /conversation/:id', () => {
    expect(ROUTE_PATH).toBe('/conversation/:id');
  });

  it('encodes the conversation ID into the path', () => {
    expect(getUrl('conv a/b')).toBe('/conversation/conv%20a%2Fb');
  });

  it('adds service and lookback as query parameters when given', () => {
    expect(getUrl('conv-1', { service: 'agent', lookback: '2d' })).toBe(
      '/conversation/conv-1?lookback=2d&service=agent'
    );
  });

  it('leaves out parameters that are not set', () => {
    expect(getUrl('conv-1', { lookback: '2d' })).toBe('/conversation/conv-1?lookback=2d');
  });

  it('reads service and lookback from the query string', () => {
    expect(getUrlState('?service=agent&lookback=3d')).toEqual({ service: 'agent', lookback: '3d' });
  });

  it('uses the first value of a repeated parameter', () => {
    expect(getUrlState('?service=a&service=b')).toEqual({
      service: 'a',
      lookback: DEFAULT_CONVERSATION_LOOKBACK,
    });
  });

  it('falls back to the default lookback when the value is missing or not a standard option', () => {
    expect(getUrlState('').lookback).toBe(DEFAULT_CONVERSATION_LOOKBACK);
    expect(getUrlState('?lookback=custom').lookback).toBe(DEFAULT_CONVERSATION_LOOKBACK);
    expect(getUrlState('?lookback=9y').lookback).toBe(DEFAULT_CONVERSATION_LOOKBACK);
  });

  it('treats an empty service as absent', () => {
    expect(getUrlState('?service=').service).toBeUndefined();
  });
});
