// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as React from 'react';
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
  createSparseViewedBoundsFunc,
  analyzeTraceGaps,
  findServerChildSpan,
  isErrorSpan,
  isKindClient,
  isKindProducer,
  spanContainsErredSpan,
  ViewedBoundsFunctionType,
  TimelineGap,
  DEFAULT_SPARSE_TRACE_CONFIG,
  SparseTraceConfig,
} from './utils';
import TimelineGapComponent from './TimelineGap';
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
} | {
  isGap: true;
  gap: TimelineGap;
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
  detailStates: Map<string, DetailState | TNil>,
  gaps: TimelineGap[] = []
): RowState[] {
  if (!spans) {
    return [];
  }
  let collapseDepth = null;
  const rowStates: RowState[] = [];
  const gapsByPosition = new Map<number, TimelineGap>();

  // Map gaps to their positions relative to spans
  gaps.forEach(gap => {
    for (let i = 0; i < spans.length - 1; i++) {
      const currentSpan = spans[i];
      const nextSpan = spans[i + 1];
      const currentSpanEndTime = currentSpan.startTime + currentSpan.duration;

      if (Math.abs(gap.startTime - currentSpanEndTime) < 1000 && // 1ms tolerance
          Math.abs(gap.endTime - nextSpan.startTime) < 1000) {
        gapsByPosition.set(i, gap);
        break;
      }
    }
  });

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

    // Add gap row if there's a gap after this span
    const gap = gapsByPosition.get(i);
    if (gap && gap.shouldCollapse) {
      rowStates.push({
        isGap: true,
        gap,
      });
    }
  }
  return rowStates;
}

function generateRowStatesFromTrace(
  trace: Trace | TNil,
  childrenHiddenIDs: Set<string>,
  detailStates: Map<string, DetailState | TNil>,
  gaps: TimelineGap[] = []
): RowState[] {
  return trace ? generateRowStates(trace.spans, childrenHiddenIDs, detailStates, gaps) : [];
}

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

const memoizedGenerateRowStates = memoizeOne(generateRowStatesFromTrace, _isEqual);
const memoizedViewBoundsFunc = memoizeOne(createViewedBoundsFunc, _isEqual);
const memoizedSparseViewBoundsFunc = memoizeOne(createSparseViewedBoundsFunc, _isEqual);
const memoizedAnalyzeTraceGaps = memoizeOne(analyzeTraceGaps);
const memoizedGetCssClasses = memoizeOne(getCssClasses, _isEqual);
const memoizedCriticalPathsBySpanID = memoizeOne((criticalPath: criticalPathSection[]) =>
  _groupBy(criticalPath, x => x.spanId)
);

// export from tests
export class VirtualizedTraceViewImpl extends React.Component<VirtualizedTraceViewProps> {
  listView: ListView | TNil;
  private sparseTraceConfig: SparseTraceConfig = DEFAULT_SPARSE_TRACE_CONFIG;
  private collapsedGaps: Set<TimelineGap> = new Set();

  constructor(props: VirtualizedTraceViewProps) {
    super(props);
    const { setTrace, trace, uiFind } = props;
    setTrace(trace, uiFind);
  }

  shouldComponentUpdate(nextProps: VirtualizedTraceViewProps) {
    // If any prop updates, VirtualizedTraceViewImpl should update.
    const nextPropKeys = Object.keys(nextProps) as (keyof VirtualizedTraceViewProps)[];
    for (let i = 0; i < nextPropKeys.length; i += 1) {
      if (nextProps[nextPropKeys[i]] !== this.props[nextPropKeys[i]]) {
        // Unless the only change was props.shouldScrollToFirstUiFindMatch changing to false.
        if (nextPropKeys[i] === 'shouldScrollToFirstUiFindMatch') {
          if (nextProps[nextPropKeys[i]]) return true;
        } else {
          return true;
        }
      }
    }
    return false;
  }

  componentDidUpdate(prevProps: Readonly<VirtualizedTraceViewProps>) {
    const { registerAccessors, trace } = prevProps;
    const {
      shouldScrollToFirstUiFindMatch,
      clearShouldScrollToFirstUiFindMatch,
      scrollToFirstVisibleSpan,
      registerAccessors: nextRegisterAccessors,
      setTrace,
      trace: nextTrace,
      uiFind,
    } = this.props;

    if (trace !== nextTrace) {
      setTrace(nextTrace, uiFind);
    }

    if (this.listView && registerAccessors !== nextRegisterAccessors) {
      nextRegisterAccessors(this.getAccessors());
    }

    if (shouldScrollToFirstUiFindMatch) {
      scrollToFirstVisibleSpan();
      clearShouldScrollToFirstUiFindMatch();
    }
  }

  getRowStates(): RowState[] {
    const { childrenHiddenIDs, detailStates, trace } = this.props;
    const gaps = this.getTraceGaps();
    return memoizedGenerateRowStates(trace, childrenHiddenIDs, detailStates, gaps);
  }

  getClippingCssClasses(): string {
    const { currentViewRangeTime } = this.props;
    return memoizedGetCssClasses(currentViewRangeTime);
  }

  getTraceGaps(): TimelineGap[] {
    const { trace } = this.props;
    if (!trace) return [];

    return memoizedAnalyzeTraceGaps(
      trace.spans,
      trace.startTime,
      trace.duration,
      this.sparseTraceConfig
    );
  }

  getViewedBounds(): ViewedBoundsFunctionType {
    const { currentViewRangeTime, trace } = this.props;
    const [zoomStart, zoomEnd] = currentViewRangeTime;

    const viewRange = {
      min: trace.startTime,
      max: trace.endTime,
      viewStart: zoomStart,
      viewEnd: zoomEnd,
    };

    if (this.sparseTraceConfig.enabled) {
      const gaps = this.getTraceGaps();
      return memoizedSparseViewBoundsFunc(viewRange, gaps);
    }

    return memoizedViewBoundsFunc(viewRange);
  }

  toggleGapCollapse = (gap: TimelineGap) => {
    if (this.collapsedGaps.has(gap)) {
      this.collapsedGaps.delete(gap);
    } else {
      this.collapsedGaps.add(gap);
    }
    this.forceUpdate();
  };

  focusSpan = (uiFind: string) => {
    const { trace, focusUiFindMatches, location, history } = this.props;
    if (trace) {
      updateUiFind({
        location,
        history,
        uiFind,
      });
      focusUiFindMatches(trace, uiFind, false);
    }
  };

  getAccessors() {
    const lv = this.listView;
    if (!lv) {
      throw new Error('ListView unavailable');
    }
    return {
      getViewRange: this.getViewRange,
      getSearchedSpanIDs: this.getSearchedSpanIDs,
      getCollapsedChildren: this.getCollapsedChildren,
      getViewHeight: lv.getViewHeight,
      getBottomRowIndexVisible: lv.getBottomVisibleIndex,
      getTopRowIndexVisible: lv.getTopVisibleIndex,
      getRowPosition: lv.getRowPosition,
      mapRowIndexToSpanIndex: this.mapRowIndexToSpanIndex,
      mapSpanIndexToRowIndex: this.mapSpanIndexToRowIndex,
    };
  }

  getViewRange = () => this.props.currentViewRangeTime;

  getSearchedSpanIDs = () => this.props.findMatchesIDs;

  getCollapsedChildren = () => this.props.childrenHiddenIDs;

  mapRowIndexToSpanIndex = (index: number) => {
    const rowState = this.getRowStates()[index];
    if ('isGap' in rowState) {
      throw new Error(`Row ${index} is a gap, not a span`);
    }
    return rowState.spanIndex;
  };

  mapSpanIndexToRowIndex = (index: number) => {
    const max = this.getRowStates().length;
    for (let i = 0; i < max; i++) {
      const rowState = this.getRowStates()[i];
      if ('isGap' in rowState) continue;
      if (rowState.spanIndex === index) {
        return i;
      }
    }
    throw new Error(`unable to find row for span index: ${index}`);
  };

  setListView = (listView: ListView | TNil) => {
    const isChanged = this.listView !== listView;
    this.listView = listView;
    if (listView && isChanged) {
      this.props.registerAccessors(this.getAccessors());
    }
  };

  // use long form syntax to avert flow error
  // https://github.com/facebook/flow/issues/3076#issuecomment-290944051
  getKeyFromIndex = (index: number) => {
    const rowState = this.getRowStates()[index];
    if ('isGap' in rowState) {
      return `gap--${rowState.gap.startTime}--${rowState.gap.endTime}`;
    }
    const { isDetail, span } = rowState;
    return `${span.spanID}--${isDetail ? 'detail' : 'bar'}`;
  };

  getIndexFromKey = (key: string) => {
    const parts = key.split('--');
    if (parts[0] === 'gap') {
      const startTime = Number(parts[1]);
      const endTime = Number(parts[2]);
      const max = this.getRowStates().length;
      for (let i = 0; i < max; i++) {
        const rowState = this.getRowStates()[i];
        if ('isGap' in rowState && rowState.gap.startTime === startTime && rowState.gap.endTime === endTime) {
          return i;
        }
      }
      return -1;
    }

    const _spanID = parts[0];
    const _isDetail = parts[1] === 'detail';
    const max = this.getRowStates().length;
    for (let i = 0; i < max; i++) {
      const rowState = this.getRowStates()[i];
      if ('isGap' in rowState) continue;
      const { span, isDetail } = rowState;
      if (span.spanID === _spanID && isDetail === _isDetail) {
        return i;
      }
    }
    return -1;
  };

  getRowHeight = (index: number) => {
    const rowState = this.getRowStates()[index];
    if ('isGap' in rowState) {
      return DEFAULT_HEIGHTS.bar; // Same height as span bars
    }
    const { span, isDetail } = rowState;
    if (!isDetail) {
      return DEFAULT_HEIGHTS.bar;
    }
    if (Array.isArray(span.logs) && span.logs.length) {
      return DEFAULT_HEIGHTS.detailWithLogs;
    }
    return DEFAULT_HEIGHTS.detail;
  };

  linksGetter = (span: Span, items: KeyValuePair[], itemIndex: number) => {
    const { trace } = this.props;
    return getLinks(span, items, itemIndex, trace);
  };

  renderRow = (key: string, style: React.CSSProperties, index: number, attrs: object) => {
    const rowState = this.getRowStates()[index];

    if ('isGap' in rowState) {
      return this.renderGapRow(rowState.gap, key, style, attrs);
    }

    const { isDetail, span, spanIndex } = rowState;
    return isDetail
      ? this.renderSpanDetailRow(span, key, style, attrs)
      : this.renderSpanBarRow(span, spanIndex, key, style, attrs);
  };

  renderGapRow(gap: TimelineGap, key: string, style: React.CSSProperties, attrs: object) {
    const { spanNameColumnWidth, trace } = this.props;
    if (!trace) return null;

    const isCollapsed = this.collapsedGaps.has(gap) || gap.shouldCollapse;

    return (
      <div className="VirtualizedTraceView--row VirtualizedTraceView--gapRow" key={key} style={style} {...attrs}>
        <TimelineGapComponent
          gap={gap}
          isCollapsed={isCollapsed}
          onToggleCollapse={this.toggleGapCollapse}
          columnDivision={spanNameColumnWidth}
          traceDuration={trace.duration}
        />
      </div>
    );
  }

  getCriticalPathSections(
    isCollapsed: boolean,
    trace: Trace,
    spanID: string,
    criticalPath: criticalPathSection[]
  ) {
    if (isCollapsed) {
      return mergeChildrenCriticalPath(trace, spanID, criticalPath);
    }

    const pathBySpanID = memoizedCriticalPathsBySpanID(criticalPath);
    return spanID in pathBySpanID ? pathBySpanID[spanID] : [];
  }

  renderSpanBarRow(span: Span, spanIndex: number, key: string, style: React.CSSProperties, attrs: object) {
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
    } = this.props;
    // to avert flow error
    if (!trace) {
      return null;
    }
    const color = colorGenerator.getColorByKey(serviceName);
    const isCollapsed = childrenHiddenIDs.has(spanID);
    const isDetailExpanded = detailStates.has(spanID);
    const isMatchingFilter = findMatchesIDs ? findMatchesIDs.has(spanID) : false;
    const showErrorIcon = isErrorSpan(span) || (isCollapsed && spanContainsErredSpan(trace.spans, spanIndex));
    const criticalPathSections = this.getCriticalPathSections(isCollapsed, trace, spanID, criticalPath);
    // Check for direct child "server" span if the span is a "client" span.
    let rpc = null;
    if (isCollapsed) {
      const rpcSpan = findServerChildSpan(trace.spans.slice(spanIndex));
      if (rpcSpan) {
        const rpcViewBounds = this.getViewedBounds()(rpcSpan.startTime, rpcSpan.startTime + rpcSpan.duration);
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
          className={this.getClippingCssClasses()}
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
          getViewedBounds={this.getViewedBounds()}
          traceStartTime={trace.startTime}
          span={span}
          focusSpan={this.focusSpan}
          traceDuration={trace.duration}
        />
      </div>
    );
  }

  renderSpanDetailRow(span: Span, key: string, style: React.CSSProperties, attrs: object) {
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
    } = this.props;
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
          linksGetter={this.linksGetter}
          logItemToggle={detailLogItemToggle}
          logsToggle={detailLogsToggle}
          processToggle={detailProcessToggle}
          referencesToggle={detailReferencesToggle}
          warningsToggle={detailWarningsToggle}
          span={span}
          tagsToggle={detailTagsToggle}
          traceStartTime={trace.startTime}
          focusSpan={this.focusSpan}
          currentViewRangeTime={currentViewRangeTime}
          traceDuration={trace.duration}
        />
      </div>
    );
  }

  render() {
    return (
      <div className="VirtualizedTraceView--spans">
        <ListView
          ref={this.setListView}
          dataLength={this.getRowStates().length}
          itemHeightGetter={this.getRowHeight}
          itemRenderer={this.renderRow}
          viewBuffer={300}
          viewBufferMin={100}
          itemsWrapperClassName="VirtualizedTraceView--rowsWrapper"
          getKeyFromIndex={this.getKeyFromIndex}
          getIndexFromKey={this.getIndexFromKey}
          windowScroller
        />
      </div>
    );
  }
}

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
