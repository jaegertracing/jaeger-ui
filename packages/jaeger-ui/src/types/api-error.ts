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
    return { message: caught.message };
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
