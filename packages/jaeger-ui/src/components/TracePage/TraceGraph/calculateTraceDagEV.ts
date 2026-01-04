// Copyright (c) 2019 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import DRange from 'drange';

import { TEdge } from '@jaegertracing/plexus/lib/types';
import convPlexus from '../../../model/trace-dag/convPlexus';
import TraceDag from '../../../model/trace-dag/TraceDag';
import TDagNode from '../../../model/trace-dag/types/TDagNode';
import { TDenseSpanMembers } from '../../../model/trace-dag/types';
import { Trace } from '../../../types/trace';
import { IOtelSpan, IAttribute } from '../../../types/otel';
import { TSumSpan, TEv } from './types';

let parentChildOfMap: Record<string, IOtelSpan[]>;

export function isError(attributes: ReadonlyArray<IAttribute>) {
  if (attributes) {
    const errorAttr = attributes.find(t => t.key === 'error');
    if (errorAttr) {
      return errorAttr.value;
    }
  }

  return false;
}

export function mapFollowsFrom(
  edges: TEdge[],
  nodes: TDagNode<TSumSpan & TDenseSpanMembers>[]
): TEdge<{ followsFrom: boolean }>[] {
  return edges.map(e => {
    let hasChildOf = true;
    if (typeof e.to === 'number') {
      const node = nodes[e.to];
      hasChildOf = node.members.some(m => m.span.parentSpanID !== undefined);
    }
    return { ...e, followsFrom: !hasChildOf };
  });
}

function getChildOfSpans(parentID: string, otelTrace: ReturnType<Trace['asOtelTrace']>): IOtelSpan[] {
  if (!parentChildOfMap) {
    parentChildOfMap = {};
    otelTrace.spans.forEach(s => {
      if (s.parentSpanID) {
        // Only count CHILD_OF relationships (parentSpanID indicates CHILD_OF)
        const pID = s.parentSpanID;
        parentChildOfMap[pID] = parentChildOfMap[pID] || [];
        parentChildOfMap[pID].push(s);
      }
    });
  }
  return parentChildOfMap[parentID] || [];
}

function getChildOfDrange(parentID: string, otelTrace: ReturnType<Trace['asOtelTrace']>) {
  const childrenDrange = new DRange();
  getChildOfSpans(parentID, otelTrace).forEach(s => {
    // -1 otherwise it will take for each child a micro (incluse,exclusive)
    childrenDrange.add(
      s.startTimeUnixMicros,
      s.startTimeUnixMicros + (s.durationMicros <= 0 ? 0 : s.durationMicros - 1)
    );
  });
  return childrenDrange;
}

export function calculateTraceDag(trace: Trace): TraceDag<TSumSpan & TDenseSpanMembers> {
  const otelTrace = trace.asOtelTrace();
  const baseDag = TraceDag.newFromTrace(otelTrace);
  const dag = new TraceDag<TSumSpan & TDenseSpanMembers>();

  baseDag.nodesMap.forEach(node => {
    const ntime = node.members.reduce((p, m) => p + m.span.durationMicros, 0);
    const numErrors = node.members.reduce((p, m) => p + (isError(m.span.attributes) ? 1 : 0), 0);
    const childDurationsDRange = node.members.reduce((p, m) => {
      // Using DRange to handle overlapping spans (fork-join)
      const cdr = new DRange(
        m.span.startTimeUnixMicros,
        m.span.startTimeUnixMicros + m.span.durationMicros
      ).intersect(getChildOfDrange(m.span.spanID, otelTrace));
      return p + cdr.length;
    }, 0);
    const stime = ntime - childDurationsDRange;
    dag.addNode(node.id, node.parentID, {
      ...node,
      count: node.members.length,
      errors: numErrors,
      time: ntime,
      percent: (100 / otelTrace.durationMicros) * ntime,
      selfTime: stime,
      percentSelfTime: (100 / ntime) * stime,
    });
  });
  return dag;
}

export default function calculateTraceDagEV(trace: Trace): TEv {
  const traceDag = calculateTraceDag(trace);
  const nodes = [...traceDag.nodesMap.values()];
  const ev = convPlexus(traceDag.nodesMap);
  const edges = mapFollowsFrom(ev.edges, nodes);
  return { ...ev, edges };
}
