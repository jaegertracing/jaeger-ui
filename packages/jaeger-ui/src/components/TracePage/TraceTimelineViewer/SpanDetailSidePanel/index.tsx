// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useMemo } from 'react';
import type { Location, NavigateFunction } from 'react-router-dom';

import SpanDetail from '../SpanDetail';
import DetailState from '../SpanDetail/DetailState';
import getLinks from '../../../../model/link-patterns';
import updateUiFind from '../../../../utils/update-ui-find';
import withRouteProps from '../../../../utils/withRouteProps';
import { IAttributes, IEvent, IOtelTrace } from '../../../../types/otel';
import { getSelectedSpanID, useTraceTimelineStore } from '../store';
import { evaluateSpanFilter } from '../../spanFilter';
import {
  trackDetailLogItemToggle,
  trackDetailLogsToggle,
  trackDetailProcessToggle,
  trackDetailTagsToggle,
} from '../store.track';

import './index.css';

type TOwnProps = {
  trace: IOtelTrace;
  currentViewRangeTime: [number, number];
  useOtelTerms: boolean;
};

type RouteProps = {
  location: Location;
  navigate: NavigateFunction;
};

type TProps = TOwnProps & RouteProps;

export function SpanDetailSidePanelImpl(props: TProps) {
  const { trace, currentViewRangeTime, useOtelTerms, location, navigate } = props;
  const detailStates = useTraceTimelineStore(s => s.detailStates);
  const spanFilter = useTraceTimelineStore(s => s.spanFilter);
  const zustandDetailLogItemToggle = useTraceTimelineStore(s => s.detailLogItemToggle);
  const zustandDetailLogsToggle = useTraceTimelineStore(s => s.detailLogsToggle);
  const zustandDetailProcessToggle = useTraceTimelineStore(s => s.detailProcessToggle);
  const detailReferencesToggle = useTraceTimelineStore(s => s.detailReferencesToggle);
  const zustandDetailTagsToggle = useTraceTimelineStore(s => s.detailTagsToggle);
  const detailWarningsToggle = useTraceTimelineStore(s => s.detailWarningsToggle);
  const focusUiFindMatches = useTraceTimelineStore(s => s.focusUiFindMatches);

  // Each tracker reads the pre-update state, so it runs before the store action.
  const detailLogItemToggle = useCallback(
    (spanID: string, logItem: IEvent) => {
      trackDetailLogItemToggle(spanID, logItem);
      zustandDetailLogItemToggle(spanID, logItem);
    },
    [zustandDetailLogItemToggle]
  );

  const detailLogsToggle = useCallback(
    (spanID: string) => {
      trackDetailLogsToggle(spanID);
      zustandDetailLogsToggle(spanID);
    },
    [zustandDetailLogsToggle]
  );

  const detailProcessToggle = useCallback(
    (spanID: string) => {
      trackDetailProcessToggle(spanID);
      zustandDetailProcessToggle(spanID);
    },
    [zustandDetailProcessToggle]
  );

  const detailTagsToggle = useCallback(
    (spanID: string) => {
      trackDetailTagsToggle(spanID);
      zustandDetailTagsToggle(spanID);
    },
    [zustandDetailTagsToggle]
  );

  const focusSpan = useCallback(
    (uiFind: string) => {
      updateUiFind({ location, navigate, uiFind });
      focusUiFindMatches(trace, uiFind, false);
    },
    [location, navigate, trace, focusUiFindMatches]
  );

  // Show the explicitly selected span, falling back to the first span the filter shows when nothing
  // is selected, which is the root span under an empty filter. A filter that hides every span leaves
  // the panel empty. When the user first interacts with an accordion in fallback mode, the reducer
  // creates a detailStates entry for that span (since detailSubsectionToggle auto-initialises). This
  // is intentional: the span then becomes explicitly selected and gains selection highlight, while
  // the panel label stays "Trace Root" because selectedSpanID === rootSpanID.
  const { hiddenIDs } = evaluateSpanFilter(trace.spans, spanFilter);
  const firstShownSpanID = useMemo(
    () => trace.spans.find(s => !hiddenIDs.has(s.spanID))?.spanID,
    [trace.spans, hiddenIDs]
  );
  const spanID = getSelectedSpanID(detailStates) ?? firstShownSpanID;
  if (!spanID) return null;

  const detailState = detailStates.get(spanID) ?? DetailState.forDetailPanelMode('sidepanel');
  const span = trace.spanMap.get(spanID);
  if (!span) return null;

  const linksGetter = (attributes: IAttributes, index: number) => getLinks(span, attributes, index, trace);

  return (
    <div className="SpanDetailSidePanel">
      <div className="SpanDetailSidePanel--body">
        <SpanDetail
          detailState={detailState}
          linksGetter={linksGetter}
          eventItemToggle={detailLogItemToggle}
          eventsToggle={detailLogsToggle}
          resourceToggle={detailProcessToggle}
          span={span}
          attributesToggle={detailTagsToggle}
          traceStartTime={trace.startTime}
          warningsToggle={detailWarningsToggle}
          linksToggle={detailReferencesToggle}
          focusSpan={focusSpan}
          currentViewRangeTime={currentViewRangeTime}
          traceDuration={trace.duration}
          useOtelTerms={useOtelTerms}
          eventsInitialVisibleCount={10}
        />
      </div>
    </div>
  );
}

export default withRouteProps(SpanDetailSidePanelImpl) as React.ComponentType<TOwnProps>;
