// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IOtelTrace } from '../../../../types/otel';

export interface ISpanTagFilterProps {
  trace: IOtelTrace;
  useOtelTerms?: boolean;
}

export interface ITagEntry {
  key: string;
  count: number;
}
