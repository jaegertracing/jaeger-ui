// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type { Location, NavigateFunction } from 'react-router-dom';

import { actions, getSelectedSpanID } from '../duck';
import GenAISpanDetail from './GenAISpanDetail';
import { detectGenAISpan } from '../../../../utils/gen-ai';
import { useLayoutPrefsStore } from '../store';
import SpanDetail from '../SpanDetail';
import DetailState from '../SpanDetail/DetailState';
import getLinks from '../../../../model/link-patterns';
import updateUiFind from '../../../../utils/update-ui-find';
import withRouteProps from '../../../../utils/withRouteProps';
import { TNil } from '../../../../types';
import { IAttribute, IEvent, IOtelTrace } from '../../../../types/otel';
import { useTraceTimelineStore } from '../store';

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

  const genAIModeActive = useLayoutPrefsStore(s => s.genAIModeActive);
  const autoDetectedGenAI = useLayoutPrefsStore(s => s.autoDetectedGenAI);

  // Fall back to root span until the user explicitly selects one.
  const spanID = getSelectedSpanID(detailStates) ?? trace.rootSpans?.[0]?.spanID;
  const span = spanID ? trace.spanMap.get(spanID) : undefined;
  const genAIKind = useMemo(() => (span ? detectGenAISpan(span) : null), [span]);

  if (!spanID) return null;

  const detailState = detailStates.get(spanID) ?? DetailState.forDetailPanelMode('sidepanel');
  if (!span) return null;

  const linksGetter = (attributes: ReadonlyArray<IAttribute>, index: number) =>
    getLinks(span, attributes, index, trace);

  if (genAIModeActive && autoDetectedGenAI && genAIKind != null) {
    return (
      <div className="SpanDetailSidePanel">
        <div className="SpanDetailSidePanel--body">
          <GenAISpanDetail span={span} kind={genAIKind} />
        </div>
      </div>
    );
  }

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
