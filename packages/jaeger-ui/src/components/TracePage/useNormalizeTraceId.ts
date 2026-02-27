// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom-v5-compat';

import { getUrl } from './url';

// Custom hook that normalizes a trace ID to lowercase in the URL
export function useNormalizeTraceId(traceID: string): string {
  const normalizedTraceID = traceID.toLowerCase();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (traceID && traceID !== normalizedTraceID) {
      const url = getUrl(normalizedTraceID);
      navigate(`${url}${location.search}`, { replace: true, state: location.state });
    }
  }, [traceID, normalizedTraceID, navigate, location.search, location.state]);

  return normalizedTraceID;
}
