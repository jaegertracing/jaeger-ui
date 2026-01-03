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
