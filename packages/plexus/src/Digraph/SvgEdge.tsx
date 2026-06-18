// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

// Offsets the label to the right so it clears the physical radius of the node circle
const SELF_LOOP_LABEL_X_OFFSET = 35;

import * as React from 'react';

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
};

function makeIriRef(renderUtils: TRendererUtils, localId: string | undefined) {
  return localId ? `url(#${renderUtils.getGlobalId(localId)})` : localId;
}

const PATH_D_CMDS = ['M', 'C'];

function makePathD(points: [number, number][]) {
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
function computeLabelCoord(pathPoints: [number, number][], label?: string | undefined, isSelfLoop?: boolean) {
  const [startX, startY] = pathPoints[0];
  const [endX, endY] = pathPoints[pathPoints.length - 1];

  const xOffset = (label?.length ?? 0) * 5;
  const labelX = (startX + endX) / 2 - xOffset;
  const labelY = (startY + endY) / 2;

  if (isSelfLoop) {
    return {
      labelX: labelX + SELF_LOOP_LABEL_X_OFFSET,
      labelY: labelY,
    };
  }

  return { labelX, labelY };
}

function SvgEdge<U = {}>(props: TProps<U>) {
  const { getClassName, layoutEdge, markerEndId, markerStartId, renderUtils, setOnEdge, label } = props;
  const { pathPoints } = layoutEdge;

  const d = React.useMemo(() => makePathD(pathPoints), [pathPoints]);

  const markerEnd = makeIriRef(renderUtils, markerEndId);
  const markerStart = makeIriRef(renderUtils, markerStartId);
  const customProps = assignMergeCss(
    {
      className: getClassName('SvgEdge'),
    },
    getProps(setOnEdge, layoutEdge, renderUtils)
  );

  // Detect self-referencing loops to offset the label so it doesn't overlap the node icon.
  const isSelfLoop = Boolean(layoutEdge.edge && layoutEdge.edge.from === layoutEdge.edge.to);

  const { labelX, labelY } = computeLabelCoord(pathPoints, label, isSelfLoop);

  return (
    <g>
      <path
        d={d}
        fill="none"
        vectorEffect="non-scaling-stroke"
        markerEnd={markerEnd}
        markerStart={markerStart}
        {...customProps}
      />

      {label && (
        <text x={labelX} y={labelY} fill="currentColor" fontSize="1rem" fontWeight="bold">
          {label}
        </text>
      )}
    </g>
  );
}

export default React.memo(SvgEdge) as typeof SvgEdge;
