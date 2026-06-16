// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0
//
// Adapted from @pyroscope/flamegraph v0.35.6 (Apache-2.0)
// Copyright (c) 2020 Pyroscope, Inc.

// Derives table rows from the flamegraph tree, computing self-time as
// node.value minus sum of children values, then aggregating by name.

import { IFlameNode } from './convertOtelTraceToFlameData';

export interface IFlamegraphTableRow {
  key: string;
  serviceName: string;
  name: string;
  count: number;
  self: number;
  total: number;
}

export function generateTableData(root: IFlameNode): IFlamegraphTableRow[] {
  const groups = new Map<string, IFlamegraphTableRow>();
  aggregateNode(root, groups);
  return Array.from(groups.values());
}

function aggregateNode(node: IFlameNode, groups: Map<string, IFlamegraphTableRow>): void {
  const childrenTotal = node.children.reduce((sum, child) => sum + child.value, 0);
  const self = Math.max(0, node.value - childrenTotal);

  const existing = groups.get(node.name);
  if (existing) {
    existing.self += self;
    existing.total += node.value;
    existing.count += 1;
  } else {
    const serviceName = node.name.includes(': ') ? node.name.split(': ')[0] : node.name;
    groups.set(node.name, {
      key: node.name,
      serviceName,
      name: node.name,
      count: 1,
      self,
      total: node.value,
    });
  }

  for (const child of node.children) {
    aggregateNode(child, groups);
  }
}
