// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import denseTransforms from './denseTransforms';
import { TDenseSpan } from './types';
import { IOtelSpan, IOtelTrace } from '../../types/otel';

function convSpans(spans: ReadonlyArray<IOtelSpan>) {
  const map: Map<string, TDenseSpan> = new Map();
  const roots: Set<string> = new Set();
  const ids: string[] = [];
  spans.forEach(span => {
    const { spanID: id, name: operation, resource, parentSpanID, attributes: spanAttributes } = span;
    ids.push(id);
    const { serviceName: service } = resource;

    const attributes = spanAttributes.reduce((accum: Record<string, any>, attr) => {
      const { key, value } = attr;
      return { ...accum, [key]: value };
    }, {});

    const parentID: string | null = parentSpanID || null;

    const denseSpan = {
      id,
      operation,
      parentID,
      service,
      span,
      attributes,
      children: new Set<string>(),
      skipToChild: false,
    };
    const parent = parentID && map.get(parentID);
    if (!parent) {
      // some root spans have a parent ID but it is missing
      roots.add(id);
    } else {
      parent.children.add(id);
    }
    map.set(id, denseSpan);
  });
  return { ids, map, roots };
}

function makeDense(spanIDs: string[], map: Map<string, TDenseSpan>) {
  spanIDs.forEach(id => {
    const denseSpan = map.get(id);
    // make flow happy
    if (denseSpan) {
      denseTransforms(denseSpan, map);
    }
  });
}

export default class DenseTrace {
  trace: IOtelTrace;
  rootIDs: Set<string>;
  denseSpansMap: Map<string, TDenseSpan>;

  constructor(trace: IOtelTrace) {
    this.trace = trace;
    const { ids, map, roots } = convSpans(trace.spans);
    makeDense(ids, map);
    this.rootIDs = roots;
    this.denseSpansMap = map;
  }
}
