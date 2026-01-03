// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { TPadEntry } from '../model/path-agnostic-decorations/types';

type TPathAgnosticDecorations = Record<
  string,
  {
    withOpMax?: number;
    withoutOpMax?: number;
    withoutOp?: Record<string, TPadEntry>;
    withOp?: Record<string, Record<string, TPadEntry>>;
  }
>;

export default TPathAgnosticDecorations;
