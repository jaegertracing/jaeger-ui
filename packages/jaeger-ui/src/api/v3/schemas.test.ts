// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import {
  ServicesResponseSchema,
  OperationsResponseSchema,
  OperationSchema,
  traceIdHex,
  spanIdHex,
} from './schemas';

describe('ServicesResponseSchema', () => {
  it('validates correct structure', () => {
    const data = { services: ['service-a', 'service-b'] };
    const result = ServicesResponseSchema.parse(data);
    expect(result.services).toEqual(['service-a', 'service-b']);
  });

  it('validates empty services array', () => {
    const data = { services: [] };
    const result = ServicesResponseSchema.parse(data);
    expect(result.services).toEqual([]);
  });

  it('rejects missing services field', () => {
    const data = {};
    expect(() => ServicesResponseSchema.parse(data)).toThrow(z.ZodError);
  });

  it('rejects non-array services field', () => {
    const data = { services: 'not-an-array' };
    expect(() => ServicesResponseSchema.parse(data)).toThrow(z.ZodError);
  });

  it('rejects non-string elements in services array', () => {
    const data = { services: ['valid', 123, 'valid-again'] };
    expect(() => ServicesResponseSchema.parse(data)).toThrow(z.ZodError);
  });
});

describe('OperationSchema', () => {
  it('validates correct operation structure', () => {
    const data = { name: 'GET /api/users', spanKind: 'SPAN_KIND_CLIENT' };
    const result = OperationSchema.parse(data);
    expect(result.name).toBe('GET /api/users');
    expect(result.spanKind).toBe('SPAN_KIND_CLIENT');
  });

  it('rejects missing name field', () => {
    const data = { spanKind: 'SPAN_KIND_CLIENT' };
    expect(() => OperationSchema.parse(data)).toThrow(z.ZodError);
  });

  it('rejects missing spanKind field', () => {
    const data = { name: 'GET /api/users' };
    expect(() => OperationSchema.parse(data)).toThrow(z.ZodError);
  });
});

describe('OperationsResponseSchema', () => {
  it('validates correct structure', () => {
    const data = {
      operations: [
        { name: 'GET /api/users', spanKind: 'SPAN_KIND_CLIENT' },
        { name: 'POST /api/users', spanKind: 'SPAN_KIND_SERVER' },
      ],
    };
    const result = OperationsResponseSchema.parse(data);
    expect(result.operations).toHaveLength(2);
    expect(result.operations[0].name).toBe('GET /api/users');
  });

  it('validates empty operations array', () => {
    const data = { operations: [] };
    const result = OperationsResponseSchema.parse(data);
    expect(result.operations).toEqual([]);
  });

  it('rejects missing operations field', () => {
    const data = {};
    expect(() => OperationsResponseSchema.parse(data)).toThrow(z.ZodError);
  });

  it('rejects non-array operations field', () => {
    const data = { operations: 'not-an-array' };
    expect(() => OperationsResponseSchema.parse(data)).toThrow(z.ZodError);
  });

  it('rejects invalid operation objects', () => {
    const data = {
      operations: [{ name: 'valid', spanKind: 'valid' }, { name: 'invalid' }],
    };
    expect(() => OperationsResponseSchema.parse(data)).toThrow(z.ZodError);
  });
});

describe('ID Validators', () => {
  describe('traceIdHex', () => {
    it('accepts valid 32-char lowercase hex trace ID', () => {
      const id = '0102030405060708090a0b0c0d0e0f10';
      expect(traceIdHex.parse(id)).toBe(id);
    });

    it('accepts valid 32-char uppercase hex trace ID', () => {
      const id = '0102030405060708090A0B0C0D0E0F10';
      expect(traceIdHex.parse(id)).toBe(id);
    });

    it('accepts valid 32-char mixed case hex trace ID', () => {
      const id = '0102030405060708090a0B0C0d0E0F10';
      expect(traceIdHex.parse(id)).toBe(id);
    });

    it('rejects trace ID with invalid characters', () => {
      expect(() => traceIdHex.parse('0102030405060708090a0b0c0d0e0fXX')).toThrow(
        'must be 32-char hex string'
      );
    });

    it('rejects trace ID with wrong length (too short)', () => {
      expect(() => traceIdHex.parse('0102030405060708090a0b0c0d0e0f')).toThrow('must be 32-char hex string');
    });

    it('rejects trace ID with wrong length (too long)', () => {
      expect(() => traceIdHex.parse('0102030405060708090a0b0c0d0e0f1011')).toThrow(
        'must be 32-char hex string'
      );
    });

    it('rejects base64-encoded trace ID', () => {
      expect(() => traceIdHex.parse('AQIDBAUG')).toThrow('must be 32-char hex string');
    });

    it('rejects empty string', () => {
      expect(() => traceIdHex.parse('')).toThrow('must be 32-char hex string');
    });
  });

  describe('spanIdHex', () => {
    it('accepts valid 16-char lowercase hex span ID', () => {
      const id = '0102030405060708';
      expect(spanIdHex.parse(id)).toBe(id);
    });

    it('accepts valid 16-char uppercase hex span ID', () => {
      const id = '0102030405060708';
      expect(spanIdHex.parse(id)).toBe(id);
    });

    it('rejects span ID with invalid characters', () => {
      expect(() => spanIdHex.parse('010203040506070X')).toThrow('must be 16-char hex string');
    });

    it('rejects span ID with wrong length (too short)', () => {
      expect(() => spanIdHex.parse('01020304050607')).toThrow('must be 16-char hex string');
    });

    it('rejects span ID with wrong length (too long)', () => {
      expect(() => spanIdHex.parse('01020304050607081')).toThrow('must be 16-char hex string');
    });

    it('rejects empty string', () => {
      expect(() => spanIdHex.parse('')).toThrow('must be 16-char hex string');
    });
  });
});
