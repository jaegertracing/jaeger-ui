// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

export type ApiError =
  | string
  | {
      message: string;
      httpStatus?: number;
      httpStatusText?: string;
      httpUrl?: string;
      httpQuery?: string;
      httpBody?: string;
    };

export function toApiError(caught: unknown): ApiError {
  if (typeof caught === 'string') {
    return caught;
  }
  if (caught instanceof Error) {
    // Keep the HTTP details JaegerClient attaches, so ErrorMessage can render them.
    const { httpStatus, httpStatusText, httpUrl, httpQuery, httpBody } = caught as Error &
      Exclude<ApiError, string>;
    return {
      message: caught.message,
      ...(httpStatus !== undefined && { httpStatus }),
      ...(httpStatusText !== undefined && { httpStatusText }),
      ...(httpUrl !== undefined && { httpUrl }),
      ...(httpQuery !== undefined && { httpQuery }),
      ...(httpBody !== undefined && { httpBody }),
    };
  }
  if (
    caught !== null &&
    typeof caught === 'object' &&
    'message' in caught &&
    typeof (caught as { message: unknown }).message === 'string'
  ) {
    return caught as ApiError;
  }
  return { message: String(caught) };
}
