// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useRef, useEffect, useCallback, useMemo } from 'react';
import cx from 'classnames';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import _isEqual from 'lodash/isEqual';
import _groupBy from 'lodash/groupBy';

// import { History as RouterHistory, Location } from 'history';

import memoizeOne from 'memoize-one';
import { Location, History } from 'history';
import { actions } from './duck';
import ListView from './ListView';
import SpanBarRow from './SpanBarRow';
import DetailState from './SpanDetail/DetailState';
import SpanDetailRow from './SpanDetailRow';
import {
  createViewedBoundsFunc,
  findServerChildSpan,
  isErrorSpan,
  isKindClient,
  isKindProducer,
  spanContainsErredSpan,
  ViewedBoundsFunctionType,
} from './utils';
import { Accessors } from '../ScrollManager';
import { extractUiFindFromState, TExtractUiFindFromStateReturn } from '../../common/UiFindInput';
import getLinks from '../../../model/link-patterns';
import colorGenerator from '../../../utils/color-generator';
import { TNil, ReduxState } from '../../../types';
import { Log, Span, Trace, KeyValuePair, criticalPathSection } from '../../../types/trace';
import TTraceTimeline from '../../../types/TTraceTimeline';

import './VirtualizedTraceView.css';
import updateUiFind from '../../../utils/update-ui-find';
import { PEER_SERVICE } from '../../../constants/tag-keys';
import withRouteProps from '../../../utils/withRouteProps';

type RowState = {
  isDetail: boolean;
  span: Span;
  spanIndex: number;
};

type TVirtualizedTraceViewOwnProps = {
  currentViewRangeTime: [number, number];
  findMatchesIDs: Set<string> | TNil;
  scrollToFirstVisibleSpan: () => void;
  registerAccessors: (accesors: Accessors) => void;
  trace: Trace;
  criticalPath: criticalPathSection[];
};

type TDispatchProps = {
  childrenToggle: (spanID: string) => void;
  clearShouldScrollToFirstUiFindMatch: () => void;
  detailLogItemToggle: (spanID: string, log: Log) => void;
  detailLogsToggle: (spanID: string) => void;
  detailWarningsToggle: (spanID: string) => void;
  detailReferencesToggle: (spanID: string) => void;
  detailProcessToggle: (spanID: string) => void;
  detailTagsToggle: (spanID: string) => void;
  detailToggle: (spanID: string) => void;
  setSpanNameColumnWidth: (width: number) => void;
  setTrace: (trace: Trace | TNil, uiFind: string | TNil) => void;
  focusUiFindMatches: (trace: Trace, uiFind: string | TNil, allowHide?: boolean) => void;
};

type RouteProps = {
  location: Location;
  history: History;
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
  spans: Span[] | TNil,
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

// export for tests
export const testableHelpers = {
  generateRowStatesFromTrace: (
    trace: Trace | TNil,
    childrenHiddenIDs: Set<string>,
    detailStates: Map<string, DetailState | TNil>
  ): RowState[] => {
    return trace ? generateRowStates(trace.spans, childrenHiddenIDs, detailStates) : [];
  },

  mapRowIndexToSpanIndex: (rowStates: RowState[], index: number) => rowStates[index].spanIndex,

  mapSpanIndexToRowIndex: (rowStates: RowState[], index: number) => {
    const max = rowStates.length;
    for (let i = 0; i < max; i++) {
      const { spanIndex } = rowStates[i];
      if (spanIndex === index) {
        return i;
      }
    }
    throw new Error(`unable to find row for span index: ${index}`);
  },

  getKeyFromIndex: (rowStates: RowState[], index: number) => {
    const { isDetail, span } = rowStates[index];
    return `${span.spanID}--${isDetail ? 'detail' : 'bar'}`;
  },

  getIndexFromKey: (rowStates: RowState[], key: string) => {
    const parts = key.split('--');
    const _spanID = parts[0];
    const _isDetail = parts[1] === 'detail';
    const max = rowStates.length;
    for (let i = 0; i < max; i++) {
      const { span, isDetail } = rowStates[i];
      if (span.spanID === _spanID && isDetail === _isDetail) {
        return i;
      }
    }
    return -1;
  },

  getRowHeight: (rowStates: RowState[], index: number) => {
    const { span, isDetail } = rowStates[index];
    if (!isDetail) {
      return DEFAULT_HEIGHTS.bar;
    }
    if (Array.isArray(span.logs) && span.logs.length) {
      return DEFAULT_HEIGHTS.detailWithLogs;
    }
    return DEFAULT_HEIGHTS.detail;
  },
};

function getCssClasses(currentViewRange: [number, number]) {
  const [zoomStart, zoomEnd] = currentViewRange;
  return cx({
    'clipping-left': zoomStart > 0,
    'clipping-right': zoomEnd < 1,
  });
}

const memoizedSpanByID = memoizeOne((spans: Span[]) => new Map(spans.map(x => [x.spanID, x])));

function mergeChildrenCriticalPath(
  trace: Trace,
  spanID: string,
  criticalPath: criticalPathSection[]
): criticalPathSection[] {
  if (!criticalPath) {
    return [];
  }
  // Define an array to store the IDs of the span and its descendants (if the span is collapsed)
  const allRequiredSpanIds = new Set<string>([spanID]);

  // If the span is collapsed, recursively find all of its descendants.
  const findAllDescendants = (currentChildSpanIds: Set<string>) => {
    currentChildSpanIds.forEach(eachId => {
      const currentChildSpan = memoizedSpanByID(trace.spans).get(eachId)!;
      if (currentChildSpan.hasChildren) {
        currentChildSpan.childSpanIds.forEach(x => allRequiredSpanIds.add(x));
        findAllDescendants(new Set<string>(currentChildSpan.childSpanIds));
      }
    });
  };
  findAllDescendants(allRequiredSpanIds);

  const criticalPathSections: criticalPathSection[] = [];
  criticalPath.forEach(each => {
    if (allRequiredSpanIds.has(each.spanId)) {
      if (criticalPathSections.length !== 0 && each.section_end === criticalPathSections[0].section_start) {
        // Merge Critical Paths if they are consecutive
        criticalPathSections[0].section_start = each.section_start;
      } else {
        criticalPathSections.unshift({ ...each });
      }
    }
  });

  return criticalPathSections;
}

const memoizedGenerateRowStates = memoizeOne(testableHelpers.generateRowStatesFromTrace);
const memoizedViewBoundsFunc = memoizeOne(createViewedBoundsFunc, _isEqual);
const memoizedGetCssClasses = memoizeOne(getCssClasses, _isEqual);
const memoizedCriticalPathsBySpanID = memoizeOne((criticalPath: criticalPathSection[]) =>
  _groupBy(criticalPath, x => x.spanId)
);

// export from tests
export const VirtualizedTraceViewImpl: React.FC<VirtualizedTraceViewProps> = props => {
  const {
    childrenHiddenIDs,
    clearShouldScrollToFirstUiFindMatch,
    currentViewRangeTime,
    detailStates,
    findMatchesIDs,
    focusUiFindMatches,
    history,
    location,
    registerAccessors,
    scrollToFirstVisibleSpan,
    setTrace,
    shouldScrollToFirstUiFindMatch,
    trace,
    uiFind,
  } = props;

  const listViewRef = useRef<ListView | null>(null);

  useEffect(() => {
    setTrace(trace, uiFind);
  }, []);

  const handleListResize = useCallback(() => {
    if (listViewRef.current) {
      listViewRef.current.forceUpdate();
    }
  }, []);

  const handleDetailMeasure = useCallback(
    (evt: { detail?: { spanID?: string } }) => {
      const spanID = evt && evt.detail && evt.detail.spanID;
      if (!listViewRef.current || !spanID) {
        handleListResize();
        return;
      }
      // Force the list to re-scan heights
      listViewRef.current.forceUpdate();
    },
    [handleListResize]
  );

  useEffect(() => {
    window.addEventListener('jaeger:list-resize', handleListResize);
    window.addEventListener('jaeger:detail-measure', handleDetailMeasure as any);

    return () => {
      window.removeEventListener('jaeger:list-resize', handleListResize);
      window.removeEventListener('jaeger:detail-measure', handleDetailMeasure as any);
    };
  }, [handleListResize, handleDetailMeasure]);

  useEffect(() => {
    setTrace(trace, uiFind);
  }, [trace, uiFind, setTrace]);

  useEffect(() => {
    if (shouldScrollToFirstUiFindMatch) {
      scrollToFirstVisibleSpan();
      clearShouldScrollToFirstUiFindMatch();
    }
  }, [shouldScrollToFirstUiFindMatch, scrollToFirstVisibleSpan, clearShouldScrollToFirstUiFindMatch]);

  const getRowStates = useCallback((): RowState[] => {
    return memoizedGenerateRowStates(trace, childrenHiddenIDs, detailStates);
  }, [trace, childrenHiddenIDs, detailStates]);

  const rowStates = useMemo(() => getRowStates(), [getRowStates]);

  const getClippingCssClasses = useCallback((): string => {
    return memoizedGetCssClasses(currentViewRangeTime);
  }, [currentViewRangeTime]);

  const getViewedBounds = useCallback((): ViewedBoundsFunctionType => {
    const [zoomStart, zoomEnd] = currentViewRangeTime;

    return memoizedViewBoundsFunc({
      min: trace.startTime,
      max: trace.endTime,
      viewStart: zoomStart,
      viewEnd: zoomEnd,
    });
  }, [currentViewRangeTime, trace]);

  const focusSpan = useCallback(
    (uiFind: string) => {
      if (trace) {
        updateUiFind({
          location,
          history,
          uiFind,
        });
        focusUiFindMatches(trace, uiFind, false);
      }
    },
    [trace, focusUiFindMatches, location, history]
  );

  const getViewRange = useCallback(() => currentViewRangeTime, [currentViewRangeTime]);
  const getSearchedSpanIDs = useCallback(() => findMatchesIDs, [findMatchesIDs]);
  const getCollapsedChildren = useCallback(() => childrenHiddenIDs, [childrenHiddenIDs]);

  const mapRowIndexToSpanIndex = useCallback(
    (index: number) => testableHelpers.mapRowIndexToSpanIndex(rowStates, index),
    [rowStates]
  );

  const mapSpanIndexToRowIndex = useCallback(
    (index: number) => testableHelpers.mapSpanIndexToRowIndex(rowStates, index),
    [rowStates]
  );

  const getAccessors = useCallback((): Accessors => {
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

  useEffect(() => {
    if (listViewRef.current) {
      registerAccessors(getAccessors());
    }
  }, [registerAccessors, getAccessors]);

  const setListView = useCallback(
    (listView: ListView | null) => {
      const isChanged = listViewRef.current !== listView;
      listViewRef.current = listView;
      if (listView && isChanged) {
        registerAccessors(getAccessors());
      }
    },
    [registerAccessors, getAccessors]
  );

  // use long form syntax to avert flow error
  // https://github.com/facebook/flow/issues/3076#issuecomment-290944051
  const getKeyFromIndex = useCallback(
    (index: number) => testableHelpers.getKeyFromIndex(rowStates, index),
    [rowStates]
  );

  const getIndexFromKey = useCallback(
    (key: string) => testableHelpers.getIndexFromKey(rowStates, key),
    [rowStates]
  );

  const getRowHeight = useCallback(
    (index: number) => testableHelpers.getRowHeight(rowStates, index),
    [rowStates]
  );

  const linksGetter = useCallback(
    (span: Span, items: KeyValuePair[], itemIndex: number) => {
      return getLinks(span, items, itemIndex, trace);
    },
    [trace]
  );

  const getCriticalPathSections = useCallback(
    (isCollapsed: boolean, trace: Trace, spanID: string, criticalPath: criticalPathSection[]) => {
      if (isCollapsed) {
        return mergeChildrenCriticalPath(trace, spanID, criticalPath);
      }

      const pathBySpanID = memoizedCriticalPathsBySpanID(criticalPath);
      return spanID in pathBySpanID ? pathBySpanID[spanID] : [];
    },
    []
  );

  const renderSpanBarRow = useCallback(
    (span: Span, spanIndex: number, key: string, style: React.CSSProperties, attrs: object) => {
      const { spanID } = span;
      const { serviceName } = span.process;
      const {
        childrenHiddenIDs,
        childrenToggle,
        detailStates,
        detailToggle,
        findMatchesIDs,
        spanNameColumnWidth,
        trace,
        criticalPath,
      } = props;
      // to avert flow error
      if (!trace) {
        return null;
      }
      const color = colorGenerator.getColorByKey(serviceName);
      const isCollapsed = childrenHiddenIDs.has(spanID);
      const isDetailExpanded = detailStates.has(spanID);
      const isMatchingFilter = findMatchesIDs ? findMatchesIDs.has(spanID) : false;
      const showErrorIcon =
        isErrorSpan(span) || (isCollapsed && spanContainsErredSpan(trace.spans, spanIndex));
      const criticalPathSections = getCriticalPathSections(isCollapsed, trace, spanID, criticalPath);
      // Check for direct child "server" span if the span is a "client" span.
      let rpc = null;
      if (isCollapsed) {
        const rpcSpan = findServerChildSpan(trace.spans.slice(spanIndex));
        if (rpcSpan) {
          const rpcViewBounds = getViewedBounds()(rpcSpan.startTime, rpcSpan.startTime + rpcSpan.duration);
          rpc = {
            color: colorGenerator.getColorByKey(rpcSpan.process.serviceName),
            operationName: rpcSpan.operationName,
            serviceName: rpcSpan.process.serviceName,
            viewEnd: rpcViewBounds.end,
            viewStart: rpcViewBounds.start,
          };
        }
      }
      const peerServiceKV = span.tags.find(kv => kv.key === PEER_SERVICE);
      // Leaf, kind == client and has peer.service tag, is likely a client span that does a request
      // to an uninstrumented/external service
      let noInstrumentedServer = null;
      if (!span.hasChildren && peerServiceKV && (isKindClient(span) || isKindProducer(span))) {
        noInstrumentedServer = {
          serviceName: peerServiceKV.value,
          color: colorGenerator.getColorByKey(peerServiceKV.value),
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
            showErrorIcon={showErrorIcon}
            getViewedBounds={getViewedBounds()}
            traceStartTime={trace.startTime}
            span={span}
            focusSpan={focusSpan}
            traceDuration={trace.duration}
          />
        </div>
      );
    },
    [
      props.childrenHiddenIDs,
      props.childrenToggle,
      props.detailStates,
      props.detailToggle,
      props.findMatchesIDs,
      props.spanNameColumnWidth,
      props.trace,
      props.criticalPath,
      getCriticalPathSections,
      getViewedBounds,
      getClippingCssClasses,
      focusSpan,
    ]
  );

  const renderSpanDetailRow = useCallback(
    (span: Span, key: string, style: React.CSSProperties, attrs: object) => {
      const { spanID } = span;
      const { serviceName } = span.process;
      const {
        detailLogItemToggle,
        detailLogsToggle,
        detailProcessToggle,
        detailReferencesToggle,
        detailWarningsToggle,
        detailStates,
        detailTagsToggle,
        detailToggle,
        spanNameColumnWidth,
        trace,
        currentViewRangeTime,
      } = props;
      const detailState = detailStates.get(spanID);
      if (!trace || !detailState) {
        return null;
      }
      const color = colorGenerator.getColorByKey(serviceName);
      return (
        <div className="VirtualizedTraceView--row" key={key} style={{ ...style, zIndex: 1 }} {...attrs}>
          <SpanDetailRow
            color={color}
            columnDivision={spanNameColumnWidth}
            onDetailToggled={detailToggle}
            detailState={detailState}
            linksGetter={linksGetter}
            logItemToggle={detailLogItemToggle}
            logsToggle={detailLogsToggle}
            processToggle={detailProcessToggle}
            referencesToggle={detailReferencesToggle}
            warningsToggle={detailWarningsToggle}
            span={span}
            tagsToggle={detailTagsToggle}
            traceStartTime={trace.startTime}
            focusSpan={focusSpan}
            currentViewRangeTime={currentViewRangeTime}
            traceDuration={trace.duration}
          />
        </div>
      );
    },
    [props, linksGetter, focusSpan]
  );

  const renderRow = useCallback(
    (key: string, style: React.CSSProperties, index: number, attrs: object) => {
      const { isDetail, span, spanIndex } = rowStates[index];
      return isDetail
        ? renderSpanDetailRow(span, key, style, attrs)
        : renderSpanBarRow(span, spanIndex, key, style, attrs);
    },
    [rowStates, renderSpanDetailRow, renderSpanBarRow]
  );

  return (
    <div className="VirtualizedTraceView--spans">
      <ListView
        ref={setListView}
        dataLength={rowStates.length}
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
