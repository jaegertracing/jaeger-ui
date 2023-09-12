// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import TreeNode from '../utils/TreeNode';
import { Span, SpanData } from '../types/trace';

export const TREE_ROOT_ID = '__root__';

/**
 * Build a tree of { value: spanID, children } items derived from the
 * `span.references` information. The tree represents the grouping of parent /
 * child relationships. The root-most node is nominal in that
 * `.value === TREE_ROOT_ID`. This is done because a root span (the main trace
 * span) is not always included with the trace data. Thus, there can be
 * multiple top-level spans, and the root node acts as their common parent.
 *
 * The children are sorted by `span.startTime` after the tree is built.
 *
 * @param  {Trace}             trace The trace to build the tree of spanIDs.
 * @param  {Map<string, Span>} spanMap map from span IDs to Spans
 * @return {TreeNode}          A tree of spanIDs derived from the relationships
 *                             between spans in the trace.
 */
export function getTraceSpanIdsAsTree(
  trace: { spans: SpanData[] },
  spanMap: Map<string, Span> | null = null
) {
  const nodesById = new Map(trace.spans.map(span => [span.spanID, new TreeNode<string>(span.spanID)]));
  const spansById = spanMap ?? new Map(trace.spans.map(span => [span.spanID, span]));
  const root = new TreeNode<string>(TREE_ROOT_ID);
  trace.spans.forEach(span => {
    const node = nodesById.get(span.spanID);
    if (!node) {
      return;
    }
    if (Array.isArray(span.references) && span.references.length) {
      const { refType, spanID: parentID } = span.references[0];
      if (refType === 'CHILD_OF' || refType === 'FOLLOWS_FROM') {
        const parent = nodesById.get(parentID) || root;
        parent.children.push(node);
      } else {
        throw new Error(`Unrecognized ref type: ${refType}`);
      }
    } else {
      root.children.push(node);
    }
  });
  const comparator = (nodeA: TreeNode<string>, nodeB: TreeNode<string>): number => {
    const a = spansById.get(nodeA.value);
    const b = spansById.get(nodeB.value);
    if (!a || !b) {
      return 0;
    }
    return +(a.startTime > b.startTime) || +(a.startTime === b.startTime) - 1;
  };
  trace.spans.forEach(span => {
    const node = nodesById.get(span.spanID);
    if (node && node.children.length > 1) {
      node.children.sort(comparator);
    }
  });
  root.children.sort(comparator);
  return root;
}

export default getTraceSpanIdsAsTree;
