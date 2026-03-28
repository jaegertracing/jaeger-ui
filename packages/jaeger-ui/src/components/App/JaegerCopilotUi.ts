// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import {
  useCopilotAdditionalInstructions,
  useCopilotReadable,
  useFrontendTool,
} from '@copilotkit/react-core';
import { useMemo } from 'react';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import { getUrl as getSearchUrl } from '../SearchTracePage/url';
import { getUrl as getCompareUrl } from '../TraceDiff/url';
import { ROUTE_PATH as TRACE_ROUTE_PATH } from '../TracePage/url';

/*
  No visible UI—only hooks: useCopilotReadable (route/trace context for the model),
  useCopilotAdditionalInstructions (how to behave on trace vs other pages),
  useFrontendTool (e.g. navigate to search/compare). Keeps the agent aligned with where you are in Jaeger.
*/
export default function JaegerCopilotUi(): null {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const traceMatch = matchPath({ path: TRACE_ROUTE_PATH, end: true }, pathname);
  const rawId = traceMatch?.params?.id;
  const traceSegment = typeof rawId === 'string' ? rawId : undefined;

  const compareIds = useMemo(() => {
    if (!traceSegment) {
      return null;
    }
    const parts = traceSegment.split('...');
    if (parts.length !== 2) {
      return null;
    }
    const [a, b] = parts;
    if (!a || !b) {
      return null;
    }
    return { traceIdA: a, traceIdB: b };
  }, [traceSegment]);

  const isCompareView = Boolean(compareIds);
  const singleTraceId = !isCompareView ? traceSegment : undefined;
  useCopilotReadable(
    {
      description:
        'Current Jaeger UI route context. When the user is on a single-trace view, questions refer to that trace unless they ask about other traces or global search.',
      value: singleTraceId
        ? { view: 'trace', traceId: singleTraceId }
        : isCompareView && compareIds
          ? { view: 'compare', ...compareIds }
          : { view: 'other' },
      available: traceSegment ? 'enabled' : 'disabled',
    },
    [singleTraceId, isCompareView, compareIds, traceSegment]
  );

  useCopilotAdditionalInstructions(
    {
      instructions: singleTraceId
        ? 'On this single-trace page, assume the user means that trace unless they clearly ask about another trace, search, or comparison. ' +
          'When they want to find other traces or run a search, call jaegerNavigateToSearch. ' +
          'When they want to compare two traces, call jaegerNavigateToCompare.'
        : isCompareView
          ? 'The user is comparing two traces; use the readable context for trace IDs.'
          : 'The user is not on a single-trace view; do not assume a default trace.',
      available: 'enabled',
    },
    [singleTraceId, isCompareView]
  );

  useFrontendTool({
    name: 'jaegerNavigateToSearch',
    description:
      'Navigate to the Jaeger search page. Use when the user wants to find other traces, run a search, filter by error, or leave the current trace view.',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description:
          'Optional URL query string for the search page (same as Jaeger search URL parameters), e.g. service=my-service or tags=...',
        required: false,
      },
    ],
    handler: async ({ query }) => {
      const base = getSearchUrl();
      navigate(query ? `${base}?${query}` : base);
    },
  });

  useFrontendTool({
    name: 'jaegerNavigateToCompare',
    description: 'Open the trace comparison view for two trace IDs.',
    parameters: [
      { name: 'traceIdA', type: 'string', description: 'First trace ID', required: true },
      { name: 'traceIdB', type: 'string', description: 'Second trace ID', required: true },
    ],
    handler: async ({ traceIdA, traceIdB }) => {
      navigate(getCompareUrl({ a: traceIdA, b: traceIdB, cohort: [] }));
    },
  });

  return null;
}
