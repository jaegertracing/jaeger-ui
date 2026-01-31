// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { TRendererUtils } from '@jaegertracing/plexus/lib/Digraph/types';
import { TLayoutEdge } from '@jaegertracing/plexus/lib/types';

import { getEdgeId } from '../../../model/ddg/GraphModel';

import { EViewModifier } from '../../../model/ddg/types';

// exported for tests
export const baseCase = { className: 'Ddg--Edge' };
export const matchMiss = { className: 'Ddg--Edge', markerEnd: null };

export default function getSetOnEdge(edgesViewModifiers: Map<string, number>) {
  if (!edgesViewModifiers.size) {
    return baseCase;
  }
  return function setOnEdge(lv: TLayoutEdge<unknown>, utils: TRendererUtils) {
    const edgeId = getEdgeId(lv.edge.from, lv.edge.to);

    if ((edgesViewModifiers.get(edgeId) || 0) & EViewModifier.PathHovered) {
      const markerEnd = `url(#${utils.getGlobalId('arrow-hovered')})`;
      return { markerEnd, className: 'Ddg--Edge is-pathHovered' };
    }
    return matchMiss;
  };
}
