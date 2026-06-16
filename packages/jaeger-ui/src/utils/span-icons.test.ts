// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IoSparkles, IoServer, IoGlobe, IoChatbubble, IoCodeSlash } from 'react-icons/io5';
import { getSpanIconComponent } from './span-icons';

function makeAttrs(attrKeys: string[]) {
  return attrKeys.map(key => ({ key, value: 'test' }));
}

describe('getSpanIconComponent', () => {
  it('returns IoSparkles for gen_ai attributes', () => {
    expect(getSpanIconComponent(makeAttrs(['gen_ai.system']))).toBe(IoSparkles);
  });

  it('returns IoServer for db attributes', () => {
    expect(getSpanIconComponent(makeAttrs(['db.system']))).toBe(IoServer);
  });

  it('returns IoGlobe for http attributes', () => {
    expect(getSpanIconComponent(makeAttrs(['http.method']))).toBe(IoGlobe);
  });

  it('returns IoChatbubble for messaging attributes', () => {
    expect(getSpanIconComponent(makeAttrs(['messaging.system']))).toBe(IoChatbubble);
  });

  it('returns IoCodeSlash for rpc attributes', () => {
    expect(getSpanIconComponent(makeAttrs(['rpc.system']))).toBe(IoCodeSlash);
  });

  it('returns null for spans with no recognized attributes', () => {
    expect(getSpanIconComponent(makeAttrs(['custom.attr']))).toBeNull();
  });

  it('returns null for spans with no attributes', () => {
    expect(getSpanIconComponent(makeAttrs([]))).toBeNull();
  });

  it('returns null when attributes is undefined', () => {
    expect(getSpanIconComponent(undefined)).toBeNull();
  });

  it('gen_ai takes priority over db when both present', () => {
    expect(getSpanIconComponent(makeAttrs(['gen_ai.model', 'db.system']))).toBe(IoSparkles);
  });
});
