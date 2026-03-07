// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Location, History } from 'history';

import { actions } from '../duck';
import SpanDetail from '../SpanDetail';
import DetailState from '../SpanDetail/DetailState';
import getLinks from '../../../../model/link-patterns';
import updateUiFind from '../../../../utils/update-ui-find';
import withRouteProps from '../../../../utils/withRouteProps';
import { TNil, ReduxState } from '../../../../types';
import { IAttribute, IEvent, IOtelTrace } from '../../../../types/otel';

import './index.css';

type TOwnProps = {
  trace: IOtelTrace;
  currentViewRangeTime: [number, number];
  useOtelTerms: boolean;
};

type TReduxProps = {
  detailStates: Map<string, DetailState | TNil>;
};

type TDispatchProps = {
  detailLogItemToggle: (spanID: string, logItem: IEvent) => void;
  detailLogsToggle: (spanID: string) => void;
  detailProcessToggle: (spanID: string) => void;
  detailReferencesToggle: (spanID: string) => void;
  detailTagsToggle: (spanID: string) => void;
  detailWarningsToggle: (spanID: string) => void;
  focusUiFindMatches: (trace: IOtelTrace, uiFind: string | TNil, allowHide?: boolean) => void;
};

type RouteProps = {
  location: Location;
  history: History;
};

type TProps = TOwnProps & TReduxProps & TDispatchProps & RouteProps;

export function SpanDetailSidePanelImpl(props: TProps) {
  const {
    trace,
    currentViewRangeTime,
    useOtelTerms,
    detailStates,
    detailLogItemToggle,
    detailLogsToggle,
    detailProcessToggle,
    detailReferencesToggle,
    detailTagsToggle,
    detailWarningsToggle,
    focusUiFindMatches,
    location,
    history,
  } = props;

  const focusSpan = useCallback(
    (uiFind: string) => {
      updateUiFind({ location, history, uiFind });
      focusUiFindMatches(trace, uiFind, false);
    },
    [location, history, trace, focusUiFindMatches]
  );

  // Show the explicitly selected span, falling back to the root span when nothing is selected.
  // When the user first interacts with an accordion in fallback mode, the reducer creates a
  // detailStates entry for the root span (since detailSubsectionToggle auto-initialises). This
  // is intentional: the root span then becomes explicitly selected and gains selection highlight,
  // while the panel label stays "Trace Root" because selectedSpanID === rootSpanID.
  const spanID =
    (detailStates.size > 0 ? (detailStates.keys().next().value as string) : null) ?? trace.spans[0]?.spanID;
  if (!spanID) return null;

  const detailState = detailStates.get(spanID) ?? new DetailState();
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
        />
      </div>
    </div>
  );
}

/* istanbul ignore next */
function mapStateToProps(state: ReduxState): TReduxProps {
  const { detailStates } = state.traceTimeline;
  return { detailStates };
}

/* istanbul ignore next */
function mapDispatchToProps(dispatch: Dispatch<ReduxState>): TDispatchProps {
  const {
    detailLogItemToggle,
    detailLogsToggle,
    detailProcessToggle,
    detailReferencesToggle,
    detailTagsToggle,
    detailWarningsToggle,
    focusUiFindMatches,
  } = bindActionCreators(actions, dispatch);
  return {
    detailLogItemToggle,
    detailLogsToggle,
    detailProcessToggle,
    detailReferencesToggle,
    detailTagsToggle,
    detailWarningsToggle,
    focusUiFindMatches,
  };
}

export default connect<TReduxProps, TDispatchProps, TOwnProps, ReduxState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouteProps(SpanDetailSidePanelImpl));
