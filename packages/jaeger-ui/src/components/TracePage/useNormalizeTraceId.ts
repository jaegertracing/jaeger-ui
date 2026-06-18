// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { getUrl } from './url';
import type { IOtelTrace } from '../../types/otel';

/**
 * After a trace is loaded, redirects the URL to the canonical trace ID
 * returned by the backend if it differs from what is in the URL.
 * This handles cases like uppercase hex, base64-encoded IDs, or any other
 * alternate representation the backend accepts but normalizes on return.
 */
export function useNormalizeTraceId(urlTraceId: string, trace: IOtelTrace | undefined): void {
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (!trace) return;
    const canonicalId = trace.traceID;
    if (canonicalId && canonicalId !== urlTraceId) {
      const url = getUrl(canonicalId);
      navigate(`${url}${location.search}`, { replace: true, state: location.state });
    }
    // eslint-disable-next-line react-x/exhaustive-deps
  }, [trace, urlTraceId]);
}
