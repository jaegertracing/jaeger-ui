// Copyright (c) 2019 Uber Technologies, Inc.
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

import * as React from 'react';

import { TRendererUtils, TSetProps, TAnyProps } from './types';
import { TLayoutEdge } from '../types';
import { getProps } from './utils';
import { assignMergeCss } from '../DirectedGraph/prop-factories/mergePropSetters';

type TProps<U = {}> = {
  classNamePrefix?: string;
  layoutEdge: TLayoutEdge<U>;
  markerEndId?: string;
  markerStartId?: string;
  renderUtils: TRendererUtils;
  setOnEdge?: TSetProps<(edge: TLayoutEdge<U>, utils: TRendererUtils) => TAnyProps | null>;
};

const PATH_D_CMDS = ['M', 'C'];

function makeIriRef(renderUtils: TRendererUtils, localId: string | undefined) {
  return localId ? `url(#${renderUtils.getLocalId(localId)})` : localId;
}

export default class SvgEdge<U = {}> extends React.PureComponent<TProps<U>> {
  render() {
    const { classNamePrefix, layoutEdge, markerEndId, markerStartId, renderUtils, setOnEdge } = this.props;
    const { pathPoints } = layoutEdge;
    const d = pathPoints.map((pt, i) => `${PATH_D_CMDS[i] || ''}${pt.join(',')}`).join(' ');
    const markerEnd = makeIriRef(renderUtils, markerEndId);
    const markerStart = makeIriRef(renderUtils, markerStartId);
    const customProps = assignMergeCss(getProps(setOnEdge, layoutEdge, renderUtils), {
      className: `${classNamePrefix} ${classNamePrefix}-LayeredDigraph--SvgEdge`,
    });
    return (
      <path
        d={d}
        fill="none"
        vectorEffect="non-scaling-stroke"
        markerEnd={markerEnd}
        markerStart={markerStart}
        {...customProps}
      />
    );
  }
}
