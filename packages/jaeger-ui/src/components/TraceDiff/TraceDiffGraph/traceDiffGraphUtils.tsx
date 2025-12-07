// Copyright (c) 2019-2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { TVertexKey } from '@jaegertracing/plexus/lib/types';
import _get from 'lodash/get';
import _map from 'lodash/map';
import memoizeOne from 'memoize-one';

import convPlexus from '../../../model/trace-dag/convPlexus';
import TraceDag from '../../../model/trace-dag/TraceDag';
import { TDenseSpanMembers, TDiffCounts } from '../../../model/trace-dag/types';
import TDagPlexusVertex from '../../../model/trace-dag/types/TDagPlexusVertex';
import { Trace } from '../../../types/trace';
import filterSpans from '../../../utils/filter-spans';

function getUiFindVertexKeysFn(
  uiFind: string,
  vertices: TDagPlexusVertex<TDenseSpanMembers>[]
): Set<TVertexKey> {
  if (!uiFind) return new Set<TVertexKey>();
  const newVertexKeys: Set<TVertexKey> = new Set();
  vertices.forEach(({ key, data: { members } }) => {
    if (_get(filterSpans(uiFind, _map(members, 'span')), 'size')) {
      newVertexKeys.add(key);
    }
  });
  return newVertexKeys;
}

export const getUiFindVertexKeys = memoizeOne(getUiFindVertexKeysFn);

function getEdgesAndVerticesFn(aData: Trace, bData: Trace) {
  const aTraceDag = TraceDag.newFromTrace(aData);
  const bTraceDag = TraceDag.newFromTrace(bData);
  const diffDag = TraceDag.diff(aTraceDag, bTraceDag);
  return convPlexus<TDiffCounts>(diffDag.nodesMap);
}

export const getEdgesAndVertices = memoizeOne(getEdgesAndVerticesFn);
