// Copyright (c) 2018-2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { ILink, IOtelSpan } from '../../../types/otel';
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
  links: ILink[];
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
