// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IOtelTrace, IOtelSpan } from '../../../types/otel';

export interface IFlameNode {
  name: string;
  value: number;
  count: number;
  children: IFlameNode[];
}

export function convertOtelTraceToFlameData(trace: IOtelTrace): IFlameNode {
  const rootSpans = trace.rootSpans;
  const virtualRoot: IFlameNode = {
    name: 'total',
    value: 0,
    count: 1,
    children: [],
  };

  for (const span of rootSpans) {
    virtualRoot.children.push(buildSubtree(span));
  }

  virtualRoot.value = virtualRoot.children.reduce((sum, child) => sum + child.value, 0);
  return virtualRoot;
}

function buildSubtree(span: IOtelSpan): IFlameNode {
  const children: IFlameNode[] = [];
  for (const child of span.childSpans) {
    children.push(buildSubtree(child));
  }

  const grouped = groupChildrenByName(children);

  return {
    name: `${span.resource.serviceName}: ${span.name}`,
    value: span.duration,
    count: 1,
    children: grouped,
  };
}

function groupChildrenByName(children: IFlameNode[]): IFlameNode[] {
  const groups = new Map<string, IFlameNode>();
  for (const child of children) {
    const existing = groups.get(child.name);
    if (existing) {
      existing.value += child.value;
      existing.count += child.count;
      existing.children.push(...child.children);
    } else {
      groups.set(child.name, { ...child, children: [...child.children] });
    }
  }
  for (const node of groups.values()) {
    if (node.children.length > 1) {
      node.children = groupChildrenByName(node.children);
    }
  }
  return Array.from(groups.values());
}
