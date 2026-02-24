// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import cx from 'classnames';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import _isEqual from 'lodash/isEqual';
import _groupBy from 'lodash/groupBy';

import memoizeOne from 'memoize-one';
import { Location } from 'history';

import { actions } from './duck';
import ListView from './ListView';
import SpanBarRow from './SpanBarRow';
import DetailState from './SpanDetail/DetailState';
import SpanDetailRow from './SpanDetailRow';
import {
  createViewedBoundsFunc,
  ViewedBoundsFunctionType,
  findServerChildSpan,
  isErrorSpan,
  isKindClient,
  isKindProducer,
  spanContainsErredSpan,
} from './utils';
import { Accessors } from '../ScrollManager';
import { extractUiFindFromState, TExtractUiFindFromStateReturn } from '../../common/UiFindInput';
import getLinks from '../../../model/link-patterns';
import colorGenerator from '../../../utils/color-generator';
import { TNil, ReduxState } from '../../../types';
import { CriticalPathSection } from '../../../types/critical_path';
import { IOtelSpan, IOtelTrace, IAttribute, IEvent } from '../../../types/otel';
import TTraceTimeline from '../../../types/TTraceTimeline';

import './VirtualizedTraceView.css';
import updateUiFind from '../../../utils/update-ui-find';
import { PEER_SERVICE } from '../../../constants/tag-keys';
import withRouteProps from '../../../utils/withRouteProps';
import { useNavigate } from 'react-router-dom-v5-compat';

type RowState = {
  isDetail: boolean;
  span: IOtelSpan;
  spanIndex: number;
};

type TVirtualizedTraceViewOwnProps = {
  currentViewRangeTime: [number, number];
  findMatchesIDs: Set<string> | TNil;
  scrollToFirstVisibleSpan: () => void;
  registerAccessors: (accesors: Accessors) => void;
  trace: IOtelTrace;
  criticalPath: CriticalPathSection[];
  useOtelTerms: boolean;
};

type TDispatchProps = {
  childrenToggle: (spanID: string) => void;
  clearShouldScrollToFirstUiFindMatch: () => void;
  detailLogItemToggle: (spanID: string, log: IEvent) => void;
  detailLogsToggle: (spanID: string) => void;
  detailWarningsToggle: (spanID: string) => void;
  detailReferencesToggle: (spanID: string) => void;
  detailProcessToggle: (spanID: string) => void;
  detailTagsToggle: (spanID: string) => void;
  detailToggle: (spanID: string) => void;
  setSpanNameColumnWidth: (width: number) => void;
  setTrace: (trace: IOtelTrace | TNil, uiFind: string | TNil) => void;
  focusUiFindMatches: (trace: IOtelTrace, uiFind: string | TNil, allowHide?: boolean) => void;
};

type RouteProps = {
  location: Location;
};

type VirtualizedTraceViewProps = TVirtualizedTraceViewOwnProps &
  TDispatchProps &
  TExtractUiFindFromStateReturn &
  TTraceTimeline &
  RouteProps;

// export for tests
export const DEFAULT_HEIGHTS = {
  bar: 28,
  detail: 161,
  detailWithLogs: 197,
};

const NUM_TICKS = 5;

function generateRowStates(
  spans: ReadonlyArray<IOtelSpan> | TNil,
  childrenHiddenIDs: Set<string>,
  detailStates: Map<string, DetailState | TNil>
): RowState[] {
  if (!spans) {
    return [];
  }
  let collapseDepth = null;
  const rowStates = [];
  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    const { spanID, depth } = span;
    let hidden = false;
    if (collapseDepth != null) {
      if (depth >= collapseDepth) {
        hidden = true;
      } else {
        collapseDepth = null;
      }
    }
    if (hidden) {
      continue;
    }
    if (childrenHiddenIDs.has(spanID)) {
      collapseDepth = depth + 1;
    }
    rowStates.push({
      span,
      isDetail: false,
      spanIndex: i,
    });
    if (detailStates.has(spanID)) {
      rowStates.push({
        span,
        isDetail: true,
        spanIndex: i,
      });
    }
  }
  return rowStates;
}

function generateRowStatesFromTrace(
  trace: IOtelTrace | TNil,
  childrenHiddenIDs: Set<string>,
  detailStates: Map<string, DetailState | TNil>
): RowState[] {
  if (!trace) {
    return [];
  }
  return generateRowStates(trace.spans, childrenHiddenIDs, detailStates);
}

function getCssClasses(currentViewRange: [number, number]) {
  const [zoomStart, zoomEnd] = currentViewRange;
  return cx({
    'clipping-left': zoomStart > 0,
    'clipping-right': zoomEnd < 1,
  });
}

function mergeChildrenCriticalPath(
  trace: IOtelTrace,
  spanID: string,
  criticalPath: CriticalPathSection[]
): CriticalPathSection[] {
  if (!criticalPath) {
    return [];
  }
  // Define an array to store the IDs of the span and its descendants (if the span is collapsed)
  const allRequiredSpanIds = new Set<string>([spanID]);

  // Use pre-built spanMap
  const spanMap = trace.spanMap;

  // If the span is collapsed, recursively find all of its descendants.
  const findAllDescendants = (span: IOtelSpan) => {
    if (span.hasChildren && span.childSpans.length > 0) {
      span.childSpans.forEach(child => {
        allRequiredSpanIds.add(child.spanID);
        findAllDescendants(child);
      });
    }
  };

  // Start from the initially selected span
  const startingSpan = spanMap.get(spanID);
  if (startingSpan) {
    findAllDescendants(startingSpan);
  }

  const criticalPathSections: CriticalPathSection[] = [];
  criticalPath.forEach(each => {
    if (allRequiredSpanIds.has(each.spanID)) {
      if (criticalPathSections.length !== 0 && each.sectionEnd === criticalPathSections[0].sectionStart) {
        // Merge Critical Paths if they are consecutive
        criticalPathSections[0].sectionStart = each.sectionStart;
      } else {
        criticalPathSections.unshift({ ...each });
      }
    }
  });

  return criticalPathSections;
}

const memoizedGenerateRowStates = memoizeOne(generateRowStatesFromTrace);
const memoizedViewBoundsFunc = memoizeOne(createViewedBoundsFunc, _isEqual);
const memoizedGetCssClasses = memoizeOne(getCssClasses, _isEqual);
const memoizedCriticalPathsBySpanID = memoizeOne((criticalPath: CriticalPathSection[]) =>
  _groupBy(criticalPath, x => x.spanID)
);

// export from tests

export const VirtualizedTraceViewImpl: React.FC<VirtualizedTraceViewProps> = props => {
  const {
    setTrace,
    trace,
    uiFind,
    registerAccessors,
    shouldScrollToFirstUiFindMatch,
    clearShouldScrollToFirstUiFindMatch,
    scrollToFirstVisibleSpan,
    focusUiFindMatches,
    location,
    currentViewRangeTime,
    childrenHiddenIDs,
    childrenToggle,
    detailStates,
    detailToggle,
    findMatchesIDs,
    spanNameColumnWidth,
    criticalPath,
    useOtelTerms,
  } = props;

  const listViewRef = React.useRef<ListView | null>(null);

  React.useEffect(() => {
    setTrace(trace, uiFind);
  }, [setTrace, trace, uiFind]);

  React.useEffect(() => {
    if (shouldScrollToFirstUiFindMatch) {
      scrollToFirstVisibleSpan();
      clearShouldScrollToFirstUiFindMatch();
    }
  }, [shouldScrollToFirstUiFindMatch, scrollToFirstVisibleSpan, clearShouldScrollToFirstUiFindMatch]);

  const handleListResize = React.useCallback(() => {
    if (listViewRef.current) {
      listViewRef.current.forceUpdate();
    }
  }, []);

  const handleDetailMeasure = React.useCallback(
    (evt: { detail?: { spanID?: string } }) => {
      const spanID = evt?.detail?.spanID;

      if (!listViewRef.current || !spanID) {
        handleListResize();
        return;
      }

      listViewRef.current.forceUpdate();
    },
    [handleListResize]
  );

  React.useEffect(() => {
    window.addEventListener('jaeger:list-resize', handleListResize);
    window.addEventListener('jaeger:detail-measure', handleDetailMeasure as any);

    return () => {
      window.removeEventListener('jaeger:list-resize', handleListResize);
      window.removeEventListener('jaeger:detail-measure', handleDetailMeasure as any);
    };
  }, [handleListResize, handleDetailMeasure]);

  const getRowStates = React.useCallback((): RowState[] => {
    return memoizedGenerateRowStates(props.trace, props.childrenHiddenIDs, props.detailStates);
  }, [props.childrenHiddenIDs, props.detailStates, props.trace]);

  const getRowHeight = React.useCallback(
    (index: number) => {
      const { span, isDetail } = getRowStates()[index];

      if (!isDetail) {
        return DEFAULT_HEIGHTS.bar;
      }

      if (Array.isArray(span.events) && span.events.length) {
        return DEFAULT_HEIGHTS.detailWithLogs;
      }

      return DEFAULT_HEIGHTS.detail;
    },
    [getRowStates]
  );

  const linksGetter = React.useCallback(
    (span: IOtelSpan, items: ReadonlyArray<IAttribute>, itemIndex: number) => {
      if (!props.trace) return [];
      return getLinks(span, items, itemIndex, props.trace);
    },
    [props.trace]
  );

  const linksGetterFromAttributes = React.useCallback(
    (span: IOtelSpan) => (attributes: ReadonlyArray<IAttribute>, index: number) => {
      return linksGetter(span, attributes, index);
    },
    [linksGetter]
  );

  const eventItemToggleAdapter = React.useCallback(
    (detailLogItemToggle: (spanID: string, log: IEvent) => void) => (spanID: string, event: IEvent) => {
      detailLogItemToggle(spanID, event);
    },
    []
  );

  const navigate = useNavigate();

  const focusSpan = React.useCallback(
    (uiFind: string) => {
      if (trace) {
        updateUiFind({
          location,
          navigate,
          uiFind,
        });
        focusUiFindMatches(trace, uiFind, false);
      }
    },
    [trace, focusUiFindMatches, location, navigate]
  );

  const getCriticalPathSections = React.useCallback(
    (isCollapsed: boolean, trace: IOtelTrace, spanID: string, criticalPath: CriticalPathSection[]) => {
      if (isCollapsed) {
        return mergeChildrenCriticalPath(trace, spanID, criticalPath);
      }

      const pathBySpanID = memoizedCriticalPathsBySpanID(criticalPath);
      return spanID in pathBySpanID ? pathBySpanID[spanID] : [];
    },
    []
  );

  const getViewedBounds = React.useCallback((): ViewedBoundsFunctionType => {
    if (!trace) {
      return () => ({ start: 0, end: 0 });
    }

    const [zoomStart, zoomEnd] = currentViewRangeTime;

    return memoizedViewBoundsFunc({
      min: trace.startTime,
      max: trace.endTime,
      viewStart: zoomStart,
      viewEnd: zoomEnd,
    });
  }, [currentViewRangeTime, trace]);

  const getClippingCssClasses = React.useCallback((): string => {
    return memoizedGetCssClasses(currentViewRangeTime);
  }, [currentViewRangeTime]);

  const renderSpanDetailRow = React.useCallback(
    (span: IOtelSpan, key: string, style: React.CSSProperties, attrs: object) => {
      const { spanID } = span;
      const { serviceName } = span.resource;

      const detailState = props.detailStates.get(spanID);
      if (!props.trace || !detailState) {
        return null;
      }

      const color = colorGenerator.getColorByKey(serviceName);

      return (
        <div className="VirtualizedTraceView--row" key={key} style={{ ...style, zIndex: 1 }} {...attrs}>
          <SpanDetailRow
            color={color}
            columnDivision={props.spanNameColumnWidth}
            onDetailToggled={props.detailToggle}
            detailState={detailState}
            linksGetter={linksGetterFromAttributes(span)}
            eventItemToggle={eventItemToggleAdapter(props.detailLogItemToggle)}
            eventsToggle={props.detailLogsToggle}
            resourceToggle={props.detailProcessToggle}
            linksToggle={props.detailReferencesToggle}
            warningsToggle={props.detailWarningsToggle}
            span={span}
            attributesToggle={props.detailTagsToggle}
            traceStartTime={props.trace.startTime}
            focusSpan={focusSpan}
            currentViewRangeTime={props.currentViewRangeTime}
            traceDuration={props.trace.duration}
            useOtelTerms={props.useOtelTerms}
          />
        </div>
      );
    },
    [
      props.detailLogItemToggle,
      props.detailLogsToggle,
      props.detailProcessToggle,
      props.detailReferencesToggle,
      props.detailWarningsToggle,
      props.detailStates,
      props.detailTagsToggle,
      props.detailToggle,
      props.spanNameColumnWidth,
      props.trace,
      props.currentViewRangeTime,
      props.useOtelTerms,
      linksGetterFromAttributes,
      eventItemToggleAdapter,
      focusSpan,
    ]
  );

  const renderSpanBarRow = React.useCallback(
    (span: IOtelSpan, spanIndex: number, key: string, style: React.CSSProperties, attrs: object) => {
      const { spanID } = span;
      const { serviceName } = span.resource;

      if (!trace) {
        return null;
      }

      const { spans } = trace;

      const color = colorGenerator.getColorByKey(serviceName);
      const isCollapsed = childrenHiddenIDs.has(spanID);
      const isDetailExpanded = detailStates.has(spanID);
      const isMatchingFilter = findMatchesIDs ? findMatchesIDs.has(spanID) : false;
      const hasOwnError = isErrorSpan(span);
      const hasChildError = isCollapsed && spanContainsErredSpan(spans, spanIndex);

      const criticalPathSections = getCriticalPathSections(isCollapsed, trace, spanID, criticalPath);

      let rpc = null;

      if (isCollapsed) {
        const rpcSpan = findServerChildSpan(spans.slice(spanIndex));
        if (rpcSpan) {
          const rpcViewBounds = getViewedBounds()(rpcSpan.startTime, rpcSpan.endTime);

          rpc = {
            color: colorGenerator.getColorByKey(rpcSpan.resource.serviceName),
            operationName: rpcSpan.name,
            serviceName: rpcSpan.resource.serviceName,
            viewEnd: rpcViewBounds.end,
            viewStart: rpcViewBounds.start,
          };
        }
      }

      const peerServiceAttr = span.attributes.find(attr => attr.key === PEER_SERVICE);

      let noInstrumentedServer = null;

      if (!span.hasChildren && peerServiceAttr && (isKindClient(span) || isKindProducer(span))) {
        noInstrumentedServer = {
          serviceName: String(peerServiceAttr.value),
          color: colorGenerator.getColorByKey(String(peerServiceAttr.value)),
        };
      }

      return (
        <div className="VirtualizedTraceView--row" key={key} style={style} {...attrs}>
          <SpanBarRow
            className={getClippingCssClasses()}
            color={color}
            criticalPath={criticalPathSections}
            columnDivision={spanNameColumnWidth}
            isChildrenExpanded={!isCollapsed}
            isDetailExpanded={isDetailExpanded}
            isMatchingFilter={isMatchingFilter}
            numTicks={NUM_TICKS}
            onDetailToggled={detailToggle}
            onChildrenToggled={childrenToggle}
            rpc={rpc}
            noInstrumentedServer={noInstrumentedServer}
            hasOwnError={hasOwnError}
            hasChildError={hasChildError}
            getViewedBounds={getViewedBounds()}
            traceStartTime={trace.startTime}
            span={span}
            focusSpan={focusSpan}
            traceDuration={trace.duration}
            useOtelTerms={useOtelTerms}
          />
        </div>
      );
    },
    [
      childrenHiddenIDs,
      childrenToggle,
      detailStates,
      detailToggle,
      findMatchesIDs,
      spanNameColumnWidth,
      trace,
      criticalPath,
      useOtelTerms,
      getCriticalPathSections,
      getViewedBounds,
      getClippingCssClasses,
      focusSpan,
    ]
  );

  const renderRow = React.useCallback(
    (key: string, style: React.CSSProperties, index: number, attrs: object) => {
      const { isDetail, span, spanIndex } = getRowStates()[index];

      return isDetail
        ? renderSpanDetailRow(span, key, style, attrs)
        : renderSpanBarRow(span, spanIndex, key, style, attrs);
    },
    [getRowStates, renderSpanDetailRow, renderSpanBarRow]
  );

  const getKeyFromIndex = React.useCallback(
    (index: number) => {
      const { isDetail, span } = getRowStates()[index];
      return `${span.spanID}--${isDetail ? 'detail' : 'bar'}`;
    },
    [getRowStates]
  );

  const getIndexFromKey = React.useCallback(
    (key: string) => {
      const parts = key.split('--');
      const _spanID = parts[0];
      const _isDetail = parts[1] === 'detail';
      const rowStates = getRowStates();
      const max = rowStates.length;
      for (let i = 0; i < max; i++) {
        const { span, isDetail } = rowStates[i];
        if (span.spanID === _spanID && isDetail === _isDetail) {
          return i;
        }
      }
      return -1;
    },
    [getRowStates]
  );

  const mapRowIndexToSpanIndex = React.useCallback(
    (index: number) => getRowStates()[index].spanIndex,
    [getRowStates]
  );

  const mapSpanIndexToRowIndex = React.useCallback(
    (index: number) => {
      const rowStates = getRowStates();
      const max = rowStates.length;
      for (let i = 0; i < max; i++) {
        const { spanIndex } = rowStates[i];
        if (spanIndex === index) {
          return i;
        }
      }
      throw new Error(`unable to find row for span index: ${index}`);
    },
    [getRowStates]
  );

  const getViewRange = React.useCallback(() => props.currentViewRangeTime, [props.currentViewRangeTime]);

  const getSearchedSpanIDs = React.useCallback(() => props.findMatchesIDs, [props.findMatchesIDs]);

  const getCollapsedChildren = React.useCallback(() => props.childrenHiddenIDs, [props.childrenHiddenIDs]);

  const getAccessors = React.useCallback(() => {
    const lv = listViewRef.current;
    if (!lv) {
      throw new Error('ListView unavailable');
    }
    return {
      getViewRange,
      getSearchedSpanIDs,
      getCollapsedChildren,
      getViewHeight: lv.getViewHeight,
      getBottomRowIndexVisible: lv.getBottomVisibleIndex,
      getTopRowIndexVisible: lv.getTopVisibleIndex,
      getRowPosition: lv.getRowPosition,
      mapRowIndexToSpanIndex,
      mapSpanIndexToRowIndex,
    };
  }, [
    getViewRange,
    getSearchedSpanIDs,
    getCollapsedChildren,
    mapRowIndexToSpanIndex,
    mapSpanIndexToRowIndex,
  ]);

  React.useEffect(() => {
    if (listViewRef.current && registerAccessors) {
      registerAccessors(getAccessors());
    }
  }, [registerAccessors, getAccessors]);

  return (
    <div className="VirtualizedTraceView--spans">
      <ListView
        ref={listViewRef}
        dataLength={getRowStates().length}
        itemHeightGetter={getRowHeight}
        itemRenderer={renderRow}
        viewBuffer={300}
        viewBufferMin={100}
        itemsWrapperClassName="VirtualizedTraceView--rowsWrapper"
        getKeyFromIndex={getKeyFromIndex}
        getIndexFromKey={getIndexFromKey}
        windowScroller
      />
    </div>
  );
};

/* istanbul ignore next */
function mapStateToProps(state: ReduxState): TTraceTimeline & TExtractUiFindFromStateReturn {
  return {
    ...extractUiFindFromState(state),
    ...state.traceTimeline,
  };
}
export const testableHelpers = {
  generateRowStates,
  generateRowStatesFromTrace,
  getCssClasses,
  mergeChildrenCriticalPath,
  createFocusSpan:
    (
      trace: IOtelTrace | TNil,
      focusUiFindMatches: (trace: IOtelTrace, uiFind: string | TNil, allowHide?: boolean) => void,
      location: Location,
      navigate: ReturnType<typeof useNavigate>
    ) =>
    (uiFind: string) => {
      if (trace) {
        updateUiFind({ location, navigate, uiFind });
        focusUiFindMatches(trace, uiFind, false);
      }
    },
};

/* istanbul ignore next */
function mapDispatchToProps(dispatch: Dispatch<ReduxState>): TDispatchProps {
  return bindActionCreators(actions, dispatch) as any as TDispatchProps;
}

export default connect<
  TTraceTimeline & TExtractUiFindFromStateReturn,
  TDispatchProps,
  TVirtualizedTraceViewOwnProps,
  ReduxState
>(
  mapStateToProps,
  mapDispatchToProps
)(withRouteProps(VirtualizedTraceViewImpl));
