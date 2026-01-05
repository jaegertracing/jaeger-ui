// Copyright (c) 2018-2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IOtelSpan } from '../../../types/otel';
import { TNil } from '../../../types';

export type NodeID = string;

export type TDenseSpan = {
  span: IOtelSpan;
  id: string;
  service: string;
  operation: string;
  attributes: Record<string, any>;
  parentID: string | TNil;
  skipToChild: boolean;
  children: Set<string>;
};

export type TDenseSpanMembers = {
  members: TDenseSpan[];
  operation: string;
  service: string;
};

export type TDiffCounts = TDenseSpanMembers & {
  a: TDenseSpan[] | null;
  b: TDenseSpan[] | null;
};
