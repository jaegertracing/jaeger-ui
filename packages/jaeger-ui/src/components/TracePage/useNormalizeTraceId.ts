// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { getUrl } from './url';
import { normalizeId } from '../../model/transform-trace-data';

// Normalizes the trace ID in the URL to lowercase. Redirects if the URL carries an
// uppercase form so that shared/bookmarked URLs resolve consistently.
export function useNormalizeTraceId(traceID: string): string {
  const normalizedTraceID = normalizeId(traceID);
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
