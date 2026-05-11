// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import './RelativeBar.css';

type Props = {
  value: number;
  maxValue: number;
};

const RelativeBar: React.FC<Props> = ({ value, maxValue }) => {
  const safeMax = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 1;
  const percentage = Math.min(100, Math.max(0, (value / safeMax) * 100));

  return (
    <div className="RelativeBar">
      <div className="RelativeBar--fill" style={{ width: `${Math.max(percentage, 2)}%` }} />
    </div>
  );
};

export default RelativeBar;
