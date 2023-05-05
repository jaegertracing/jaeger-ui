// Copyright (c) 2019 The Jaeger Authors.
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

import { Trace } from '../../../types/trace';
import { TDagNode, TDenseSpan, NodeID } from '../../../model/trace-dag/types';
import TraceDag from '../../../model/trace-dag/TraceDag';
import transformTraceData from '../../../model/transform-trace-data';

export function criticalPathUtility(traceDag: TraceDag, criticalPath: [], currentNode: {}): []{
  // current Node is obviously on the critical path
  criticalPath.push(currentNode.members[0].span);

  // if current Node is leaf node return criticalPath
  if (currentNode.children.size === 0){
    return criticalPath;
  }

  // get all children of current node along with computed end times
  const childrenNodes = [];
  currentNode.children.forEach(childNodeID => {
    const childNode = traceDag.getNode(childNodeID);
    const endTime = childNode.members[0].span.startTime + childNode.members[0].span.duration - 1;
    childrenNodes.push({...childNode, endTime});
  })

  // sort children by their end times
  childrenNodes.sort((a,b) => {
    return b.endTime - a.endTime
  })

  // step 2. begin by the child who finishes last
  const lfc = childrenNodes[0]
  criticalPathUtility(traceDag, criticalPath, lfc)

  for ( let i = 1; i < childrenNodes.length; i++){
    // first child node is already added
    // get the child who just finished before the start of last finishing child(lfc)
    if (childrenNodes[i].endTime <= lfc.members[0].span.startTime){
      criticalPathUtility(traceDag, criticalPath, childrenNodes[i])
    }
  }

  return criticalPath;
}

function findRootNode(nodesMap): TDagNode {
  const values = [...nodesMap.values()];
  return values.filter(node => node.parentID == null)
}

export function spanIdNoGrouping(denseSpan: TDenseSpan, parentID: NodeID | null): NodeID {
  return denseSpan.id
}

export default function computeCriticalPath(trace: Trace): Trace {
  const transformedTrace = transformTraceData(trace.data[0]);
  const baseDag = TraceDag.newFromTrace(trace.data[0], spanIdNoGrouping);
  const rootValue = findRootNode(baseDag.nodesMap)

  const criticalPath = criticalPathUtility(baseDag, [], rootValue[0]);

  return {
    ...transformedTrace,
   spans: criticalPath,
};
}