// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { looksLikeTraceId } from './trace-id';

// Build the base64 fixtures from fixed bytes so the encodings are provably correct
// rather than hand-written, and so the decoded byte length is unambiguous.
const TRACE_ID_128_HEX = '4bf92f3577b34da6a3ce929d0e0e4736';
const TRACE_ID_64_HEX = '4bf92f3577b34da6';
const toBase64 = (hex: string) => Buffer.from(hex, 'hex').toString('base64');
const toBase64Url = (hex: string) => Buffer.from(hex, 'hex').toString('base64url');

describe('looksLikeTraceId', () => {
  describe('queries that must go to the assistant', () => {
    // Regression cases for #4531: these are all valid base64, so a decoded-length
    // check alone would wrongly route them to /trace/<word>.
    it.each([
      'checkout-service',
      'authentication',
      'performance',
      'frontend',
      'payment-service',
      'cart',
      'redis',
      'api-gateway',
      'latency',
      'errors',
      '',
      '   ',
    ])('rejects %j', value => {
      expect(looksLikeTraceId(value)).toBe(false);
    });

    it.each(['help', 'payment', 'user-api', 'service-a'])('rejects single-word query %j', value => {
      expect(looksLikeTraceId(value)).toBe(false);
    });
  });

  describe('trace IDs that must open the trace page', () => {
    it.each([
      ['32-char lowercase hex', TRACE_ID_128_HEX],
      ['16-char lowercase hex', TRACE_ID_64_HEX],
      ['32-char uppercase hex', TRACE_ID_128_HEX.toUpperCase()],
      ['16-char uppercase hex', TRACE_ID_64_HEX.toUpperCase()],
      ['mixed-case hex', '4BF92f3577B34dA6'],
      ['base64 of 16 bytes', toBase64(TRACE_ID_128_HEX)],
      ['base64 of 8 bytes', toBase64(TRACE_ID_64_HEX)],
      ['base64url of 16 bytes', toBase64Url(TRACE_ID_128_HEX)],
      ['base64url of 8 bytes', toBase64Url(TRACE_ID_64_HEX)],
    ])('accepts %s', (_label, value) => {
      expect(looksLikeTraceId(value)).toBe(true);
    });

    it('accepts all-lowercase-letter hex that also matches the word heuristic', () => {
      // Hex must be checked before the lowercase-word rule, or this ID is rejected.
      expect(looksLikeTraceId('abcdefabcdefabcd')).toBe(true);
    });

    it('accepts hex lengths between 16 and 32 chars', () => {
      expect(looksLikeTraceId('b36de06c5972ab071ac119c5')).toBe(true);
    });

    it('accepts base64 with padding', () => {
      expect(looksLikeTraceId('s23gbclyqrBxrBGcUEygfA==')).toBe(true);
    });

    it('accepts base64 without padding', () => {
      expect(looksLikeTraceId('s23gbclyqrBxrBGcUEygfA')).toBe(true);
    });

    it('accepts URL-safe base64 with - and _ characters', () => {
      expect(looksLikeTraceId('s23gbclyqrBxrBGc-Eyg_A==')).toBe(true);
    });

    it('trims whitespace before checking', () => {
      expect(looksLikeTraceId(`  ${TRACE_ID_128_HEX}  `)).toBe(true);
    });
  });

  describe('base64 that decodes to a non-trace-ID byte length', () => {
    it.each([
      ['4 bytes', 'CzBVeg=='],
      ['12 bytes', 'CzBVep/E6Q4zWH2i'],
      ['13 bytes', 'abc+def/ghijklmnop=='],
      ['20 bytes', 'CzBVep/E6Q4zWH2ix+wRNluApco='],
    ])('rejects base64 decoding to %s', (_label, value) => {
      expect(looksLikeTraceId(value)).toBe(false);
    });

    it('accepts base64 decoding to exactly 8 bytes', () => {
      expect(looksLikeTraceId('CzBVep/E6Q4=')).toBe(true);
    });

    it('accepts base64 decoding to exactly 16 bytes', () => {
      expect(looksLikeTraceId('CzBVep/E6Q4zWH2ix+wRNg==')).toBe(true);
    });
  });

  describe('malformed input', () => {
    it('rejects strings with an impossible base64 length (1 mod 4 unpadded)', () => {
      expect(looksLikeTraceId('ABCDE')).toBe(false);
    });

    it.each(['What is a trace?', 'hello world!', 'not.a" trace', 'show me slow traces'])(
      'rejects %j',
      value => {
        expect(looksLikeTraceId(value)).toBe(false);
      }
    );
  });
});
