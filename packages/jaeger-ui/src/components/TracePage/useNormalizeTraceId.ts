// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { getUrl } from './url';

// Normalizes the trace ID in the URL: lowercase and left-padded to the canonical
// 32-char OTEL 128-bit form. Redirects so that short or mixed-case IDs in shared
// or user-typed URLs always resolve to the full canonical representation.
export function useNormalizeTraceId(traceID: string): string {
  const normalizedTraceID = traceID.toLowerCase().padStart(32, '0');
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (traceID && traceID !== normalizedTraceID) {
      const url = getUrl(normalizedTraceID);
      navigate(`${url}${location.search}`, { replace: true, state: location.state });
    }
    // eslint-disable-next-line react-x/exhaustive-deps
  }, [traceID, normalizedTraceID]);

  return normalizedTraceID;
}
