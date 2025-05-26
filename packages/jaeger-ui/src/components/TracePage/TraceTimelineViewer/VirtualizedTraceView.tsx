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
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import memoizeOne from 'memoize-one';
import { VariableSizeList as List } from 'react-window';

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
  spanContainsErredSpan,
  ViewedBoundsFunctionType,
} from './utils';
import { Accessors } from '../ScrollManager';
import { getViewHeight } from '../../../utils/config/get-config';
import { TNil, ReduxState } from '../../../types';
import { criticalPathSection, Span, Trace } from '../../../types/trace';

import './VirtualizedTraceView.css';

type RowState = {
  isDetail: boolean;
  span: Span;
  spanIndex: number;
};

type TVirtualizedTraceViewOwnProps = {
  currentViewRangeTime: [number, number];
  criticalPath: criticalPathSection[];
  findMatchesIDs: Set<string> | TNil;
  registerAccessors: (accesors: Accessors) => void;
  scrollToFirstVisibleSpan: () => void;
  trace: Trace;
  onRerootClicked?: (spanId: string) => void;
};

type TDispatchProps = {
  childrenToggle: (spanID: string) => void;
  clearShouldScrollToFirstUiFindMatch: () => void;
  detailLogItemToggle: (spanID: string, logItem: string) => void;
  detailLogsToggle: (spanID: string) => void;
  detailProcessToggle: (spanID: string) => void;
  detailReferencesToggle: (spanID: string) => void;
  detailTagsToggle: (spanID: string) => void;
  detailToggle: (spanID: string) => void;
  setSpanNameColumnWidth: (width: number) => void;
  setTrace: (trace: Trace | TNil, uiFind: string | TNil) => void;
};

type TVirtualizedTraceViewProps = TVirtualizedTraceViewOwnProps & TDispatchProps & TReduxProps;

type TReduxProps = {
  childrenHiddenIDs: Set<string>;
  detailStates: Map<string, DetailState>;
  findMatchesIDs: Set<string> | TNil;
  shouldScrollToFirstUiFindMatch: boolean;
  spanNameColumnWidth: number;
  uiFind: string | null | undefined;
};

type VirtualizedTraceViewState = {
  listHeight: number;
  rowStates: RowState[];
};

const NUM_TICKS = 5;

/**
 * `VirtualizedTraceView` now renders the header row because it is sensitive to
 * `props.spanNameColumnWidth`. If it renders in a separate component, it would
 * need to be hoisted and rerender the FilteredList.
 */
export class VirtualizedTraceViewImpl extends React.Component<
  TVirtualizedTraceViewProps,
  VirtualizedTraceViewState
> {
  listView: ListView | TNil;
  rowStatesCache: RowState[] | TNil;
  getViewedBounds: ViewedBoundsFunctionType;
  getViewedBoundsMemoized: (
    currentViewRangeTime: [number, number],
    duration: number
  ) => ViewedBoundsFunctionType;
  listElm: Element | TNil;
  windowedListRef: React.RefObject<List>;

  constructor(props: TVirtualizedTraceViewProps) {
    super(props);
    const { currentViewRangeTime, trace } = props;
    const { duration } = trace;
    this.listView = undefined;
    this.rowStatesCache = undefined;
    this.getViewedBoundsMemoized = memoizeOne(createViewedBoundsFunc, (prevArgs, nextArgs) => {
      return prevArgs[0][0] === nextArgs[0][0] && prevArgs[0][1] === nextArgs[0][1] && prevArgs[1] === nextArgs[1];
    });
    this.getViewedBounds = this.getViewedBoundsMemoized(currentViewRangeTime, duration);
    this.windowedListRef = React.createRef();

    this.state = {
      listHeight: 0,
      rowStates: this.getRowStates(props),
    };
  }

  componentDidMount() {
    this.updateListHeight();
    this.scrollToSpan(this.props);
    window.addEventListener('resize', this.updateListHeight);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateListHeight);
  }

  componentDidUpdate(prevProps: TVirtualizedTraceViewProps) {
    const {
      shouldScrollToFirstUiFindMatch,
      clearShouldScrollToFirstUiFindMatch,
      currentViewRangeTime,
      trace,
    } = this.props;
    if (this.listView && shouldScrollToFirstUiFindMatch) {
      this.listView.scrollToTopVisibleSpan();
      clearShouldScrollToFirstUiFindMatch();
    }
    if (prevProps.trace !== trace) {
      this.setRowStates();
    }
    if (
      prevProps.currentViewRangeTime !== currentViewRangeTime ||
      prevProps.trace.duration !== trace.duration
    ) {
      this.getViewedBounds = this.getViewedBoundsMemoized(currentViewRangeTime, trace.duration);
    }
  }

  getRowStates(props: TVirtualizedTraceViewProps): RowState[] {
    const { childrenHiddenIDs, detailStates, trace } = props;
    const rowStates = [];
    const spanMap = new Map();
    trace.spans.forEach((span, i) => {
      spanMap.set(span.spanID, span);
      // Add a row for the span
      rowStates.push({
        span,
        isDetail: false,
        spanIndex: i,
      });
      // Add a row for each span detail
      if (detailStates.has(span.spanID) && !childrenHiddenIDs.has(span.spanID)) {
        rowStates.push({
          span,
          isDetail: true,
          spanIndex: i,
        });
      }
    });
    this.rowStatesCache = rowStates;
    return rowStates;
  }

  setRowStates() {
    this.setState({ rowStates: this.getRowStates(this.props) });
  }

  updateListHeight = () => {
    if (this.listElm) {
      if (this.listElm.clientHeight !== this.state.listHeight) {
        this.setState({ listHeight: this.listElm.clientHeight });
      }
    }
  };

  scrollToSpan = (props: TVirtualizedTraceViewProps) => {
    const { scrollToFirstVisibleSpan, trace } = props;
    const spanMap = new Map();
    trace.spans.forEach(span => {
      spanMap.set(span.spanID, span);
    });
    scrollToFirstVisibleSpan();
  };

  setListView = (listView: ListView | TNil) => {
    const isChanged = this.listView !== listView;
    this.listView = listView;
    if (listView && isChanged) {
      this.props.registerAccessors(listView.getAccessors());
    }
  };

  getKeyFromIndex = (index: number) => {
    const { rowStates } = this.state;
    const rowState = rowStates[index];
    return `${rowState.span.spanID}--${rowState.isDetail ? 'detail' : 'bar'}`;
  };

  getIndexFromKey = (key: string) => {
    const { rowStates } = this.state;
    const parts = key.split('--');
    const spanID = parts[0];
    const isDetail = parts[1] === 'detail';
    return rowStates.findIndex(rowState => rowState.span.spanID === spanID && rowState.isDetail === isDetail);
  };

  getRowHeight = (index: number) => {
    const { rowStates } = this.state;
    const rowState = rowStates[index];
    if (rowState.isDetail) {
      return 150;
    }
    return 38;
  };

  renderRow = (key: string, style: React.CSSProperties, index: number, attrs: {}) => {
    const { rowStates } = this.state;
    const {
      childrenHiddenIDs,
      detailStates,
      findMatchesIDs,
      spanNameColumnWidth,
      trace,
      detailLogItemToggle,
      detailLogsToggle,
      detailProcessToggle,
      detailReferencesToggle,
      detailTagsToggle,
      detailToggle,
      childrenToggle,
      criticalPath,
      onRerootClicked,
    } = this.props;
    // Compute the list of spans that are rendered as collapsed into the parent
    const collapsedChildren = new Set(childrenHiddenIDs);
    const rowState = rowStates[index];
    const { span, isDetail, spanIndex } = rowState;
    const spanID = span.spanID;
    let hasChildren = false;
    let shown = false;
    trace.spans.forEach(sp => {
      if (sp.references && sp.references.some(ref => ref.spanID === spanID)) {
        hasChildren = true;
        if (!childrenHiddenIDs.has(spanID)) {
          shown = true;
        }
      }
    });
    const showChildrenIcon = hasChildren ? (shown ? 'up' : 'down') : null;
    const childrenVisible = hasChildren && shown;
    if (isDetail) {
      const detailState = detailStates.get(spanID);
      if (!detailState) {
        return null;
      }
      return (
        <div className="VirtualizedTraceView--row" key={key} style={style} {...attrs}>
          <SpanDetailRow
            detailState={detailState}
            onDetailLogItemToggle={detailLogItemToggle}
            onDetailLogsToggle={detailLogsToggle}
            onDetailProcessToggle={detailProcessToggle}
            onDetailReferencesToggle={detailReferencesToggle}
            onDetailTagsToggle={detailTagsToggle}
            span={span}
            tagsWidth={spanNameColumnWidth}
          />
        </div>
      );
    }
    const isCollapsed = childrenHiddenIDs.has(spanID);
    const isFilteredOut = Boolean(findMatchesIDs) && !findMatchesIDs.has(spanID);
    const isDetailExpanded = detailStates.has(spanID);
    const isMatchingFilter = Boolean(findMatchesIDs) && findMatchesIDs.has(spanID);
    const showErrorIcon = isErrorSpan(span) || (isCollapsed && spanContainsErredSpan(trace.spans, spanIndex));
    const criticalPathSection = criticalPath.find(section => section.spanId === spanID);
    const showRerootButton = Boolean(onRerootClicked) && span.depth > 0;

    // Check for a client span with rpc span children
    let rpcSpan: Span | undefined;
    if (isKindClient(span)) {
      const rpcSpanId = findServerChildSpan(trace.spans, spanIndex);
      if (rpcSpanId) {
        const rpcSpanIndex = trace.spans.findIndex(sp => sp.spanID === rpcSpanId);
        if (rpcSpanIndex > -1) {
          rpcSpan = trace.spans[rpcSpanIndex];
        }
      }
    }

    return (
      <div className="VirtualizedTraceView--row" key={key} style={style} {...attrs}>
        <SpanBarRow
          className={isFilteredOut ? 'is-filtered-out' : undefined}
          childrenVisible={childrenVisible}
          criticalPath={criticalPathSection ? [criticalPathSection] : []}
          getViewedBounds={this.getViewedBounds}
          isChildrenExpanded={childrenVisible}
          isDetailExpanded={isDetailExpanded}
          isMatchingFilter={isMatchingFilter}
          numTicks={NUM_TICKS}
          onChildrenToggled={() => childrenToggle(spanID)}
          onDetailToggled={() => detailToggle(spanID)}
          onRerootClicked={showRerootButton ? onRerootClicked : undefined}
          rpc={rpcSpan}
          showChildrenIcon={showChildrenIcon}
          showErrorIcon={showErrorIcon}
          span={span}
          spanID={spanID}
          traceStartTime={trace.startTime}
        />
      </div>
    );
  };

  setListElm = (elm: Element | TNil) => {
    this.listElm = elm;
    this.updateListHeight();
  };

  render() {
    const { rowStates, listHeight } = this.state;
    const { spanNameColumnWidth } = this.props;
    return (
      <div
        className="VirtualizedTraceView--listWrapper"
        ref={this.setListElm as React.RefCallback<HTMLDivElement>}
      >
        {listHeight > 0 && (
          <ListView
            ref={this.setListView}
            dataLength={rowStates.length}
            itemHeightGetter={this.getRowHeight}
            itemRenderer={this.renderRow}
            viewBuffer={50}
            viewBufferMin={50}
            itemsWrapperClassName="VirtualizedTraceView--rowsWrapper"
            getKeyFromIndex={this.getKeyFromIndex}
            getIndexFromKey={this.getIndexFromKey}
            windowedListRef={this.windowedListRef}
            height={listHeight}
            width="100%"
          />
        )}
      </div>
    );
  }
}

// export for tests
export const mapStateToProps = (state: ReduxState): TReduxProps => {
  const { childrenHiddenIDs, detailStates, findMatchesIDs, shouldScrollToFirstUiFindMatch, spanNameColumnWidth } =
    state.traceTimeline;
  return {
    childrenHiddenIDs,
    detailStates,
    findMatchesIDs,
    shouldScrollToFirstUiFindMatch,
    spanNameColumnWidth,
    uiFind: state.router.location.search.indexOf('uiFind=') > -1 ? state.router.location.search : undefined,
  };
};

// export for tests
export const mapDispatchToProps = (dispatch: Dispatch<ReduxState>): TDispatchProps => {
  const {
    childrenToggle,
    clearShouldScrollToFirstUiFindMatch,
    detailLogItemToggle,
    detailLogsToggle,
    detailProcessToggle,
    detailReferencesToggle,
    detailTagsToggle,
    detailToggle,
    setSpanNameColumnWidth,
    setTrace,
  } = bindActionCreators(actions, dispatch);
  return {
    childrenToggle,
    clearShouldScrollToFirstUiFindMatch,
    detailLogItemToggle,
    detailLogsToggle,
    detailProcessToggle,
    detailReferencesToggle,
    detailTagsToggle,
    detailToggle,
    setSpanNameColumnWidth,
    setTrace,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(VirtualizedTraceViewImpl);