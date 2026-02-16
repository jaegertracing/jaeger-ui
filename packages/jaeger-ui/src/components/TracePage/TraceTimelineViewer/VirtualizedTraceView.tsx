// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
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

// Helper functions exported for testing
export function getRowStatesHelper(
  trace: IOtelTrace | TNil,
  childrenHiddenIDs: Set<string>,
  detailStates: Map<string, DetailState | TNil>
): RowState[] {
  return memoizedGenerateRowStates(trace, childrenHiddenIDs, detailStates);
}

export function getKeyFromIndexHelper(rowStates: RowState[], index: number): string {
  const { isDetail, span } = rowStates[index];
  return `${span.spanID}--${isDetail ? 'detail' : 'bar'}`;
}

export function getIndexFromKeyHelper(rowStates: RowState[], key: string): number {
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
}

export function getRowHeightHelper(rowStates: RowState[], index: number): number {
  const { span, isDetail } = rowStates[index];
  if (!isDetail) {
    return DEFAULT_HEIGHTS.bar;
  }
  if (Array.isArray(span.events) && span.events.length) {
    return DEFAULT_HEIGHTS.detailWithLogs;
  }
  return DEFAULT_HEIGHTS.detail;
}

export function mapRowIndexToSpanIndexHelper(rowStates: RowState[], index: number): number {
  return rowStates[index].spanIndex;
}

export function mapSpanIndexToRowIndexHelper(rowStates: RowState[], index: number): number {
  const max = rowStates.length;
  for (let i = 0; i < max; i++) {
    const { spanIndex } = rowStates[i];
    if (spanIndex === index) {
      return i;
    }
  }
  throw new Error(`unable to find row for span index: ${index}`);
}

// export from tests
export const VirtualizedTraceViewImpl: React.FC<VirtualizedTraceViewProps> = React.memo(
  function VirtualizedTraceViewImpl(props: VirtualizedTraceViewProps) {
    const {
      childrenHiddenIDs,
      childrenToggle,
      clearShouldScrollToFirstUiFindMatch,
      criticalPath,
      currentViewRangeTime,
      detailLogItemToggle,
      detailLogsToggle,
      detailProcessToggle,
      detailReferencesToggle,
      detailStates,
      detailTagsToggle,
      detailToggle,
      detailWarningsToggle,
      findMatchesIDs,
      focusUiFindMatches,
      history,
      location,
      registerAccessors,
      scrollToFirstVisibleSpan,
      setTrace,
      shouldScrollToFirstUiFindMatch,
      spanNameColumnWidth,
      trace,
      uiFind,
      useOtelTerms,
    } = props;

    // Ref to store ListView instance
    const listViewRef = useRef<ListView | null>(null);

    // Ref to store previous trace for comparison (for setTrace effect)
    const prevTraceRef = useRef<IOtelTrace | null>(null);

    // Get row states using memoized function
    const getRowStates = useCallback((): RowState[] => {
      return memoizedGenerateRowStates(trace, childrenHiddenIDs, detailStates);
    }, [trace, childrenHiddenIDs, detailStates]);

    const clippingCssClasses = memoizedGetCssClasses(currentViewRangeTime);

    // Memoize getViewedBounds to prevent unnecessary child re-renders
    // Guard against null/undefined trace to avoid runtime crashes
    const viewedBoundsFunc = useMemo((): ViewedBoundsFunctionType => {
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

    // Focus span handler
    const focusSpan = useCallback(
      (uiFindValue: string) => {
        if (trace) {
          updateUiFind({
            location,
            history,
            uiFind: uiFindValue,
          });
          focusUiFindMatches(trace, uiFindValue, false);
        }
      },
      [trace, focusUiFindMatches, location, history]
    );

    // Get accessors
    const getAccessors = useCallback((): Accessors => {
      const lv = listViewRef.current;
      if (!lv) {
        throw new Error('ListView unavailable');
      }
      return {
        getViewRange: () => currentViewRangeTime,
        getSearchedSpanIDs: () => findMatchesIDs,
        getCollapsedChildren: () => childrenHiddenIDs,
        getViewHeight: lv.getViewHeight,
        getBottomRowIndexVisible: lv.getBottomVisibleIndex,
        getTopRowIndexVisible: lv.getTopVisibleIndex,
        getRowPosition: lv.getRowPosition,
        mapRowIndexToSpanIndex: (index: number) => getRowStates()[index].spanIndex,
        mapSpanIndexToRowIndex: (index: number) => {
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
      };
    }, [currentViewRangeTime, findMatchesIDs, childrenHiddenIDs, getRowStates]);

    // Set list view ref — stable callback to avoid React detaching/reattaching the ref
    const setListView = useCallback((listView: ListView | TNil) => {
      listViewRef.current = listView ?? null;
    }, []);

    // Register accessors when ListView or accessor inputs change
    useEffect(() => {
      if (listViewRef.current) {
        registerAccessors(getAccessors());
      }
    }, [registerAccessors, getAccessors]);

    // Get key from index
    const getKeyFromIndex = useCallback(
      (index: number): string => {
        const { isDetail, span } = getRowStates()[index];
        return `${span.spanID}--${isDetail ? 'detail' : 'bar'}`;
      },
      [getRowStates]
    );

    // Get index from key
    const getIndexFromKey = useCallback(
      (key: string): number => {
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

    // Get row height
    const getRowHeight = useCallback(
      (index: number): number => {
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

    // Links getter
    const linksGetter = useCallback(
      (span: IOtelSpan, items: ReadonlyArray<IAttribute>, itemIndex: number) => {
        if (!trace) return [];
        return getLinks(span, items, itemIndex, trace);
      },
      [trace]
    );

    // Adapter for OTEL components that need links from attributes
    const linksGetterFromAttributes = useCallback(
      (span: IOtelSpan) => (attributes: ReadonlyArray<IAttribute>, index: number) => {
        return linksGetter(span, attributes, index);
      },
      [linksGetter]
    );

    // Adapter for OTEL event toggle to legacy log toggle
    // Memoize to prevent creating new function on each render
    const eventItemToggle = useCallback(
      (spanID: string, event: IEvent) => {
        detailLogItemToggle(spanID, event);
      },
      [detailLogItemToggle]
    );

    // Get critical path sections
    const getCriticalPathSections = useCallback(
      (
        isCollapsed: boolean,
        traceData: IOtelTrace,
        spanID: string,
        criticalPathData: CriticalPathSection[]
      ): CriticalPathSection[] => {
        if (isCollapsed) {
          return mergeChildrenCriticalPath(traceData, spanID, criticalPathData);
        }

        const pathBySpanID = memoizedCriticalPathsBySpanID(criticalPathData);
        return spanID in pathBySpanID ? pathBySpanID[spanID] : [];
      },
      []
    );

    // Render span bar row
    const renderSpanBarRow = useCallback(
      (span: IOtelSpan, spanIndex: number, key: string, style: React.CSSProperties, attrs: object) => {
        const { spanID } = span;
        const { serviceName } = span.resource;

        // to avert flow error
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
        // Check for direct child "server" span if the span is a "client" span.
        let rpc = null;
        if (isCollapsed) {
          const rpcSpan = findServerChildSpan(spans.slice(spanIndex));
          if (rpcSpan) {
            const rpcViewBounds = viewedBoundsFunc(rpcSpan.startTime, rpcSpan.endTime);
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
        // Leaf, kind == client and has peer.service tag, is likely a client span that does a request
        // to an uninstrumented/external service
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
              className={clippingCssClasses}
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
              getViewedBounds={viewedBoundsFunc}
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
        trace,
        childrenHiddenIDs,
        detailStates,
        findMatchesIDs,
        criticalPath,
        spanNameColumnWidth,
        detailToggle,
        childrenToggle,
        viewedBoundsFunc,
        clippingCssClasses,
        focusSpan,
        useOtelTerms,
        getCriticalPathSections,
      ]
    );

    // Render span detail row
    const renderSpanDetailRow = useCallback(
      (span: IOtelSpan, key: string, style: React.CSSProperties, attrs: object) => {
        const { spanID } = span;
        const { serviceName } = span.resource;
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
              linksGetter={linksGetterFromAttributes(span)}
              eventItemToggle={eventItemToggle}
              eventsToggle={detailLogsToggle}
              resourceToggle={detailProcessToggle}
              linksToggle={detailReferencesToggle}
              warningsToggle={detailWarningsToggle}
              span={span}
              attributesToggle={detailTagsToggle}
              traceStartTime={trace.startTime}
              focusSpan={focusSpan}
              currentViewRangeTime={currentViewRangeTime}
              traceDuration={trace.duration}
              useOtelTerms={useOtelTerms}
            />
          </div>
        );
      },
      [
        trace,
        detailStates,
        spanNameColumnWidth,
        detailToggle,
        linksGetterFromAttributes,
        eventItemToggle,
        detailLogsToggle,
        detailProcessToggle,
        detailReferencesToggle,
        detailWarningsToggle,
        detailTagsToggle,
        focusSpan,
        currentViewRangeTime,
        useOtelTerms,
      ]
    );

    // Render row
    const renderRow = useCallback(
      (key: string, style: React.CSSProperties, index: number, attrs: object) => {
        const { isDetail, span, spanIndex } = getRowStates()[index];
        return isDetail
          ? renderSpanDetailRow(span, key, style, attrs)
          : renderSpanBarRow(span, spanIndex, key, style, attrs);
      },
      [getRowStates, renderSpanDetailRow, renderSpanBarRow]
    );

    // Event handlers using refs to avoid stale closures
    const handleListResize = useCallback(() => {
      if (listViewRef.current) {
        // Force ListView to update and re-scan item heights
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

    // Effect: Register event listeners (componentDidMount/componentWillUnmount)
    useEffect(() => {
      window.addEventListener('jaeger:list-resize', handleListResize);
      window.addEventListener('jaeger:detail-measure', handleDetailMeasure as any);

      return () => {
        window.removeEventListener('jaeger:list-resize', handleListResize);
        window.removeEventListener('jaeger:detail-measure', handleDetailMeasure as any);
      };
    }, [handleListResize, handleDetailMeasure]);

    // Effect: Trace sync (when trace changes) - only call setTrace when trace actually changes
    useEffect(() => {
      if (prevTraceRef.current !== trace) {
        setTrace(trace, uiFind);
        prevTraceRef.current = trace;
      }
    }, [trace, setTrace, uiFind]);

    // Effect: Scroll to first UI find match
    useEffect(() => {
      if (shouldScrollToFirstUiFindMatch) {
        scrollToFirstVisibleSpan();
        clearShouldScrollToFirstUiFindMatch();
      }
    }, [shouldScrollToFirstUiFindMatch, scrollToFirstVisibleSpan, clearShouldScrollToFirstUiFindMatch]);

    return (
      <div className="VirtualizedTraceView--spans">
        <ListView
          ref={setListView}
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
  }
);

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
