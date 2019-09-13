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
import cx from 'classnames';
import { TLayoutVertex } from '@jaegertracing/plexus/lib/types';

import { TDdgVertex } from '../../../model/ddg/types';

import './node-renderers.css';

// eslint-disable-next-line import/prefer-default-export
export function getFindEmphasisRenderers(findMatches: Set<TDdgVertex>) {
  function renderVectorBorder(lv: TLayoutVertex<TDdgVertex>) {
    const className = cx('DdgNode-VectorBorder', {
      'is-findMatch': findMatches.has(lv.vertex),
      'is-focalNode': lv.vertex.isFocalNode,
    });
    return (
      <rect
        className={className}
        vectorEffect="non-scaling-stroke"
        width={lv.width - 2}
        height={lv.height - 2}
        x="1"
        y="1"
      />
    );
  }

  function renderVectorFindEmphasisOutline(lv: TLayoutVertex<any>) {
    if (!findMatches.has(lv.vertex)) {
      return null;
    }
    return (
      <rect
        className="DdgNode-VectorFindEmphasis--outline"
        vectorEffect="non-scaling-stroke"
        width={lv.width - 2}
        height={lv.height - 2}
        x="1"
        y="1"
      />
    );
  }

  function renderHtmlFindEmphasis(lv: TLayoutVertex<any>) {
    if (!findMatches.has(lv.vertex)) {
      return null;
    }
    return <div className="DdgNode-HtmlFindEmphasis" />;
  }

  function renderVectorFindEmphasisColorBand(lv: TLayoutVertex<any>) {
    if (!findMatches.has(lv.vertex)) {
      return null;
    }
    return (
      <rect
        className="DdgNode-VectorFindEmphasis--colorBand"
        vectorEffect="non-scaling-stroke"
        width={lv.width - 2}
        height={lv.height - 2}
        x="1"
        y="1"
      />
    );
  }

  return {
    htmlFindEmphasis: renderHtmlFindEmphasis,
    vectorBorder: renderVectorBorder,
    vectorFindColorBand: renderVectorFindEmphasisColorBand,
    vectorFindOutline: renderVectorFindEmphasisOutline,
  };
}
