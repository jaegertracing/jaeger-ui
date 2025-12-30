// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { followsFromRef } from './trace.fixture';
import * as traceSelectors from './trace';
import traceGenerator from '../demo/trace-generators';

const generatedTrace = traceGenerator.trace({ numberOfSpans: 45 });

describe('getTraceSpanIdsAsTree()', () => {
  const getTraceSpansAsMap = trace =>
    trace.spans.reduce((map, span) => map.set(span.spanID, span), new Map());
  it('builds the tree properly', () => {
    const { root: tree, nodesBySpanId } = traceSelectors.getTraceSpanIdsAsTree(generatedTrace);
    const spanMap = getTraceSpansAsMap(generatedTrace);

    tree.walk((value, node) => {
      const expectedParentValue = value === traceSelectors.TREE_ROOT_ID ? null : value;
      node.children.forEach(childNode => {
        const span = spanMap.get(childNode.value);
        const parentId = span.references.find(ref => ref.refType === 'CHILD_OF')?.spanID ?? null;
        expect(parentId).toBe(expectedParentValue);
      });
    });

    // Verify nodesBySpanId contains all spans
    expect(nodesBySpanId.size).toBe(generatedTrace.spans.length);
    generatedTrace.spans.forEach(span => {
      expect(nodesBySpanId.has(span.spanID)).toBe(true);
    });
  });

  it('#115 - handles FOLLOW_FROM refs', () => {
    expect(() => traceSelectors.getTraceSpanIdsAsTree(followsFromRef)).not.toThrow();
  });
});
