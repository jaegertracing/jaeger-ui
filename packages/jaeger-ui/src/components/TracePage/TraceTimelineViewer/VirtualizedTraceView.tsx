// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useCallback } from 'react';
import cx from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import _isEqual from 'lodash/isEqual';
import _groupBy from 'lodash/groupBy';

import memoizeOne from 'memoize-one';
import type { Location, NavigateFunction } from 'react-router-dom';
import { actions } from './duck';
import ListView from './ListView';
import PrunedSpanRow from './PrunedSpanRow';
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
import { getSelectedSpanID, useLayoutPrefsStore, useTraceTimelineStore } from './store';

import './VirtualizedTraceView.css';
import updateUiFind from '../../../utils/update-ui-find';
import { PEER_SERVICE } from '../../../constants/tag-keys';
import withRouteProps from '../../../utils/withRouteProps';

type RowState =
  | {
      isDetail: boolean;
      span: IOtelSpan;
      spanIndex: number;
      isPrunedPlaceholder?: undefined;
    }
  | {
      isDetail: false;
      span: IOtelSpan;
      spanIndex: number;
      isPrunedPlaceholder: true;
      prunedChildrenCount: number;
    };

type TVirtualizedTraceViewOwnProps = {
  currentViewRangeTime: [number, number];
  findMatchesIDs: Set<string> | TNil;
  nameColumnWidth: number;
  scrollToFirstVisibleSpan: () => void;
  registerAccessors: (accesors: Accessors) => void;
  trace: IOtelTrace;
  criticalPath: CriticalPathSection[];
  useOtelTerms: boolean;
  prunedServices: Set<string>;
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
  navigate: NavigateFunction;
};

type TDerivedStateProps = {
  selectedSpanID: string | null;
};

type VirtualizedTraceViewProps = TVirtualizedTraceViewOwnProps &
  TDispatchProps &
  TExtractUiFindFromStateReturn &
  TTraceTimeline &
  TDerivedStateProps &
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
  detailStates: Map<string, DetailState | TNil>,
  detailPanelMode: 'inline' | 'sidepanel',
  prunedServices: Set<string>
): RowState[] {
  if (!spans) {
    return [];
  }
  const hasPruning = prunedServices.size > 0;
  let collapseDepth: number | null = null;
  let pruneDepth: number | null = null;
  const rowStates: RowState[] = [];

  // Track the last emitted visible span at each depth for pruned-child counting.
  // parentByDepth[d] = index into rowStates of the last emitted span at depth d.
  const parentByDepth: (number | undefined)[] = [];
  // Count of pruned direct children per rowStates index.
  const prunedChildCounts: number[] = [];

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    const { spanID, depth } = span;

    // Exit pruned subtree when we return to or above prune depth.
    if (pruneDepth != null && depth <= pruneDepth) {
      pruneDepth = null;
    }

    // Exit collapsed subtree when we return to or above collapse depth.
    if (collapseDepth != null) {
      if (depth >= collapseDepth) {
        continue;
      }
      collapseDepth = null;
    }

    // Inside a pruned subtree — skip.
    if (pruneDepth != null) {
      continue;
    }

    // Service filter pruning: prune this span and its entire subtree.
    if (hasPruning && prunedServices.has(span.resource.serviceName)) {
      pruneDepth = depth;
      // Attribute pruned child to its parent.
      if (depth > 0) {
        const parentIdx = parentByDepth[depth - 1];
        if (parentIdx != null) {
          prunedChildCounts[parentIdx] = (prunedChildCounts[parentIdx] || 0) + 1;
        }
      }
      continue;
    }

    // Manual collapse.
    if (childrenHiddenIDs.has(spanID)) {
      collapseDepth = depth + 1;
    }

    const rowIdx = rowStates.length;
    parentByDepth[depth] = rowIdx;
    rowStates.push({
      span,
      isDetail: false,
      spanIndex: i,
    });
    // In side panel mode, detail rows are shown in the panel, not inline.
    if (detailPanelMode !== 'sidepanel' && detailStates.has(spanID)) {
      rowStates.push({
        span,
        isDetail: true,
        spanIndex: i,
      });
    }
  }

  // Second pass: insert pruned placeholder rows (iterate backwards to keep indices stable).
  if (hasPruning) {
    for (let ri = prunedChildCounts.length - 1; ri >= 0; ri--) {
      const count = prunedChildCounts[ri];
      if (!count) continue;
      const parentRow = rowStates[ri];
      // Find the insertion point: after the parent's span row (and its detail row if present).
      let insertAt = ri + 1;
      while (insertAt < rowStates.length && rowStates[insertAt].isDetail) {
        insertAt++;
      }
      rowStates.splice(insertAt, 0, {
        span: parentRow.span,
        isDetail: false,
        spanIndex: parentRow.spanIndex,
        isPrunedPlaceholder: true,
        prunedChildrenCount: count,
      });
    }
  }

  return rowStates;
}

function generateRowStatesFromTrace(
  trace: IOtelTrace | TNil,
  childrenHiddenIDs: Set<string>,
  detailStates: Map<string, DetailState | TNil>,
  detailPanelMode: 'inline' | 'sidepanel',
  prunedServices: Set<string>
): RowState[] {
  if (!trace) {
    return [];
  }
  return generateRowStates(trace.spans, childrenHiddenIDs, detailStates, detailPanelMode, prunedServices);
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
export class VirtualizedTraceViewImpl extends React.Component<VirtualizedTraceViewProps> {
  listView: ListView | TNil;
  constructor(props: VirtualizedTraceViewProps) {
    super(props);
    const { setTrace, trace, uiFind } = props;
    setTrace(trace, uiFind);
  }

  componentDidMount(): void {
    window.addEventListener('jaeger:list-resize', this._handleListResize);
    window.addEventListener('jaeger:detail-measure', this._handleDetailMeasure as any);
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

  componentWillUnmount(): void {
    window.removeEventListener('jaeger:list-resize', this._handleListResize);
    window.removeEventListener('jaeger:detail-measure', this._handleDetailMeasure as any);
  }

  _handleListResize = () => {
    if (this.listView) {
      // Force ListView to update and re-scan item heights
      this.listView.forceUpdate();
    }
  };

  _handleDetailMeasure = (evt: { detail?: { spanID?: string } }) => {
    const spanID = evt && evt.detail && evt.detail.spanID;
    if (!this.listView || !spanID) {
      this._handleListResize();
      return;
    }
    // Force the list to re-scan heights
    this.listView.forceUpdate();
  };

  getRowStates(): RowState[] {
    const { childrenHiddenIDs, detailStates, detailPanelMode, prunedServices, trace } = this.props;
    return memoizedGenerateRowStates(trace, childrenHiddenIDs, detailStates, detailPanelMode, prunedServices);
  }

  getClippingCssClasses(): string {
    const { currentViewRangeTime } = this.props;
    return memoizedGetCssClasses(currentViewRangeTime);
  }

  getViewedBounds(): ViewedBoundsFunctionType {
    const { currentViewRangeTime, trace } = this.props;
    const [zoomStart, zoomEnd] = currentViewRangeTime;

    return memoizedViewBoundsFunc({
      min: trace.startTime,
      max: trace.endTime,
      viewStart: zoomStart,
      viewEnd: zoomEnd,
    });
  }

  focusSpan = (uiFind: string) => {
    const { trace, focusUiFindMatches, location, navigate } = this.props;
    if (trace) {
      updateUiFind({
        location,
        navigate,
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

  mapRowIndexToSpanIndex = (index: number) => this.getRowStates()[index].spanIndex;

  mapSpanIndexToRowIndex = (index: number) => {
    const max = this.getRowStates().length;
    for (let i = 0; i < max; i++) {
      const { spanIndex } = this.getRowStates()[i];
      if (spanIndex === index) {
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
    const row = this.getRowStates()[index];
    if (row.isPrunedPlaceholder) {
      return `${row.span.spanID}--pruned`;
    }
    return `${row.span.spanID}--${row.isDetail ? 'detail' : 'bar'}`;
  };

  getIndexFromKey = (key: string) => {
    const parts = key.split('--');
    const _spanID = parts[0];
    const _type = parts[1];
    const max = this.getRowStates().length;
    for (let i = 0; i < max; i++) {
      const row = this.getRowStates()[i];
      if (row.span.spanID !== _spanID) continue;
      if (_type === 'pruned' && row.isPrunedPlaceholder) return i;
      if (_type === 'detail' && row.isDetail && !row.isPrunedPlaceholder) return i;
      if (_type === 'bar' && !row.isDetail && !row.isPrunedPlaceholder) return i;
    }
    return -1;
  };

  getRowHeight = (index: number) => {
    const row = this.getRowStates()[index];
    if (row.isPrunedPlaceholder) {
      return DEFAULT_HEIGHTS.bar;
    }
    if (!row.isDetail) {
      return DEFAULT_HEIGHTS.bar;
    }
    if (Array.isArray(row.span.events) && row.span.events.length) {
      return DEFAULT_HEIGHTS.detailWithLogs;
    }
    return DEFAULT_HEIGHTS.detail;
  };

  linksGetter = (span: IOtelSpan, items: ReadonlyArray<IAttribute>, itemIndex: number) => {
    const { trace } = this.props;
    if (!trace) return [];
    return getLinks(span, items, itemIndex, trace);
  };

  // Adapter for OTEL components that need links from attributes
  linksGetterFromAttributes = (span: IOtelSpan) => (attributes: ReadonlyArray<IAttribute>, index: number) => {
    return this.linksGetter(span, attributes, index);
  };

  // Adapter for OTEL event toggle to legacy log toggle
  eventItemToggleAdapter =
    (detailLogItemToggle: (spanID: string, log: IEvent) => void) => (spanID: string, event: IEvent) => {
      // Pass the IEvent directly.
      detailLogItemToggle(spanID, event);
    };

  renderRow = (key: string, style: React.CSSProperties, index: number, attrs: object) => {
    const row = this.getRowStates()[index];
    if (row.isPrunedPlaceholder) {
      return this.renderPrunedSpanRow(row.span, row.prunedChildrenCount, key, style, attrs);
    }
    const { isDetail, span, spanIndex } = row;
    return isDetail
      ? this.renderSpanDetailRow(span, key, style, attrs)
      : this.renderSpanBarRow(span, spanIndex, key, style, attrs);
  };

  getCriticalPathSections(
    isCollapsed: boolean,
    trace: IOtelTrace,
    spanID: string,
    criticalPath: CriticalPathSection[]
  ) {
    if (isCollapsed) {
      return mergeChildrenCriticalPath(trace, spanID, criticalPath);
    }

    const pathBySpanID = memoizedCriticalPathsBySpanID(criticalPath);
    return spanID in pathBySpanID ? pathBySpanID[spanID] : [];
  }

  renderPrunedSpanRow(
    parentSpan: IOtelSpan,
    prunedChildrenCount: number,
    key: string,
    style: React.CSSProperties,
    attrs: object
  ) {
    const { nameColumnWidth, timelineBarsVisible } = this.props;
    return (
      <div className="VirtualizedTraceView--row" key={key} style={style} {...attrs}>
        <PrunedSpanRow
          parentSpan={parentSpan}
          prunedChildrenCount={prunedChildrenCount}
          nameColumnWidth={nameColumnWidth}
          timelineBarsVisible={timelineBarsVisible}
        />
      </div>
    );
  }

  renderSpanBarRow(
    span: IOtelSpan,
    spanIndex: number,
    key: string,
    style: React.CSSProperties,
    attrs: object
  ) {
    const { spanID } = span;
    const { serviceName } = span.resource;
    const {
      childrenHiddenIDs,
      childrenToggle,
      detailStates,
      detailToggle,
      findMatchesIDs,
      nameColumnWidth,
      selectedSpanID,
      timelineBarsVisible,
      trace,
      criticalPath,
      useOtelTerms,
    } = this.props;
    // to avert flow error
    if (!trace) {
      return null;
    }

    const { spans } = trace;

    const color = colorGenerator.getColorByKey(serviceName);
    const isCollapsed = childrenHiddenIDs.has(spanID);
    const isDetailExpanded = detailStates.has(spanID);
    const isMatchingFilter = findMatchesIDs ? findMatchesIDs.has(spanID) : false;
    const isSelected = selectedSpanID === spanID;
    const hasOwnError = isErrorSpan(span);
    const hasChildError = isCollapsed && spanContainsErredSpan(spans, spanIndex);
    const criticalPathSections = this.getCriticalPathSections(isCollapsed, trace, spanID, criticalPath);
    // Check for direct child "server" span if the span is a "client" span.
    let rpc = null;
    if (isCollapsed) {
      const rpcSpan = findServerChildSpan(spans.slice(spanIndex));
      if (rpcSpan) {
        const rpcViewBounds = this.getViewedBounds()(rpcSpan.startTime, rpcSpan.endTime);
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
          className={this.getClippingCssClasses()}
          color={color}
          criticalPath={criticalPathSections}
          nameColumnWidth={nameColumnWidth}
          isChildrenExpanded={!isCollapsed}
          isDetailExpanded={isDetailExpanded}
          isMatchingFilter={isMatchingFilter}
          isSelected={isSelected}
          timelineBarsVisible={timelineBarsVisible}
          numTicks={NUM_TICKS}
          onDetailToggled={detailToggle}
          onChildrenToggled={childrenToggle}
          rpc={rpc}
          noInstrumentedServer={noInstrumentedServer}
          hasOwnError={hasOwnError}
          hasChildError={hasChildError}
          getViewedBounds={this.getViewedBounds()}
          traceStartTime={trace.startTime}
          span={span}
          focusSpan={this.focusSpan}
          traceDuration={trace.duration}
          useOtelTerms={useOtelTerms}
        />
      </div>
    );
  }

  renderSpanDetailRow(span: IOtelSpan, key: string, style: React.CSSProperties, attrs: object) {
    const { spanID } = span;
    const { serviceName } = span.resource;
    const {
      detailLogItemToggle,
      detailLogsToggle,
      detailProcessToggle,
      detailReferencesToggle,
      detailWarningsToggle,
      detailStates,
      detailTagsToggle,
      detailToggle,
      nameColumnWidth,
      timelineBarsVisible,
      trace,
      currentViewRangeTime,
      useOtelTerms,
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
          nameColumnWidth={nameColumnWidth}
          timelineBarsVisible={timelineBarsVisible}
          onDetailToggled={detailToggle}
          detailState={detailState}
          linksGetter={this.linksGetterFromAttributes(span)}
          eventItemToggle={this.eventItemToggleAdapter(detailLogItemToggle)}
          eventsToggle={detailLogsToggle}
          resourceToggle={detailProcessToggle}
          linksToggle={detailReferencesToggle}
          warningsToggle={detailWarningsToggle}
          span={span}
          attributesToggle={detailTagsToggle}
          traceStartTime={trace.startTime}
          focusSpan={this.focusSpan}
          currentViewRangeTime={currentViewRangeTime}
          traceDuration={trace.duration}
          useOtelTerms={useOtelTerms}
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

/**
 * Functional wrapper that reads Zustand (ephemeral timeline state + layout prefs) and the
 * remaining Redux slice (hoverIndentGuideIds, uiFind), creates dual-write action handlers
 * (Redux dispatch first so the tracking middleware sees the pre-update state, then Zustand),
 * and passes everything into the class component.
 */
/* istanbul ignore next */
function VirtualizedTraceViewWrapper(
  ownProps: TVirtualizedTraceViewOwnProps & { location: Location; navigate: NavigateFunction }
) {
  const dispatch = useDispatch<any>();
  const hoverIndentGuideIds = useSelector((state: ReduxState) => state.traceTimeline.hoverIndentGuideIds);
  const uiFind = useSelector((state: ReduxState) => extractUiFindFromState(state).uiFind);

  const spanNameColumnWidth = useLayoutPrefsStore(s => s.spanNameColumnWidth);
  const sidePanelWidth = useLayoutPrefsStore(s => s.sidePanelWidth);
  const detailPanelMode = useLayoutPrefsStore(s => s.detailPanelMode);
  const timelineBarsVisible = useLayoutPrefsStore(s => s.timelineBarsVisible);
  const traceID = useTraceTimelineStore(s => s.traceID);
  const childrenHiddenIDs = useTraceTimelineStore(s => s.childrenHiddenIDs);
  const detailStates = useTraceTimelineStore(s => s.detailStates);
  const shouldScrollToFirstUiFindMatch = useTraceTimelineStore(s => s.shouldScrollToFirstUiFindMatch);
  const prunedServices = useTraceTimelineStore(s => s.prunedServices);
  const selectedSpanID = detailPanelMode === 'sidepanel' ? getSelectedSpanID(detailStates) : null;

  const zustandSetTrace = useTraceTimelineStore(s => s.setTrace);
  const zustandChildrenToggle = useTraceTimelineStore(s => s.childrenToggle);
  const zustandDetailToggle = useTraceTimelineStore(s => s.detailToggle);
  const zustandDetailTagsToggle = useTraceTimelineStore(s => s.detailTagsToggle);
  const zustandDetailProcessToggle = useTraceTimelineStore(s => s.detailProcessToggle);
  const zustandDetailLogsToggle = useTraceTimelineStore(s => s.detailLogsToggle);
  const zustandDetailLogItemToggle = useTraceTimelineStore(s => s.detailLogItemToggle);
  const zustandDetailWarningsToggle = useTraceTimelineStore(s => s.detailWarningsToggle);
  const zustandDetailReferencesToggle = useTraceTimelineStore(s => s.detailReferencesToggle);
  const zustandClearScroll = useTraceTimelineStore(s => s.clearShouldScrollToFirstUiFindMatch);
  const zustandFocusUiFindMatches = useTraceTimelineStore(s => s.focusUiFindMatches);

  const setTrace = useCallback(
    (trace: IOtelTrace | TNil, uiFindValue: string | TNil) => {
      dispatch(actions.setTrace(trace, uiFindValue));
      if (trace) zustandSetTrace(trace, uiFindValue);
    },
    [dispatch, zustandSetTrace]
  );

  const childrenToggle = useCallback(
    (spanID: string) => {
      dispatch(actions.childrenToggle(spanID));
      zustandChildrenToggle(spanID);
    },
    [dispatch, zustandChildrenToggle]
  );

  const detailToggle = useCallback(
    (spanID: string) => {
      dispatch(actions.detailToggle(spanID));
      zustandDetailToggle(spanID);
    },
    [dispatch, zustandDetailToggle]
  );

  const detailTagsToggle = useCallback(
    (spanID: string) => {
      dispatch(actions.detailTagsToggle(spanID));
      zustandDetailTagsToggle(spanID);
    },
    [dispatch, zustandDetailTagsToggle]
  );

  const detailProcessToggle = useCallback(
    (spanID: string) => {
      dispatch(actions.detailProcessToggle(spanID));
      zustandDetailProcessToggle(spanID);
    },
    [dispatch, zustandDetailProcessToggle]
  );

  const detailLogsToggle = useCallback(
    (spanID: string) => {
      dispatch(actions.detailLogsToggle(spanID));
      zustandDetailLogsToggle(spanID);
    },
    [dispatch, zustandDetailLogsToggle]
  );

  const detailLogItemToggle = useCallback(
    (spanID: string, logItem: IEvent) => {
      dispatch(actions.detailLogItemToggle(spanID, logItem));
      zustandDetailLogItemToggle(spanID, logItem);
    },
    [dispatch, zustandDetailLogItemToggle]
  );

  const detailWarningsToggle = useCallback(
    (spanID: string) => {
      dispatch(actions.detailWarningsToggle(spanID));
      zustandDetailWarningsToggle(spanID);
    },
    [dispatch, zustandDetailWarningsToggle]
  );

  const detailReferencesToggle = useCallback(
    (spanID: string) => {
      dispatch(actions.detailReferencesToggle(spanID));
      zustandDetailReferencesToggle(spanID);
    },
    [dispatch, zustandDetailReferencesToggle]
  );

  const clearShouldScrollToFirstUiFindMatch = useCallback(() => {
    dispatch(actions.clearShouldScrollToFirstUiFindMatch());
    zustandClearScroll();
  }, [dispatch, zustandClearScroll]);

  const focusUiFindMatches = useCallback(
    (trace: IOtelTrace, uiFindValue: string | TNil, allowHide?: boolean) => {
      dispatch(actions.focusUiFindMatches(trace, uiFindValue, allowHide));
      zustandFocusUiFindMatches(trace, uiFindValue, allowHide);
    },
    [dispatch, zustandFocusUiFindMatches]
  );

  // setSpanNameColumnWidth: the parent TraceTimelineViewer/index.tsx owns the nameColumnWidth prop;
  // this handler keeps Redux in sync (Zustand is updated by the parent via its own dual-write).
  const setSpanNameColumnWidth = useCallback(
    (width: number) => {
      dispatch(actions.setSpanNameColumnWidth(width));
    },
    [dispatch]
  );

  const combinedProps: VirtualizedTraceViewProps = {
    ...ownProps,
    hoverIndentGuideIds,
    uiFind,
    spanNameColumnWidth,
    sidePanelWidth,
    detailPanelMode,
    timelineBarsVisible,
    traceID,
    childrenHiddenIDs,
    detailStates,
    shouldScrollToFirstUiFindMatch,
    prunedServices,
    selectedSpanID,
    setTrace,
    childrenToggle,
    detailToggle,
    detailTagsToggle,
    detailProcessToggle,
    detailLogsToggle,
    detailLogItemToggle,
    detailWarningsToggle,
    detailReferencesToggle,
    clearShouldScrollToFirstUiFindMatch,
    focusUiFindMatches,
    setSpanNameColumnWidth,
  };

  return <VirtualizedTraceViewImpl {...combinedProps} />;
}

export default withRouteProps(
  VirtualizedTraceViewWrapper
) as React.ComponentType<TVirtualizedTraceViewOwnProps>;
