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
import { Button, Divider, Tooltip } from 'antd';
import { IoArrowUndoOutline } from 'react-icons/io5';

import TracePageSearchBar from './TracePageSearchBar';
import { TUpdateViewRangeTimeFunction, IViewRange, ViewRangeTimeUpdate, ETraceViewType } from '../types';
import LabeledList from '../../common/LabeledList';
import NewWindowIcon from '../../common/NewWindowIcon';
import TraceName from '../../common/TraceName';
import { getTraceLinks } from '../../../model/link-patterns';
import { Trace } from '../../../types/trace';
import { TNil } from '../../../types';
import { TraceRepresentation } from '../../../types/config';
import { getTraceSpanIdsAsTree } from '../../../selectors/trace';
import AltViewOptions from './AltViewOptions';
import TraceRepresentationSelector from './TraceRepresentationSelector';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import SpanGraph from './SpanGraph';
import TracePageHeader from './TracePageHeader';

import './index.css';

type TracePageHeaderEmbedProps = {
  canCollapse: boolean;
  clearSearch: () => void;
  focusUiFindMatches: () => void;
  hideMap: boolean;
  hideSummary: boolean;
  linkToStandalone: string;
  nextResult: () => void;
  onSlimViewClicked: () => void;
  prevResult: () => void;
  resultCount: number;
  showArchiveButton: boolean;
  showShortcutsHelp: boolean;
  showStandaloneLink: boolean;
  showViewOptions: boolean;
  slimView: boolean;
  textFilter: string | TNil;
  toSearch: string | null;
  trace: Trace;
  updateNextViewRangeTime: (update: ViewRangeTimeUpdate) => void;
  updateViewRangeTime: TUpdateViewRangeTimeFunction;
  viewRange: IViewRange;
  viewType: ETraceViewType;
  disableJsonView: boolean;
  onTraceViewChange: (viewType: ETraceViewType) => void;
  onTraceRepresentationChange: (representation: TraceRepresentation) => void;
  currentRepresentation: string;
  onArchiveClicked?: () => void;
  isSubtrace?: boolean;
  onResetRootTrace?: () => void;
};

export default function TracePageHeaderFn(props: TracePageHeaderEmbedProps & { ref?: React.Ref<any> }) {
  const {
    canCollapse,
    clearSearch,
    currentRepresentation,
    disableJsonView,
    focusUiFindMatches,
    hideMap,
    hideSummary,
    linkToStandalone,
    nextResult,
    onArchiveClicked,
    onSlimViewClicked,
    onTraceRepresentationChange,
    onTraceViewChange,
    prevResult,
    ref,
    resultCount,
    showArchiveButton,
    showShortcutsHelp,
    showStandaloneLink,
    showViewOptions,
    slimView,
    textFilter,
    toSearch,
    trace,
    updateNextViewRangeTime,
    updateViewRangeTime,
    viewRange,
    viewType,
    isSubtrace,
    onResetRootTrace,
  } = props;

  const tree = getTraceSpanIdsAsTree(trace);
  const summaryItems = [
    {
      key: 'start',
      label: 'Trace Start:',
      value: trace.startTime,
    },
    {
      key: 'duration',
      label: 'Duration:',
      value: trace.duration,
    },
    {
      key: 'svc-count',
      label: 'Services:',
      value: trace.services ? trace.services.length : 0,
    },
    {
      key: 'depth',
      label: 'Depth:',
      value: tree.depth - 1,
    },
    {
      key: 'span-count',
      label: 'Total Spans:',
      value: trace.spans.length,
    },
  ];

  const links = getTraceLinks(trace);

  return (
    <TracePageHeader
      canCollapse={canCollapse}
      clearSearch={clearSearch}
      focusUiFindMatches={focusUiFindMatches}
      hideSummary={hideSummary}
      nextResult={nextResult}
      onSlimViewClicked={onSlimViewClicked}
      prevResult={prevResult}
      ref={ref}
      resultCount={resultCount}
      slimView={slimView}
      textFilter={textFilter}
      traceID={trace.traceID}
      traceName={<TraceName traceName={trace.traceName} />\u00A0}
      viewType={viewType}
    >
      {!hideSummary && (
        <LabeledList
          className="TracePageHeader--overviewItems"
          items={summaryItems}
        />
      )}
      {links && links.length > 0 && (
        <div>
          <h3 className="TracePageHeader--overviewItemsHeader">Related Traces</h3>
          <div className="TracePageHeader--overviewItemsWrapper">
            {links.map(({ url, text }, i) => (
              <a
                className="TracePageHeader--overviewLink"
                href={url}
                key={i}
                rel="noopener noreferrer"
                target="_blank"
              >
                {text}
                <NewWindowIcon />
              </a>
            ))}
          </div>
        </div>
      )}
      {showArchiveButton && onArchiveClicked && (
        <Button className="TracePageHeader--archiveButton" onClick={onArchiveClicked}>
          Archive Trace
        </Button>
      )}
      {showStandaloneLink && (
        <Button className="TracePageHeader--standaloneLink" href={linkToStandalone} target="_blank">
          <NewWindowIcon />
        </Button>
      )}
      {isSubtrace && onResetRootTrace && (
        <Tooltip title="Return to full trace view">
          <Button 
            className="TracePageHeader--resetRootButton" 
            onClick={onResetRootTrace}
            icon={<IoArrowUndoOutline />}
          >
            Reset Root
          </Button>
        </Tooltip>
      )}
      {showShortcutsHelp && <KeyboardShortcutsHelp className="TracePageHeader--shortcutsHelp" />}
      {showViewOptions && (
        <div className="TracePageHeader--viewOptionsWrapper">
          {viewType === ETraceViewType.TraceTimelineViewer && (
            <TraceRepresentationSelector
              onChange={onTraceRepresentationChange}
              currentRepresentation={currentRepresentation}
            />
          )}
          <Divider type="vertical" />
          <AltViewOptions
            disableJsonView={disableJsonView}
            onTraceViewChange={onTraceViewChange}
            viewType={viewType}
          />
        </div>
      )}
      {!hideMap && !slimView && (
        <SpanGraph
          trace={trace}
          viewRange={viewRange}
          updateNextViewRangeTime={updateNextViewRangeTime}
          updateViewRangeTime={updateViewRangeTime}
        />
      )}
      {!slimView && (
        <TracePageSearchBar
          clearSearch={clearSearch}
          focusUiFindMatches={focusUiFindMatches}
          nextResult={nextResult}
          prevResult={prevResult}
          resultCount={resultCount}
          textFilter={textFilter}
          toSearch={toSearch}
        />
      )}
    </TracePageHeader>
  );
}