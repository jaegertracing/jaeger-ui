// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import cx from 'classnames';
import { TLayoutVertex } from '@jaegertracing/plexus/lib/types';

import { TDdgVertex, EViewModifier } from '../../../model/ddg/types';

import './getNodeRenderers.css';

export default function getNodeRenderers(findMatches: Set<string>, viewModifiers: Map<string, number>) {
  function vectorBorder(lv: TLayoutVertex<TDdgVertex>) {
    const isHovered = (viewModifiers.get(lv.vertex.key) || 0) & EViewModifier.Hovered;

    const isPathHovered = (viewModifiers.get(lv.vertex.key) || 0) & EViewModifier.PathHovered;
    const className = cx('DdgNode--VectorBorder', {
      'is-findMatch': findMatches.has(lv.vertex.key),
      'is-hovered': isHovered,
      'is-pathHovered': isPathHovered,
      'is-focalNode': lv.vertex.isFocalNode,
    });
    return (
      <circle
        className={className}
        vectorEffect="non-scaling-stroke"
        r={lv.width / 2 - 1}
        cx={lv.width / 2}
        cy={lv.width / 2}
      />
    );
  }

  function htmlEmphasis(lv: TLayoutVertex<{ isFocalNode: boolean }>) {
    const matchClasses = cx({
      'is-findMatch': findMatches.has(lv.vertex.key),
      'is-focalNode': lv.vertex.isFocalNode,
    });
    if (!matchClasses) {
      return null;
    }
    return <div className={`DdgNode--HtmlEmphasis ${matchClasses}`} />;
  }

  if (!findMatches.size) {
    return {
      vectorBorder,
      htmlEmphasis,
      vectorFindColorBand: null,
    };
  }

  function vectorFindColorBand(lv: TLayoutVertex) {
    if (!findMatches.has(lv.vertex.key)) {
      return null;
    }

    return (
      <circle
        className="DdgNode--VectorFindEmphasis--colorBand"
        vectorEffect="non-scaling-stroke"
        r={lv.width / 2 - 1}
        cx={lv.width / 2}
        cy={lv.width / 2}
      />
    );
  }

  return {
    htmlEmphasis,
    vectorBorder,
    vectorFindColorBand,
  };
}
