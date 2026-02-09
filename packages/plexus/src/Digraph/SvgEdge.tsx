// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import memoizeOne from 'memoize-one';

import { TAnyProps, TRendererUtils, TSetProps } from './types';
import { assignMergeCss, getProps } from './utils';
import { TLayoutEdge } from '../types';

type TProps<U = {}> = {
  getClassName: (name: string) => string;
  layoutEdge: TLayoutEdge<U>;
  markerEndId?: string;
  markerStartId?: string;
  renderUtils: TRendererUtils;
  setOnEdge?: TSetProps<(edge: TLayoutEdge<U>, utils: TRendererUtils) => TAnyProps | null>;
  label?: string;
  setOnTop?: boolean;
};

function makeIriRef(renderUtils: TRendererUtils, localId: string | undefined) {
  return localId ? `url(#${renderUtils.getGlobalId(localId)})` : localId;
}

const PATH_D_CMDS = ['M', 'C'];

function makePathD(points: [number, number][]) {
  // If points is missing, return an empty string instead of crashing
  if (!points || !points.length) {
    return '';
  }
  const dArr = [];
  const cmdLen = PATH_D_CMDS.length;
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (i < cmdLen) {
      dArr.push(PATH_D_CMDS[i]);
    }
    dArr.push(pt[0], pt[1]);
  }
  return dArr.join(' ');
}

function computeLabelCoord(pathPoints: [number, number][], label?: string | undefined) {
  // ADD SAFETY GUARD:
  if (!pathPoints || pathPoints.length === 0) {
    return { labelX: 0, labelY: 0 };
  }

  const [startX, startY] = pathPoints[0];
  const [endX, endY] = pathPoints[pathPoints.length - 1];

  const xOffset = (label?.length ?? 0) * 5;
  const labelX = (startX + endX) / 2 - xOffset;
  const labelY = (startY + endY) / 2;

  return { labelX, labelY };
}

export default class SvgEdge<U = {}> extends React.PureComponent<TProps<U>> {
  makePathD = memoizeOne(makePathD);

  render() {
    const { getClassName, layoutEdge, markerEndId, markerStartId, renderUtils, setOnEdge, setOnTop } =
      this.props;
    const { pathPoints, edge } = layoutEdge;
    const label = this.props.label || edge.label;
    const d = this.makePathD(pathPoints);
    const markerEnd = makeIriRef(renderUtils, markerEndId);
    const markerStart = makeIriRef(renderUtils, markerStartId);
    const customProps = assignMergeCss(
      {
        className: getClassName('SvgEdge'),
      },
      getProps(setOnEdge, layoutEdge, renderUtils)
    );

    const { labelX, labelY } = computeLabelCoord(pathPoints, label);

    // Define the Path element
    const pathElement = (
      <path
        d={d}
        fill="none"
        vectorEffect="non-scaling-stroke"
        markerEnd={markerEnd}
        markerStart={markerStart}
        {...customProps}
      />
    );

    // Define the Label element
    const labelElement = label ? (
      <text
        x={labelX}
        y={labelY}
        fill="#000"
        fontSize="1rem"
        fontWeight="bold"
        style={{ pointerEvents: 'none' }}
      >
        {label}
      </text>
    ) : null;

    // --- NEW LOGIC START ---
    if (setOnTop === true) {
      return labelElement; // Only render label in foreground pass
    }
    if (setOnTop === false) {
      return pathElement; // Only render path in background pass
    }

    // Default (setOnTop is undefined): Render both for legacy support
    return (
      <g>
        {pathElement}
        {labelElement}
      </g>
    );
    // --- NEW LOGIC END --
  }
}
