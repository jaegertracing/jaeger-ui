// Copyright (c) 2019 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import DRange from 'drange';

import { TEdge } from '@jaegertracing/plexus/lib/types';
import convPlexus from '../../../model/trace-dag/convPlexus';
import TraceDag from '../../../model/trace-dag/TraceDag';
import TDagNode from '../../../model/trace-dag/types/TDagNode';
import { TDenseSpanMembers } from '../../../model/trace-dag/types';
import { Trace } from '../../../types/trace';
import { IOtelSpan, SpanKind, StatusCode } from '../../../types/otel';
import { TSumSpan, TEv } from './types';

let parentChildOfMap: Record<string, IOtelSpan[]>;

export function mapFollowsFrom(
  edges: TEdge[],
  nodes: TDagNode<TSumSpan & TDenseSpanMembers>[]
): TEdge<{ followsFrom: boolean }>[] {
  return edges.map(e => {
    // In OTEL model, the blocking nature of child spans is determined by span kind:
    // - CONSUMER child of PRODUCER parent is non-blocking (followsFrom: true)
    // - INTERNAL/CLIENT/SERVER/PRODUCER spans are blocking (followsFrom: false)
    let followsFrom = false;
    if (typeof e.to === 'number') {
      const node = nodes[e.to];
      // A node represents a non-blocking relationship if any of its members are CONSUMER spans
      // (which implies a PRODUCER-CONSUMER pair in the parent-child relationship)
      followsFrom = node.members.some(m => m.span.kind === SpanKind.CONSUMER);
    }
    return { ...e, followsFrom };
  });
}

/**
 * Gets blocking child spans (children that contribute to parent's critical path).
 * In OTEL, CONSUMER children of PRODUCER parents are non-blocking and should be excluded
 * from critical path calculations, similar to how FOLLOWS_FROM was excluded in legacy code.
 */
function getBlockingChildSpans(parentID: string, otelTrace: ReturnType<Trace['asOtelTrace']>): IOtelSpan[] {
  if (!parentChildOfMap) {
    parentChildOfMap = {};
    otelTrace.spans.forEach(s => {
      if (s.parentSpanID) {
        const pID = s.parentSpanID;
        // Only include blocking children (not CONSUMER spans)
        // CONSUMER spans are non-blocking in PRODUCER-CONSUMER pairs
        if (s.kind !== SpanKind.CONSUMER) {
          parentChildOfMap[pID] = parentChildOfMap[pID] || [];
          parentChildOfMap[pID].push(s);
        }
      }
    });
  }
  return parentChildOfMap[parentID] || [];
}

function getChildOfDrange(parentID: string, otelTrace: ReturnType<Trace['asOtelTrace']>) {
  const childrenDrange = new DRange();
  getBlockingChildSpans(parentID, otelTrace).forEach(s => {
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
    const numErrors = node.members.reduce((p, m) => p + (m.span.status.code === StatusCode.ERROR ? 1 : 0), 0);
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
