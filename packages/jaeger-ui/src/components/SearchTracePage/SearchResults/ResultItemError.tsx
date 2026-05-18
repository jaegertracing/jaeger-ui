// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import './ResultItemError.css';

type Props = {
  traceID: string;
  message?: string;
};

export default function ResultItemError({ traceID, message }: Props) {
  return (
    <div className="ResultItemError" data-testid="ResultItemError">
      <h3 className="ub-m0">
        <span className="ResultItemError--label">Trace fetch failed:</span>{' '}
        <span className="ResultItemError--traceID">{traceID}</span>
      </h3>
      {message && <div className="ResultItemError--message">{message}</div>}
    </div>
  );
}
