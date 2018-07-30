// @flow

// Copyright (c) 2018 Uber Technologies, Inc.
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

import DagNode from '../../../model/trace-dag/DagNode';

import type { DiffMembers } from '../../../model/trace-dag/DagNode';
import type { DenseSpan, NodeID } from '../../../model/trace-dag/types';

type AvgDurations = {
  a: ?number,
  b: ?number,
};

const avgDurationsCache: WeakMap<DiffMembers, AvgDurations> = new WeakMap();

// export function getAvgDuration(denseSpans: ?DenseSpan[]) {
function getAvgDuration(denseSpans: ?(DenseSpan[])) {
  if (!denseSpans) {
    return null;
  }
  let sum = 0;
  for (let i = 0; i < denseSpans.length; i++) {
    sum += denseSpans[i].span.duration;
  }
  return sum / denseSpans.length;
}

export function getAvgDurations(diff: DiffMembers) {
  const cached = avgDurationsCache.get(diff);
  if (cached) {
    return cached;
  }
  const a = getAvgDuration(diff.a && diff.a.members);
  const b = getAvgDuration(diff.b && diff.b.members);
  const rv = { a, b };
  avgDurationsCache.set(diff, rv);
  return rv;
}

export function getRelativeDifference(a: number, b: number) {
  return (a - b) / Math.max(a, b) * 100;
}

function getDifference(a: number, b: number) {
  return a - b;
}

export function getAvgDurationDiffDomain(scaleOn: ?string, nodesMap: Map<NodeID, DagNode>) {
  let maxRelDiff = 0;
  const getDiff = scaleOn === 'relative' ? getRelativeDifference : getDifference;
  const keys = [...nodesMap.keys()];
  for (let i = 0; i < keys.length; i++) {
    const id = keys[i];
    const dagNode = nodesMap.get(id);
    if (!dagNode) {
      continue;
    }
    const { a, b } = getAvgDurations(dagNode.data);
    if (a == null || b == null) {
      continue;
    }
    const relDiff = Math.abs(getDiff(a, b));
    if (relDiff > maxRelDiff) {
      maxRelDiff = relDiff;
    }
  }
  return [-maxRelDiff, 0, maxRelDiff];
}
