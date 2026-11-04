// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback } from 'react';
import type { Location, NavigateFunction } from 'react-router-dom';

import { getSelectedSpanID } from '../duck';
import SpanDetail from '../SpanDetail';
import DetailState from '../SpanDetail/DetailState';
import getLinks from '../../../../model/link-patterns';
import updateUiFind from '../../../../utils/update-ui-find';
import withRouteProps from '../../../../utils/withRouteProps';
import { IAttributes, IEvent, IOtelTrace } from '../../../../types/otel';
import { useTraceTimelineStore } from '../store';
import { focusedSpanIDs } from '../timeline-utils';
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
      const { focusedSubtreeSpanID, setFocusedSubtreeSpanID } = useTraceTimelineStore.getState();
      if (focusedSubtreeSpanID && trace) {
        const subtreeIDs = focusedSpanIDs(trace, focusedSubtreeSpanID);
        if (subtreeIDs && !subtreeIDs.has(uiFind)) {
          setFocusedSubtreeSpanID(null);
        }
      }
      updateUiFind({ location, navigate, uiFind });
      focusUiFindMatches(trace, uiFind, false);
    },
    [location, navigate, trace, focusUiFindMatches]
  );

  // Show the explicitly selected span, falling back to the root span when nothing is selected.
  // When the user first interacts with an accordion in fallback mode, the reducer creates a
  // detailStates entry for the root span (since detailSubsectionToggle auto-initialises). This
  // is intentional: the root span then becomes explicitly selected and gains selection highlight,
  // while the panel label stays "Trace Root" because selectedSpanID === rootSpanID.
  const spanID = getSelectedSpanID(detailStates) ?? trace.rootSpans?.[0]?.spanID;
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
