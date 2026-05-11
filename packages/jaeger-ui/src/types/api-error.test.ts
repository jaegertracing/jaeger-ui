// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { toApiError } from './api-error';

describe('toApiError', () => {
  describe('string input', () => {
    it('returns the string as-is', () => {
      expect(toApiError('something went wrong')).toBe('something went wrong');
    });

    it('returns an empty string as-is', () => {
      expect(toApiError('')).toBe('');
    });
  });

  describe('Error instance', () => {
    it('returns { message } from a plain Error', () => {
      expect(toApiError(new Error('boom'))).toEqual({ message: 'boom' });
    });

    it('returns { message } from a subclass of Error', () => {
      class CustomError extends Error {}
      expect(toApiError(new CustomError('custom'))).toEqual({ message: 'custom' });
    });
  });

  describe('object with a string message property', () => {
    it('returns the object when it has a string message', () => {
      const payload = { message: 'from API', httpStatus: 500, httpStatusText: 'Internal Error' };
      expect(toApiError(payload)).toBe(payload);
    });

    it('ignores message property when it is not a string', () => {
      expect(toApiError({ message: 99 })).toEqual({ message: '[object Object]' });
    });

    it('ignores message property when it is null', () => {
      expect(toApiError({ message: null })).toEqual({ message: '[object Object]' });
    });
  });

  describe('fallback via String()', () => {
    it('wraps null', () => {
      expect(toApiError(null)).toEqual({ message: 'null' });
    });

    it('wraps undefined', () => {
      expect(toApiError(undefined)).toEqual({ message: 'undefined' });
    });

    it('wraps a number', () => {
      expect(toApiError(42)).toEqual({ message: '42' });
    });

    it('wraps a boolean', () => {
      expect(toApiError(false)).toEqual({ message: 'false' });
    });

    it('wraps a plain object with no message key', () => {
      expect(toApiError({})).toEqual({ message: '[object Object]' });
    });
  });
});
