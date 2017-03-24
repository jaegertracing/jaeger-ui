// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import { createSelector, createStructuredSelector } from 'reselect';

import {
  getSpanId,
  getSpanName,
  getSpanServiceName,
  getSpanTimestamp,
  getSpanDuration,
  getSpanParentId,
  getSpanProcessId,
} from './span';
import { getProcessServiceName } from './process';
import {
  formatMillisecondTime,
  formatSecondTime,
  ONE_SECOND,
} from '../utils/date';
import { numberSortComparator } from '../utils/sort';
import TreeNode from '../utils/TreeNode';

export const getTraceId = trace => trace.traceID;

export const getTraceSpans = trace => trace.spans;
const getTraceProcesses = trace => trace.processes;
const getSpanWithProcess = createSelector(
  state => state.span,
  state => state.processes,
  (span, processes) => ({
    ...span,
    process: processes[getSpanProcessId(span)],
  })
);

export const getTraceSpansAsMap = createSelector(getTraceSpans, spans =>
  spans.reduce((map, span) => map.set(getSpanId(span), span), new Map()));

export const TREE_ROOT_ID = '__root__';

function insertSpanIntoTree(tree, span, spanMap) {
  const spanId = getSpanId(span);

  // base case: the span has already been visited
  // edge case: if the tree contains this spanId already, move on
  if (!tree.find(spanId)) {
    let parentId = getSpanParentId(span);

    // base case: if this span has no parent OR
    // edge case: if the the parent span is not found on the trace,
    // return the tree, since the main method will
    if (parentId && spanMap.has(parentId)) {
      // make sure that the parent gets inserted before we continue by recursing
      insertSpanIntoTree(tree, spanMap.get(parentId), spanMap);
    } else {
      parentId = TREE_ROOT_ID;
    }

    // add the child span to its parent
    const parentNode = tree.find(parentId);
    parentNode.addChild(spanId);
  }

  return tree;
}

export const getTraceSpanIdsAsTree = createSelector(
  getTraceSpans,
  getTraceSpansAsMap,
  (spans, spanMap) => {
    const result = spans.reduce(
      (tree, span) => insertSpanIntoTree(tree, span, spanMap),
      new TreeNode(TREE_ROOT_ID)
    );

    result.walk((value, node) =>
      node.children.sort((nodeA, nodeB) =>
        numberSortComparator(
          getSpanTimestamp(spanMap.get(nodeA.value)),
          getSpanTimestamp(spanMap.get(nodeB.value))
        )));

    return result;
  }
);

// attach "process" as an object to each span.
export const hydrateSpansWithProcesses = trace => {
  const spans = getTraceSpans(trace);
  const processes = getTraceProcesses(trace);

  return {
    ...trace,
    spans: spans.map(span => getSpanWithProcess({ span, processes })),
  };
};

export const getTraceSpanCount = createSelector(
  getTraceSpans,
  spans => spans.length
);

export const getTraceTimestamp = createSelector(getTraceSpans, spans =>
  spans.reduce(
    (prevTimestamp, span) =>
      prevTimestamp
        ? Math.min(prevTimestamp, getSpanTimestamp(span))
        : getSpanTimestamp(span),
    null
  ));

export const getTraceDuration = createSelector(
  getTraceSpans,
  getTraceTimestamp,
  (spans, timestamp) =>
    spans.reduce(
      (prevDuration, span) =>
        prevDuration
          ? Math.max(
              getSpanTimestamp(span) - timestamp + getSpanDuration(span),
              prevDuration
            )
          : getSpanDuration(span),
      null
    )
);

export const getTraceEndTimestamp = createSelector(
  getTraceTimestamp,
  getTraceDuration,
  (timestamp, duration) => timestamp + duration
);

export const getParentSpan = createSelector(
  getTraceSpanIdsAsTree,
  getTraceSpansAsMap,
  (tree, spanMap) =>
    tree.children
      .map(node => spanMap.get(node.value))
      .sort((spanA, spanB) =>
        numberSortComparator(getSpanTimestamp(spanA), getSpanTimestamp(spanB)))[
      0
    ]
);

export const getTraceDepth = createSelector(
  getTraceSpanIdsAsTree,
  spanTree => spanTree.depth - 1
);

export const getSpanDepthForTrace = createSelector(
  createSelector(state => state.trace, getTraceSpanIdsAsTree),
  createSelector(state => state.span, getSpanId),
  (node, spanID) => node.getPath(spanID).length - 1
);

export const getTraceServices = createSelector(getTraceProcesses, processes =>
  Object.keys(processes).reduce(
    (services, processID) =>
      services.add(getProcessServiceName(processes[processID])),
    new Set()
  ));

export const getTraceServiceCount = createSelector(
  getTraceServices,
  services => services.size
);

// establish constants to determine how math should be handled
// for nanosecond-to-millisecond conversions.
export const DURATION_FORMATTERS = {
  ms: formatMillisecondTime,
  s: formatSecondTime,
};

const getDurationFormatterForTrace = createSelector(
  getTraceDuration,
  totalDuration =>
    totalDuration >= ONE_SECOND ? DURATION_FORMATTERS.s : DURATION_FORMATTERS.ms
);

export const formatDurationForUnit = createSelector(
  ({ duration }) => duration,
  ({ unit }) => DURATION_FORMATTERS[unit],
  (duration, formatter) => formatter(duration)
);

export const formatDurationForTrace = createSelector(
  ({ duration }) => duration,
  createSelector(({ trace }) => trace, getDurationFormatterForTrace),
  (duration, formatter) => formatter(duration)
);

export const getSortedSpans = createSelector(
  ({ trace }) => trace,
  ({ spans }) => spans,
  ({ sort }) => sort,
  (trace, spans, { dir, comparator, selector }) =>
    [...spans].sort(
      (spanA, spanB) =>
        dir * comparator(selector(spanA, trace), selector(spanB, trace))
    )
);

const getTraceSpansByHierarchyPosition = createSelector(
  getTraceSpanIdsAsTree,
  tree => {
    const hierarchyPositionMap = new Map();
    let i = 0;
    tree.walk(spanID => hierarchyPositionMap.set(spanID, i++));
    return hierarchyPositionMap;
  }
);

export const getTreeSizeForTraceSpan = createSelector(
  createSelector(state => state.trace, getTraceSpanIdsAsTree),
  createSelector(state => state.span, getSpanId),
  (tree, spanID) => {
    const node = tree.find(spanID);
    if (!node) {
      return -1;
    }
    return node.size - 1;
  }
);

export const getSpanHierarchySortPositionForTrace = createSelector(
  createSelector(({ trace }) => trace, getTraceSpansByHierarchyPosition),
  ({ span }) => span,
  (hierarchyPositionMap, span) => hierarchyPositionMap.get(getSpanId(span))
);

export const getTraceName = createSelector(
  createSelector(
    createSelector(hydrateSpansWithProcesses, getParentSpan),
    createStructuredSelector({
      name: getSpanName,
      serviceName: getSpanServiceName,
    })
  ),
  ({ name, serviceName }) => `${serviceName}: ${name}`
);

export const omitCollapsedSpans = createSelector(
  ({ spans }) => spans,
  createSelector(({ trace }) => trace, getTraceSpanIdsAsTree),
  ({ collapsed }) => collapsed,
  (spans, tree, collapse) => {
    const hiddenSpanIds = collapse.reduce(
      (result, collapsedSpanId) => {
        tree
          .find(collapsedSpanId)
          .walk(id => id !== collapsedSpanId && result.add(id));
        return result;
      },
      new Set()
    );

    return hiddenSpanIds.size > 0
      ? spans.filter(span => !hiddenSpanIds.has(getSpanId(span)))
      : spans;
  }
);

export const DEFAULT_TICK_INTERVAL = 4;
export const DEFAULT_TICK_WIDTH = 3;
export const getTicksForTrace = createSelector(
  ({ trace }) => trace,
  ({ interval = DEFAULT_TICK_INTERVAL }) => interval,
  ({ width = DEFAULT_TICK_WIDTH }) => width,
  (
    trace,
    interval,
    width
    // timestamps will be spaced over the interval, starting from the initial timestamp
  ) =>
    [...Array(interval + 1).keys()].map(num => ({
      timestamp: getTraceTimestamp(trace) +
        getTraceDuration(trace) * (num / interval),
      width,
    }))
);

// TODO: delete this when the backend can ensure uniqueness
/* istanbul ignore next */
export const enforceUniqueSpanIds = createSelector(
  /* istanbul ignore next */ trace => trace,
  getTraceSpans,
  /* istanbul ignore next */ (trace, spans) => {
    const map = new Map();

    return {
      ...trace,
      spans: spans.reduce(
        (result, span) => {
          const spanID = map.has(getSpanId(span))
            ? `${getSpanId(span)}_${map.get(getSpanId(span))}`
            : getSpanId(span);
          const updatedSpan = { ...span, spanID };

          if (spanID !== getSpanId(span)) {
            console.warn(
              'duplicate spanID in trace replaced',
              getSpanId(span),
              'new:',
              spanID
            );
          }

          // set the presence of the span in the map or increment the number
          map.set(getSpanId(span), (map.get(getSpanId(span)) || 0) + 1);

          return result.concat([updatedSpan]);
        },
        []
      ),
    };
  }
);

// TODO: delete this when the backend can ensure uniqueness
export const dropEmptyStartTimeSpans = createSelector(
  /* istanbul ignore next */ trace => trace,
  getTraceSpans,
  /* istanbul ignore next */ (trace, spans) => ({
    ...trace,
    spans: spans.filter(span => !!getSpanTimestamp(span)),
  })
);
