// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { svcChecksum, encodeSvcFilter, decodeSvcFilter, getSortedServiceNames } from './svcFilter';

describe('svcChecksum', () => {
  it('returns a hex string', () => {
    const result = svcChecksum(['api', 'db', 'frontend']);
    expect(result).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic', () => {
    const names = ['api', 'auth', 'cache', 'db'];
    expect(svcChecksum(names)).toBe(svcChecksum(names));
  });

  it('changes when service list changes', () => {
    const a = svcChecksum(['api', 'db']);
    const b = svcChecksum(['api', 'db', 'frontend']);
    expect(a).not.toBe(b);
  });

  it('is sensitive to order', () => {
    const a = svcChecksum(['api', 'db']);
    const b = svcChecksum(['db', 'api']);
    expect(a).not.toBe(b);
  });

  it('handles empty array', () => {
    const result = svcChecksum([]);
    expect(result).toMatch(/^[0-9a-f]+$/);
  });
});

describe('encodeSvcFilter', () => {
  const names = ['api', 'auth', 'cache', 'db'];

  it('returns null when all services are visible', () => {
    const visible = new Set(['api', 'auth', 'cache', 'db']);
    expect(encodeSvcFilter(names, visible)).toBeNull();
  });

  it('returns null for empty service list', () => {
    expect(encodeSvcFilter([], new Set())).toBeNull();
  });

  it('encodes a subset as checksum.bitmask', () => {
    const visible = new Set(['api', 'db']); // indices 0 and 3
    const result = encodeSvcFilter(names, visible);
    expect(result).not.toBeNull();
    expect(result!).toContain('.');
    const [checksum, bitmask] = result!.split('.');
    expect(checksum).toBe(svcChecksum(names));
    // bit 0 (api) and bit 3 (db) = 0b1001 = 9
    expect(bitmask).toBe('9');
  });

  it('encodes only first service visible', () => {
    const visible = new Set(['api']); // index 0
    const result = encodeSvcFilter(names, visible);
    const bitmask = result!.split('.')[1];
    expect(bitmask).toBe('1');
  });

  it('handles visible set with extra names not in the sorted list', () => {
    const visible = new Set(['api', 'auth', 'cache', 'db', 'extra']);
    expect(encodeSvcFilter(names, visible)).toBeNull();
  });

  it('encodes when visible set has same size but different names than sorted list', () => {
    // visibleServices.size (4) >= sortedServiceNames.length (4) but 'extra' replaces 'db'
    const visible = new Set(['api', 'auth', 'cache', 'extra']);
    const result = encodeSvcFilter(names, visible);
    expect(result).not.toBeNull();
    // api=0, auth=1, cache=2 are visible (bits 0,1,2 = 0b0111 = 7), db=3 is not
    expect(result!.split('.')[1]).toBe('7');
  });
});

describe('decodeSvcFilter', () => {
  const names = ['api', 'auth', 'cache', 'db'];

  it('returns null for empty encoded string', () => {
    expect(decodeSvcFilter(names, '')).toBeNull();
  });

  it('returns null for empty service list', () => {
    expect(decodeSvcFilter([], 'abc.f')).toBeNull();
  });

  it('returns null for malformed string (no dot)', () => {
    expect(decodeSvcFilter(names, 'abcdef')).toBeNull();
  });

  it('returns null for malformed string (dot at start)', () => {
    expect(decodeSvcFilter(names, '.ff')).toBeNull();
  });

  it('returns null for invalid hex bitmask', () => {
    const checksum = svcChecksum(names);
    expect(decodeSvcFilter(names, `${checksum}.xyz`)).toBeNull();
  });

  it('returns null when bitmask decodes to zero', () => {
    const checksum = svcChecksum(names);
    expect(decodeSvcFilter(names, `${checksum}.0`)).toBeNull();
  });

  it('returns stale=true when checksum does not match', () => {
    const result = decodeSvcFilter(names, 'ffff.9');
    expect(result).not.toBeNull();
    expect(result!.stale).toBe(true);
    expect(result!.visibleServices.size).toBe(names.length);
  });

  it('round-trips with encodeSvcFilter', () => {
    const visible = new Set(['api', 'db']);
    const encoded = encodeSvcFilter(names, visible)!;
    const decoded = decodeSvcFilter(names, encoded)!;
    expect(decoded.stale).toBe(false);
    expect(decoded.visibleServices).toEqual(visible);
  });

  it('returns null when bitmask means all visible', () => {
    const checksum = svcChecksum(names);
    // 0b1111 = f
    expect(decodeSvcFilter(names, `${checksum}.f`)).toBeNull();
  });

  it('ignores extra bits beyond service count', () => {
    const checksum = svcChecksum(names);
    // 0b11111001 = f9 — bits 0,3,4,5,6,7 set, but only 4 services
    const result = decodeSvcFilter(names, `${checksum}.f9`)!;
    expect(result.stale).toBe(false);
    // bits 0 and 3 are set within the 4-service range
    expect(result.visibleServices).toEqual(new Set(['api', 'db']));
  });
});

describe('getSortedServiceNames', () => {
  it('extracts and sorts names', () => {
    const services = [
      { name: 'db', numberOfSpans: 10 },
      { name: 'api', numberOfSpans: 5 },
      { name: 'cache', numberOfSpans: 3 },
    ];
    expect(getSortedServiceNames(services)).toEqual(['api', 'cache', 'db']);
  });

  it('returns empty array for empty input', () => {
    expect(getSortedServiceNames([])).toEqual([]);
  });
});
