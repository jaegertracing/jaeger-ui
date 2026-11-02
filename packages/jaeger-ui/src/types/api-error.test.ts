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
      expect(toApiError(new Error('boom'))).toStrictEqual({ message: 'boom' });
    });

    it('returns { message } from a subclass of Error', () => {
      class CustomError extends Error {}
      expect(toApiError(new CustomError('custom'))).toStrictEqual({ message: 'custom' });
    });
  });

  describe('Error with HTTP details', () => {
    it('keeps the details JaegerClient attaches', () => {
      const error = Object.assign(new Error('Failed to fetch services: 400 Bad Request'), {
        httpStatus: 400,
        httpStatusText: 'Bad Request',
        httpUrl: '/api/v3/services',
        httpQuery: 'id=1',
        httpBody: 'invalid service name',
      });
      expect(toApiError(error)).toStrictEqual({
        message: 'Failed to fetch services: 400 Bad Request',
        httpStatus: 400,
        httpStatusText: 'Bad Request',
        httpUrl: '/api/v3/services',
        httpQuery: 'id=1',
        httpBody: 'invalid service name',
      });
    });

    it('copies only the details that are set', () => {
      const error = Object.assign(new Error('Failed to fetch services: 503'), {
        httpStatus: 503,
        httpStatusText: '',
        httpUrl: '/api/v3/services',
      });
      expect(toApiError(error)).toStrictEqual({
        message: 'Failed to fetch services: 503',
        httpStatus: 503,
        httpStatusText: '',
        httpUrl: '/api/v3/services',
      });
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
