// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import './EmphasizedNode.css';

type EmphasizedNodeProps = {
  height: number;
  width: number;
};

function EmphasizedNode({ height, width }: EmphasizedNodeProps) {
  return (
    <svg>
      <rect
        className="EmphasizedNode--contrast is-non-scaling"
        vectorEffect="non-scaling-stroke"
        width={width}
        height={height}
      />
      <rect className="EmphasizedNode--contrast is-scaling" width={width} height={height} />
      <rect
        className="EmphasizedNode is-non-scaling"
        vectorEffect="non-scaling-stroke"
        width={width}
        height={height}
      />
      <rect className="EmphasizedNode is-scaling" width={width} height={height} />
    </svg>
  );
}

export default EmphasizedNode;
