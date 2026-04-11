// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { Location, NavigateFunction } from 'react-router-dom';

import { actions, getSelectedSpanID } from '../duck';
import SpanDetail from '../SpanDetail';
import DetailState from '../SpanDetail/DetailState';
import getLinks from '../../../../model/link-patterns';
import updateUiFind from '../../../../utils/update-ui-find';
import withRouteProps from '../../../../utils/withRouteProps';
import { TNil } from '../../../../types';
import { IAttribute, IEvent, IOtelTrace } from '../../../../types/otel';
import { useTraceTimelineStore } from '../../../../stores/trace-timeline-store';

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
  const dispatch = useDispatch<any>();
  const detailStates = useTraceTimelineStore(s => s.detailStates);
  const zustandDetailLogItemToggle = useTraceTimelineStore(s => s.detailLogItemToggle);
  const zustandDetailLogsToggle = useTraceTimelineStore(s => s.detailLogsToggle);
  const zustandDetailProcessToggle = useTraceTimelineStore(s => s.detailProcessToggle);
  const zustandDetailReferencesToggle = useTraceTimelineStore(s => s.detailReferencesToggle);
  const zustandDetailTagsToggle = useTraceTimelineStore(s => s.detailTagsToggle);
  const zustandDetailWarningsToggle = useTraceTimelineStore(s => s.detailWarningsToggle);
  const zustandFocusUiFindMatches = useTraceTimelineStore(s => s.focusUiFindMatches);

  // dual-write handlers (Redux first for tracking middleware, Zustand second)
  const detailLogItemToggle = useCallback(
    (spanID: string, logItem: IEvent) => {
      dispatch(actions.detailLogItemToggle(spanID, logItem));
      zustandDetailLogItemToggle(spanID, logItem);
    },
    [dispatch, zustandDetailLogItemToggle]
  );

  const detailLogsToggle = useCallback(
    (spanID: string) => {
      dispatch(actions.detailLogsToggle(spanID));
      zustandDetailLogsToggle(spanID);
    },
    [dispatch, zustandDetailLogsToggle]
  );

  const detailProcessToggle = useCallback(
    (spanID: string) => {
      dispatch(actions.detailProcessToggle(spanID));
      zustandDetailProcessToggle(spanID);
    },
    [dispatch, zustandDetailProcessToggle]
  );

  const detailReferencesToggle = useCallback(
    (spanID: string) => {
      dispatch(actions.detailReferencesToggle(spanID));
      zustandDetailReferencesToggle(spanID);
    },
    [dispatch, zustandDetailReferencesToggle]
  );

  const detailTagsToggle = useCallback(
    (spanID: string) => {
      dispatch(actions.detailTagsToggle(spanID));
      zustandDetailTagsToggle(spanID);
    },
    [dispatch, zustandDetailTagsToggle]
  );

  const detailWarningsToggle = useCallback(
    (spanID: string) => {
      dispatch(actions.detailWarningsToggle(spanID));
      zustandDetailWarningsToggle(spanID);
    },
    [dispatch, zustandDetailWarningsToggle]
  );

  const focusUiFindMatches = useCallback(
    (t: IOtelTrace, uiFind: string | TNil, allowHide?: boolean) => {
      dispatch(actions.focusUiFindMatches(t, uiFind, allowHide));
      zustandFocusUiFindMatches(t, uiFind, allowHide);
    },
    [dispatch, zustandFocusUiFindMatches]
  );

  const focusSpan = useCallback(
    (uiFind: string) => {
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

  const linksGetter = (attributes: ReadonlyArray<IAttribute>, index: number) =>
    getLinks(span, attributes, index, trace);

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
