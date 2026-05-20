// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import type { UnknownAction } from 'redux';
import type { Toolkit } from '@assistant-ui/core/react';
import type { Location, NavigateFunction } from 'react-router-dom';

import { getUrl } from '../TracePage/url';
import updateUiFind from '../../utils/update-ui-find';
import filterSpans from '../../utils/filter-spans';
import { useTraceTimelineStore } from '../TracePage/TraceTimelineViewer/store.timeline';
import { actions } from '../TracePage/TraceTimelineViewer/duck';
import { store } from '../../utils/configure-store';
import { fetchedState } from '../../constants';

export interface IJaegerAssistantToolDeps {
  navigate: NavigateFunction;
  location: Location;
}

type IHighlightResult =
  | { ok: false; error: string }
  | { ok: true; traceId: string; uiFind: string; matchCount?: number; url: string };

export function createJaegerAssistantToolkit(deps: IJaegerAssistantToolDeps): Toolkit {
  return {
    highlight_span: {
      description:
        'Highlight and scroll to one or more spans in a Jaeger trace timeline. ' +
        'Use spanId for an exact match, or query for a text search across operation name, ' +
        'service name, span attributes (key=value), or span ID.',
      parameters: z.object({
        traceId: z.string().describe('Trace ID (16 or 32 hex characters).'),
        spanId: z.string().optional().describe('Exact span ID to highlight.'),
        query: z
          .string()
          .optional()
          .describe(
            'Free-text search string: operation name, service name, span ID, or key=value attribute. ' +
              'Multiple terms separated by spaces are AND-ed.'
          ),
      }),
      execute: async ({
        traceId,
        spanId,
        query,
      }: {
        traceId: string;
        spanId?: string;
        query?: string;
      }): Promise<IHighlightResult> => {
        const uiFind = (spanId ?? query ?? '').trim();
        if (!uiFind) {
          return { ok: false, error: 'Provide spanId or query to locate a span.' };
        }

        const normalizedId = traceId.trim().toLowerCase();
        const targetUrl = getUrl(normalizedId, uiFind);
        const tracePath = getUrl(normalizedId);
        const isOnTrace = deps.location.pathname === tracePath;

        // Look up the trace in the Redux store for match counting and in-place focus.
        const traceEntry = store.getState().trace?.traces?.[normalizedId];
        const trace =
          traceEntry?.state === fetchedState.DONE && traceEntry.data ? traceEntry.data.asOtelTrace() : null;

        const matchCount = trace != null ? (filterSpans(uiFind, trace.spans)?.size ?? 0) : null;

        if (matchCount !== null && matchCount === 0) {
          return {
            ok: false,
            error: `No spans match "${uiFind}" in trace ${traceId}. Try a different search term.`,
          };
        }

        if (isOnTrace && trace) {
          // Already on the right trace page — update the URL and focus in-place.
          updateUiFind({ navigate: deps.navigate, location: deps.location, uiFind });
          useTraceTimelineStore.getState().focusUiFindMatches(trace, uiFind, false);
          store.dispatch(actions.focusUiFindMatches(trace, uiFind, false) as unknown as UnknownAction);
        } else {
          // Navigate to the trace page; the uiFind query param triggers highlight on load.
          deps.navigate(targetUrl);
        }

        return {
          ok: true,
          traceId: normalizedId,
          uiFind,
          ...(matchCount != null && { matchCount }),
          url: targetUrl,
        };
      },
      render: function HighlightSpanRender({
        args,
        result,
      }: {
        args: { traceId?: string; spanId?: string; query?: string };
        result?: IHighlightResult;
      }) {
        if (!result) {
          const target = args.spanId ?? args.query ?? 'span';
          return (
            <div className="JaegerAssistantPanel-toolCall">
              <span className="JaegerAssistantPanel-toolCall-spinner" aria-hidden="true" />
              Locating {target}&hellip;
            </div>
          );
        }
        if (!result.ok) {
          return (
            <div className="JaegerAssistantPanel-toolCall JaegerAssistantPanel-toolCall--error">
              {result.error}
            </div>
          );
        }
        const label =
          result.matchCount != null
            ? `Highlighted ${result.matchCount} span${result.matchCount !== 1 ? 's' : ''}`
            : 'Navigated to trace';
        return <div className="JaegerAssistantPanel-toolCall JaegerAssistantPanel-toolCall--ok">{label}</div>;
      },
    },
  };
}
